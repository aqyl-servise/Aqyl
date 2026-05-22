import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeacherNotification } from "./teacher-notification.entity";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { SmsService } from "./sms.service";

@Module({
  imports: [TypeOrmModule.forFeature([TeacherNotification])],
  controllers: [NotificationsController],
  providers: [NotificationsService, SmsService],
  exports: [NotificationsService, SmsService],
})
export class NotificationsModule {}
