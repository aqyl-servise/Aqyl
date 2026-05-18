import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeacherRating } from "../schools/entities/teacher-rating.entity";
import { TeacherViolation } from "../schools/entities/teacher-violation.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { Assignment } from "../schools/entities/assignment.entity";
import { TaskSubmission } from "../schools/entities/task-submission.entity";
import { OpenLesson } from "../schools/entities/open-lesson.entity";
import { GiftedTeacherAssignment } from "../schools/entities/gifted-teacher-assignment.entity";
import { GiftedAchievement } from "../schools/entities/gifted-achievement.entity";
import { UploadedFile } from "../schools/entities/uploaded-file.entity";
import { FLTask } from "../schools/entities/fl-task.entity";
import { FLAssignment } from "../schools/entities/fl-assignment.entity";
import { FLSubmission } from "../schools/entities/fl-submission.entity";
import { RatingService } from "./rating.service";
import { RatingController } from "./rating.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeacherRating,
      TeacherViolation,
      Teacher,
      Assignment,
      TaskSubmission,
      OpenLesson,
      GiftedTeacherAssignment,
      GiftedAchievement,
      UploadedFile,
      FLTask,
      FLAssignment,
      FLSubmission,
    ]),
    NotificationsModule,
  ],
  providers: [RatingService],
  controllers: [RatingController],
})
export class RatingModule {}
