import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Teacher } from "../teachers/entities/teacher.entity";
import { BillingService } from "./billing.service";

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly billingService: BillingService,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
  ) {}

  /**
   * Есть ли у B2C-учителя действующий доступ (триал или оплаченная подписка).
   * Используется SubscriptionGuard на AI-эндпоинтах.
   */
  async checkSubscriptionAccess(teacherId: string): Promise<boolean> {
    const now = new Date();
    const subscription = await this.billingService.getSubscription(teacherId);

    if (!subscription) {
      // Подписки ещё нет — действует пробный период из Teacher.trialEndsAt.
      const teacher = await this.teacherRepo.findOne({
        where: { id: teacherId },
      });
      return !!teacher?.trialEndsAt && teacher.trialEndsAt > now;
    }

    if (
      subscription.status === "trial" &&
      subscription.trialEndsAt != null &&
      subscription.trialEndsAt > now
    ) {
      return true;
    }

    if (
      subscription.status === "active" &&
      subscription.currentPeriodEnd != null &&
      subscription.currentPeriodEnd > now
    ) {
      return true;
    }

    return false;
  }
}
