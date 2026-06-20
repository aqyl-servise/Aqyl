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

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Payment, Teacher])],
  controllers: [BillingController],
  providers: [
    BillingService,
    KaspiService,
    SubscriptionService,
    SubscriptionGuard,
  ],
  // Экспортируем SubscriptionService и SubscriptionGuard, чтобы AI-модули
  // (generators, kmzh, materials) могли применять @UseGuards(SubscriptionGuard).
  exports: [SubscriptionService, SubscriptionGuard],
})
export class BillingModule {}
