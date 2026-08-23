import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Teacher } from "../teachers/entities/teacher.entity";
import { Lesson } from "../lesson-plans/entities/lesson.entity";
import { PackagePurchase } from "./entities/package-purchase.entity";
import { BillingService } from "./billing.service";
import { BALANCE_MONTHS, LessonPackage } from "./packages";

/**
 * Доступ к генерации у B2C-учителя (ТЗ №3). Порядок проверки:
 *   1) активная подписка (легаси/админский грант) — безлимит, ничего не списывается;
 *   2) урок уже списал комплект (trialCounted/paidCounted) — материалы
 *      оплаченного комплекта доступны всегда, и после сгорания баланса;
 *   3) бесплатный доступ: списано триальных меньше лимита;
 *   4) платный баланс пакетов: уроки есть и срок не истёк.
 *
 * Списание — chargeLessonStart, вызывается из startGeneration. Черновики
 * лимит не тратят.
 */

/**
 * Лимит бесплатного доступа (оферта, п. 4.1). Из env TRIAL_LESSONS — менять
 * без деплоя (правка .env + pm2 restart) для экспериментов с конверсией.
 */
export function trialLessonLimit(): number {
  const n = Number(process.env.TRIAL_LESSONS);
  return Number.isInteger(n) && n >= 0 ? n : 5;
}

