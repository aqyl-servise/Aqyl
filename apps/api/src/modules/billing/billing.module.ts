import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Teacher } from "../teachers/entities/teacher.entity";
import { Subscription } from "./entities/subscription.entity";
import { Payment } from "./entities/payment.entity";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { KaspiService } from "./kaspi.service";
import { SubscriptionService } from "./subscription.service";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Payment, Teacher]), MailModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    KaspiService,
    SubscriptionService,
    SubscriptionGuard,
  ],
  // Экспортируем SubscriptionService и SubscriptionGuard, чтобы AI-модули
  // (generators, kmzh, materials) могли применять @UseGuards(SubscriptionGuard).
  // BillingService — для RetentionModule: он рассылает напоминания об
  // окончании подписки по расписанию.
  exports: [SubscriptionService, SubscriptionGuard, BillingService],
})
export class BillingModule {}
