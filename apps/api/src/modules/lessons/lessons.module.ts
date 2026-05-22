import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OpenLesson } from "../schools/entities/open-lesson.entity";
import { LessonAnalysis } from "../schools/entities/lesson-analysis.entity";
import { LessonsService } from "./lessons.service";
import { LessonsController } from "./lessons.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([OpenLesson, LessonAnalysis]),
    NotificationsModule,
  ],
  providers: [LessonsService],
  controllers: [LessonsController],
  exports: [LessonsService, TypeOrmModule],
})
export class LessonsModule {}