/**
 * SubscriptionGuard висит не только на маршрутах уроков (ещё generators, kmzh,
 * materials), поэтому параметр :id может оказаться чем угодно. Запрос
 * `where: { id }` по uuid-колонке с не-uuid значением роняет Postgres ошибкой
 * 22P02, а не возвращает пустой результат — отсюда проверка формата.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ChargeSource = "none" | "trial" | "paid";

export interface BalanceSummary {
  trialUsed: number;
  trialLeft: number;
  trialLimit: number;
  paidBalance: number;
  expiresAt: Date | null;
  total: number;
  subscriptionActive: boolean;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly billingService: BillingService,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Lesson)
    private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(PackagePurchase)
    private readonly purchaseRepo: Repository<PackagePurchase>,
  ) {}

  /** Оплаченная подписка, действующая прямо сейчас (легаси/грант) — безлимит. */
  private async hasActiveSubscription(teacherId: string): Promise<boolean> {
    const now = new Date();
    const subscription = await this.billingService.getSubscription(teacherId);
    if (!subscription) return false;
    return (
      subscription.status === "active" &&
      subscription.currentPeriodEnd != null &&
      subscription.currentPeriodEnd > now
    );
  }

  /** Сколько комплектов бесплатного доступа уже израсходовано. */
  async trialLessonsUsed(teacherId: string): Promise<number> {
    return this.lessonRepo.count({
      where: { userId: teacherId, trialCounted: true },
    });
  }

  /** Сколько бесплатных комплектов осталось (0, если лимит исчерпан). */
  async trialLessonsLeft(teacherId: string): Promise<number> {
    const used = await this.trialLessonsUsed(teacherId);
    return Math.max(0, trialLessonLimit() - used);
  }

  private paidBalanceActive(teacher: Teacher, now = new Date()): boolean {
    return (
      (teacher.paidLessonsBalance ?? 0) > 0 &&
      !!teacher.balanceExpiresAt &&
      teacher.balanceExpiresAt > now
    );
  }

  /** Сводка для GET /billing/balance и баннеров фронта. */
  async balanceSummary(teacherId: string): Promise<BalanceSummary> {
    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    const trialUsed = await this.trialLessonsUsed(teacherId);
    const limit = trialLessonLimit();
    const trialLeft = Math.max(0, limit - trialUsed);
    const now = new Date();
    const expired = !!teacher?.balanceExpiresAt && teacher.balanceExpiresAt <= now;
    const paidBalance = expired ? 0 : teacher?.paidLessonsBalance ?? 0;
    return {
      trialUsed,
      trialLeft,
      trialLimit: limit,
      paidBalance,
      expiresAt: paidBalance > 0 ? teacher?.balanceExpiresAt ?? null : null,
      total: trialLeft + paidBalance,
      subscriptionActive: await this.hasActiveSubscription(teacherId),
    };
  }

  /**
   * Проверка доступа БЕЗ списания — для SubscriptionGuard. `lessonId` — урок
   * из маршрута: операции над уже списанным уроком разрешены всегда.
   */
  async checkSubscriptionAccess(
    teacherId: string,
    lessonId?: string | null,
  ): Promise<boolean> {
    if (await this.hasActiveSubscription(teacherId)) return true;

    if (lessonId && UUID_RE.test(lessonId)) {
      const counted = await this.lessonRepo.count({
        where: [
          { id: lessonId, userId: teacherId, trialCounted: true },
          { id: lessonId, userId: teacherId, paidCounted: true },
        ],
      });
      if (counted > 0) return true;
    }

    if ((await this.trialLessonsUsed(teacherId)) < trialLessonLimit()) return true;

    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    return !!teacher && this.paidBalanceActive(teacher);
  }

  /** Текст отказа — различает «не покупал» и «срок истёк» (ТЗ №3, п. 3.4). */
  async denialMessage(teacherId: string): Promise<string> {
    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    if (
      teacher &&
      (teacher.paidLessonsBalance ?? 0) > 0 &&
      teacher.balanceExpiresAt &&
      teacher.balanceExpiresAt <= new Date()
    ) {
      const d = teacher.balanceExpiresAt;
      const dd = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
      return `Срок пакета истёк ${dd}. Любая покупка на aqyl-service.kz вернёт уроки на 3 месяца`;
    }
    return "Уроки закончились. Выберите пакет на aqyl-service.kz";
  }

  /**
   * Списание комплекта при запуске генерации (ТЗ №3, п. 3.2). Идемпотентно:
   * уже списанный урок повторно не списывается. Платный урок снимается одним
   * UPDATE с условием на баланс и срок — гонка двух параллельных генераций не
   * уводит баланс в минус. Возвращает источник списания.
   */
  async chargeLessonStart(teacherId: string, lessonId: string): Promise<ChargeSource> {
    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    // B2G и не-B2C — вне пакетов: доступ им даёт школа, ничего не списываем.
    if (!teacher || teacher.registrationSource !== "b2c") return "none";

    if (await this.hasActiveSubscription(teacherId)) return "none";

    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId, userId: teacherId } });
    if (!lesson) throw new ForbiddenException("Урок не найден");
    if (lesson.trialCounted) return "trial";
    if (lesson.paidCounted) return "paid";

    // Триал первым: подарок дожигается раньше, платный баланс не тает.
    if ((await this.trialLessonsUsed(teacherId)) < trialLessonLimit()) {
      await this.lessonRepo.update({ id: lessonId, userId: teacherId }, { trialCounted: true });
      return "trial";
    }

    const res = await this.teacherRepo
      .createQueryBuilder()
      .update(Teacher)
      .set({ paidLessonsBalance: () => `"paidLessonsBalance" - 1` })
      .where(`id = :id AND "paidLessonsBalance" > 0 AND "balanceExpiresAt" > now()`, { id: teacherId })
      .execute();

    if (!res.affected) {
      throw new ForbiddenException(await this.denialMessage(teacherId));
    }
    await this.lessonRepo.update({ id: lessonId, userId: teacherId }, { paidCounted: true });
    return "paid";
  }

  /**
   * Начисление пакета (ТЗ №3, пп. 2.1, 4): баланс += уроки, срок ВСЕГО баланса
   * = сейчас + 3 месяца, запись в журнал. Используется вебхуком Kaspi и
   * админкой (packageCode 'admin', priceKzt 0).
   */
  async creditPackage(
    teacherId: string,
    pkg: Pick<LessonPackage, "code" | "lessons" | "priceKzt">,
    paymentId?: string | null,
  ): Promise<{ balance: number; expiresAt: Date }> {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + BALANCE_MONTHS);

    await this.teacherRepo
      .createQueryBuilder()
      .update(Teacher)
      .set({
        paidLessonsBalance: () => `"paidLessonsBalance" + ${Math.floor(pkg.lessons)}`,
        balanceExpiresAt: expiresAt,
      })
      .where("id = :id", { id: teacherId })
      .execute();

    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    const balance = teacher?.paidLessonsBalance ?? pkg.lessons;

    await this.purchaseRepo.save(
      this.purchaseRepo.create({
        teacherId,
        packageCode: pkg.code,
        lessons: pkg.lessons,
        priceKzt: pkg.priceKzt,
        paymentId: paymentId ?? null,
        balanceAfter: balance,
        expiresAtAfter: expiresAt,
      }),
    );
    this.logger.log(
      `Пакет ${pkg.code} (+${pkg.lessons}) учителю ${teacherId}: баланс ${balance}, срок до ${expiresAt.toISOString().slice(0, 10)}`,
    );
    return { balance, expiresAt };
  }
}
