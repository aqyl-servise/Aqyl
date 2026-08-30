import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationsModule } from "../notifications/notifications.module";
import { MailService } from "./mail.service";
import { EmailBounce } from "./entities/email-bounce.entity";
import { EmailDeliveryService } from "./email-delivery.service";
import { EmailDeliveryController } from "./email-delivery.controller";

@Module({
  imports: [NotificationsModule, TypeOrmModule.forFeature([EmailBounce])],
  controllers: [EmailDeliveryController],
  providers: [MailService, EmailDeliveryService],
  exports: [MailService, EmailDeliveryService],
})
export class MailModule {}
