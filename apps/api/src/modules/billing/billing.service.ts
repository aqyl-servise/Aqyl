import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Teacher } from "../teachers/entities/teacher.entity";
import { Payment } from "./entities/payment.entity";
import { Subscription } from "./entities/subscription.entity";
import { KaspiService } from "./kaspi.service";

const PRICE_PER_MONTH = 4000; // тенге
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
    private readonly kaspiService: KaspiService,
    private readonly config: ConfigService,
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
      await this.activateSubscription(payment.teacherId, payment.id);
      this.logger.log(
        `Payment ${parsed.orderId} marked paid; subscription activated for teacher ${payment.teacherId}`,
      );
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

  getPaymentHistory(teacherId: string) {
    return this.paymentRepo.find({
      where: { teacherId, status: "paid" },
      order: { createdAt: "DESC" },
    });
  }
}
