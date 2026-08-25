import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Teacher } from "../teachers/entities/teacher.entity";
import { Payment } from "./entities/payment.entity";
import { Subscription } from "./entities/subscription.entity";
import { PackagePurchase } from "./entities/package-purchase.entity";
import { KaspiService } from "./kaspi.service";
import { MailService } from "../mail/mail.service";
import { BALANCE_MONTHS, findPackage } from "./packages";

const PRICE_PER_MONTH = 5990; // тенге
const DAY_MS = 24 * 60 * 60 * 1000;

// Скидки за длительные периоды (совпадают с тарифами на /dashboard/b2c/subscribe).
const DISCOUNT_BY_MONTHS: Record<number, number> = {
  1: 0,
  3: 0.1,
  6: 0.15,
  12: 0.2,
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(PackagePurchase)
    private readonly purchaseRepo: Repository<PackagePurchase>,
    private readonly kaspiService: KaspiService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  /** Итоговая сумма в тенге с учётом скидки за период. */
  private computeAmount(months: number): number {
    const discount = DISCOUNT_BY_MONTHS[months] ?? 0;
    return Math.round(PRICE_PER_MONTH * months * (1 - discount));
  }

  private get frontendUrl(): string {
    // FRONTEND_URL может быть списком origin'ов через запятую — берём первый.
    return (this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000")
      .split(",")[0]
      .trim();
  }

  async createPaymentSession(teacherId: string, months = 1) {
    const amount = this.computeAmount(months);
    const orderId = this.kaspiService.generateOrderId();

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        teacherId,
        provider: "kaspi",
        orderId,
        amount,
        currency: "KZT",
        status: "pending",
        // months храним в metadata, чтобы корректно продлить подписку в webhook.
        metadata: { months },
      }),
    );

    const paymentUrl = this.kaspiService.buildPaymentUrl({
      orderId,
      amount,
      description: `Подписка Aqyl на ${months} мес.`,
      returnUrl: `${this.frontendUrl}/dashboard/b2c?payment=success`,
      failUrl: `${this.frontendUrl}/dashboard/b2c?payment=failed`,
    });

    this.logger.log(
      `Created payment session ${orderId} for teacher ${teacherId} (${amount} KZT, ${months}m), paymentId=${payment.id}`,
    );

    return { orderId, paymentUrl, amount };
  }

  /**
   * Платёжная сессия за ПАКЕТ уроков (ТЗ №3, п. 4). Цена и число уроков — из
   * серверного каталога, и снимком кладутся в metadata платежа: начисление в
   * вебхуке идёт по снимку, чтобы смена каталога между сессией и оплатой не
   * меняла уже проданное.
   */
  async createPackageSession(teacherId: string, packageCode: string) {
    const pkg = findPackage(packageCode);
    if (!pkg) {
      throw new BadRequestException(`Неизвестный пакет: ${packageCode}`);
    }
    const orderId = this.kaspiService.generateOrderId();

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        teacherId,
        provider: "kaspi",
        orderId,
        amount: pkg.priceKzt,
        currency: "KZT",
        status: "pending",
        metadata: { packageCode: pkg.code, lessons: pkg.lessons },
      }),
    );

    // Kaspi не подключает API-интеграцию при нашем обороте (порог 30 млн ₸/мес),
    // поэтому оплата идёт по статической ссылке, а сервер о ней не узнаёт:
    // вебхука нет. Учитель платит и указывает номер заказа, администратор
    // подтверждает поступление в админке — начисление делает confirmPayment.
    // Когда подключим эквайер с API, вернём автоматический путь: запись
    // платежа и начисление уже общие для обоих сценариев.
    const payLink = this.config.get<string>('KASPI_PAY_LINK') ?? '';
    const paymentUrl = payLink
      ? payLink
      : this.kaspiService.buildPaymentUrl({
          orderId,
          amount: pkg.priceKzt,
          description: `Aqyl: пакет ${pkg.lessons} уроков`,
          returnUrl: `${this.frontendUrl}/dashboard/b2c?payment=success`,
          failUrl: `${this.frontendUrl}/dashboard/b2c?payment=failed`,
        });

    this.logger.log(
      `Package session ${orderId}: ${pkg.code} (+${pkg.lessons}) for teacher ${teacherId}, ${pkg.priceKzt} KZT, paymentId=${payment.id}`,
    );
    return {
      orderId, paymentUrl, amount: pkg.priceKzt,
      lessons: pkg.lessons,
      /** true — оплата по ссылке, начисление после подтверждения администратором. */
      manual: !!payLink,
    };
  }

  /** Платежи, ожидающие подтверждения (ручная схема) — для админки. */
  async pendingPayments() {
    const rows = await this.paymentRepo.find({
      where: { status: 'pending' },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const ids = [...new Set(rows.map((p) => p.teacherId))];
    const teachers = ids.length
      ? await this.teacherRepo.find({ where: { id: In(ids) } })
      : [];
    const byId = new Map(teachers.map((t) => [t.id, t]));
    return rows.map((p) => {
      const meta = (p.metadata ?? {}) as { packageCode?: string; lessons?: number };
      const t = byId.get(p.teacherId);
      return {
        id: p.id, orderId: p.orderId, amount: p.amount, createdAt: p.createdAt,
        packageCode: meta.packageCode ?? null, lessons: Number(meta.lessons) || 0,
        teacherId: p.teacherId,
        email: t?.email ?? null, fullName: t?.fullName ?? null,
      };
    });
  }

  /**
   * Подтверждение оплаты администратором (ручная схема): помечаем платёж
   * оплаченным и начисляем пакет. Идемпотентно — повторное подтверждение
   * уже оплаченного заказа ничего не начисляет второй раз.
   */
  async confirmPayment(paymentId: string, actorId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new BadRequestException('Платёж не найден');
    if (payment.status === 'paid') {
      return { ok: true, alreadyPaid: true };
    }
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.metadata = { ...(payment.metadata ?? {}), confirmedBy: actorId };
    await this.paymentRepo.save(payment);
    await this.settlePackagePayment(payment);
    this.logger.log(`Платёж ${payment.orderId} подтверждён вручную (админ ${actorId})`);
    return { ok: true, alreadyPaid: false };
  }

  /** Отклонение заявки: платёж не поступил. Уроки не начисляются. */
  async rejectPayment(paymentId: string, actorId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new BadRequestException('Платёж не найден');
    if (payment.status === 'paid') {
      throw new BadRequestException('Платёж уже оплачен — отклонить нельзя');
    }
    payment.status = 'failed';
    payment.metadata = { ...(payment.metadata ?? {}), rejectedBy: actorId };
    await this.paymentRepo.save(payment);
    this.logger.log(`Платёж ${payment.orderId} отклонён (админ ${actorId})`);
    return { ok: true };
  }

  /**
   * Начисление пакета (ТЗ №3, пп. 2.1–2.2): баланс += уроки, срок ВСЕГО
   * баланса = сейчас + 3 месяца (перенос остатка — сам собой), запись в
   * журнал. Вызывается вебхуком и админкой (code 'admin', priceKzt 0).
   */
  async creditPackage(
    teacherId: string,
    pkg: { code: string; lessons: number; priceKzt: number },
    paymentId?: string | null,
  ): Promise<{ balance: number; expiresAt: Date }> {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + BALANCE_MONTHS);
    const add = Math.max(0, Math.floor(pkg.lessons));

    await this.teacherRepo
      .createQueryBuilder()
      .update(Teacher)
      .set({
        paidLessonsBalance: () => `"paidLessonsBalance" + ${add}`,
        balanceExpiresAt: expiresAt,
      })
      .where("id = :id", { id: teacherId })
      .execute();

    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    const balance = teacher?.paidLessonsBalance ?? add;

    await this.purchaseRepo.save(
      this.purchaseRepo.create({
        teacherId,
        packageCode: pkg.code,
        lessons: add,
        priceKzt: pkg.priceKzt,
        paymentId: paymentId ?? null,
        balanceAfter: balance,
        expiresAtAfter: expiresAt,
      }),
    );
    this.logger.log(
      `Пакет ${pkg.code} (+${add}) учителю ${teacherId}: баланс ${balance}, срок до ${expiresAt.toISOString().slice(0, 10)}`,
    );
    return { balance, expiresAt };
  }

  /** Оплаченный пакет: начислить и отправить квитанцию. */
  private async settlePackagePayment(payment: Payment): Promise<void> {
    const meta = (payment.metadata ?? {}) as { packageCode?: string; lessons?: number };
    // Начисляем по СНИМКУ из платежа; каталог — только фолбэк для lessons.
    const lessons = Number(meta.lessons) || findPackage(String(meta.packageCode))?.lessons || 0;
    if (!lessons) {
      this.logger.error(`Оплаченный пакет ${payment.orderId}: в metadata нет lessons — начислять нечего`);
      return;
    }
    const { balance, expiresAt } = await this.creditPackage(
      payment.teacherId,
      { code: String(meta.packageCode ?? "unknown"), lessons, priceKzt: payment.amount },
      payment.id,
    );

    const teacher = await this.teacherRepo.findOne({ where: { id: payment.teacherId } });
    if (teacher?.email) {
      // Не в await: сбой почты не должен превращать успешную оплату в ошибку.
      void this.mail.sendPackageReceipt({
        email: teacher.email,
        amount: payment.amount,
        lessons,
        balance,
        orderId: payment.orderId ?? payment.id,
        expiresAt,
      });
    }
  }

  async handleWebhook(payload: Record<string, unknown>) {
    const parsed = this.kaspiService.parseWebhookPayload(payload);

    const payment = await this.paymentRepo.findOne({
      where: { orderId: parsed.orderId },
    });
    if (!payment) {
      this.logger.warn(
        `Webhook for unknown orderId=${parsed.orderId} — ignoring`,
      );
      return { received: true };
    }

    // Идемпотентность: повторный webhook по уже оплаченному заказу не дублирует подписку.
    if (payment.status === "paid") {
      this.logger.log(
        `Webhook for already-paid orderId=${parsed.orderId} — skipping`,
      );
      return { received: true };
    }

    if (parsed.status === "paid") {
      payment.status = "paid";
      payment.externalId = parsed.externalId;
      payment.paidAt = new Date();
      payment.metadata = { ...(payment.metadata ?? {}), webhook: payload };
      await this.paymentRepo.save(payment);
      // Пакет уроков и легаси-подписка различаются по метаданным платежа:
      // запоздалый вебхук старой сессии с months обрабатывается как раньше.
      if ((payment.metadata as { packageCode?: string }).packageCode) {
        await this.settlePackagePayment(payment);
        this.logger.log(
          `Payment ${parsed.orderId} marked paid; package credited to teacher ${payment.teacherId}`,
        );
      } else {
        await this.activateSubscription(payment.teacherId, payment.id);
        this.logger.log(
          `Payment ${parsed.orderId} marked paid; subscription activated for teacher ${payment.teacherId}`,
        );
      }
    } else {
      payment.status = "failed";
      payment.metadata = { ...(payment.metadata ?? {}), webhook: payload };
      await this.paymentRepo.save(payment);
      this.logger.warn(`Payment ${parsed.orderId} marked failed`);
    }

    return { received: true };
  }

  async activateSubscription(teacherId: string, paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    const months = Number((payment?.metadata as { months?: number })?.months) || 1;
    const extensionMs = months * 30 * DAY_MS;

    let subscription = await this.subRepo.findOne({ where: { teacherId } });
    if (!subscription) {
      subscription = this.subRepo.create({
        teacherId,
        pricePerMonth: PRICE_PER_MONTH,
      });
    }

    const now = new Date();
    const stillActive =
      subscription.status === "active" &&
      subscription.currentPeriodEnd != null &&
      subscription.currentPeriodEnd > now;

    if (stillActive && subscription.currentPeriodEnd) {
      // Продлеваем от текущей даты окончания.
      subscription.currentPeriodEnd = new Date(
        subscription.currentPeriodEnd.getTime() + extensionMs,
      );
    } else {
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = new Date(now.getTime() + extensionMs);
    }
    subscription.status = "active";

    const saved = await this.subRepo.save(subscription);

    if (payment && !payment.subscriptionId) {
      payment.subscriptionId = saved.id;
      await this.paymentRepo.save(payment);
    }

    await this.teacherRepo.update(teacherId, { subscriptionStatus: "active" });

    // Квитанция — обязательство раздела 3.2. Не в await: подписка уже активна,
    // и сбой почты не должен превращать успешную оплату в ошибку.
    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    if (teacher?.email && payment && saved.currentPeriodEnd) {
      void this.mail.sendPaymentReceipt({
        email: teacher.email,
        amount: payment.amount,
        months,
        orderId: payment.orderId ?? payment.id,
        periodEnd: saved.currentPeriodEnd,
      });
    }

    return saved;
  }

  async getSubscription(teacherId: string) {
    const subscription = await this.subRepo.findOne({ where: { teacherId } });
    if (!subscription) return null;

    // Ленивое истечение: помечаем expired при первом обращении после окончания периода.
    if (
      subscription.status === "active" &&
      subscription.currentPeriodEnd != null &&
      subscription.currentPeriodEnd < new Date()
    ) {
      subscription.status = "expired";
      await this.subRepo.save(subscription);
      await this.teacherRepo.update(teacherId, {
        subscriptionStatus: "expired",
      });
    }

    return subscription;
  }

  /**
   * Сгорание баланса пакетов (ТЗ №3, п. 7): срок истёк — баланс в 0.
   * Запускается кроном раз в сутки. Списанные уроки не трогаются: их
   * материалы остаются доступны всегда.
   */
  async expireBalances(): Promise<{ expired: number }> {
    // Сколько именно сгорело — восстановимо из журнала покупок и списаний;
    // здесь фиксируем факт по каждому учителю.
    const rows: { id: string }[] = await this.teacherRepo.query(
      `UPDATE "teacher"
       SET "paidLessonsBalance" = 0
       WHERE "paidLessonsBalance" > 0 AND "balanceExpiresAt" < now()
       RETURNING id`,
    );
    for (const r of rows) {
      this.logger.warn(`Баланс пакетов учителя ${r.id} сгорел по сроку`);
    }
    return { expired: rows.length };
  }

  /**
   * Письмо за N дней до сгорания баланса (ТЗ №3, п. 7) — удержание: «любая
   * покупка продлит уроки». Окно ровно в одни сутки, как и у напоминаний о
   * подписке: крон суточный, каждый учитель попадает в окно единожды.
   */
  async sendBalanceExpiryReminders(daysBefore = 7): Promise<{ sent: number }> {
    const now = new Date();
    const from = new Date(now.getTime() + daysBefore * DAY_MS);
    const to = new Date(from.getTime() + DAY_MS);
    const teachers: { id: string; email: string; balance: number; expires: Date }[] =
      await this.teacherRepo.query(
        `SELECT id, email, "paidLessonsBalance" AS balance, "balanceExpiresAt" AS expires
         FROM "teacher"
         WHERE "paidLessonsBalance" > 0 AND "balanceExpiresAt" >= $1 AND "balanceExpiresAt" < $2`,
        [from, to],
      );
    let sent = 0;
    for (const tch of teachers) {
      try {
        await this.mail.sendBalanceExpiryReminder({
          email: tch.email,
          balance: Number(tch.balance),
          expiresAt: new Date(tch.expires),
        });
        sent++;
      } catch (err) {
        this.logger.error(`Напоминание о сгорании ${tch.id}: ${(err as Error).message}`);
      }
    }
    return { sent };
  }

  /**
   * Напоминания об окончании подписки за 3 дня. Вызывается по расписанию.
   *
   * Окно ровно в одни сутки, а не «осталось меньше трёх дней»: иначе письмо
   * уходило бы каждый день до самого окончания. Задание запускается раз в
   * сутки, поэтому каждая подписка попадает в окно единожды.
   */
  async sendExpiryReminders(daysBefore = 3): Promise<{ sent: number }> {
    const now = new Date();
    const from = new Date(now.getTime() + daysBefore * DAY_MS);
    const to = new Date(from.getTime() + DAY_MS);

    const due = await this.subRepo
      .createQueryBuilder("s")
      .where("s.status = :st", { st: "active" })
      .andWhere("s.currentPeriodEnd >= :from AND s.currentPeriodEnd < :to", { from, to })
      .getMany();

    let sent = 0;
    for (const sub of due) {
      const teacher = await this.teacherRepo.findOne({ where: { id: sub.teacherId } });
      if (!teacher?.email || !sub.currentPeriodEnd) continue;
      await this.mail.sendSubscriptionExpiring(teacher.email, sub.currentPeriodEnd, daysBefore);
      sent += 1;
    }
    if (sent > 0) this.logger.log(`Expiry reminders sent: ${sent}`);
    return { sent };
  }

  getPaymentHistory(teacherId: string) {
    return this.paymentRepo.find({
      where: { teacherId, status: "paid" },
      order: { createdAt: "DESC" },
    });
  }
}
