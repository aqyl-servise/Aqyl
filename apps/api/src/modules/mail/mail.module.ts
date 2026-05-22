import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { MailService } from "./mail.service";

@Module({
  imports: [NotificationsModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
