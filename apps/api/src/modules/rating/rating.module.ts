import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeacherRating } from "../schools/entities/teacher-rating.entity";
import { TeacherViolation } from "../schools/entities/teacher-violation.entity";
import { RatingService } from "./rating.service";
import { RatingController } from "./rating.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { TeachersModule } from "../teachers/teachers.module";
import { AssignmentsModule } from "../assignments/assignments.module";
import { LessonsModule } from "../lessons/lessons.module";
import { GiftedModule } from "../gifted/gifted.module";
import { FilesModule } from "../files/files.module";
import { FLModule } from "../fl/fl.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([TeacherRating, TeacherViolation]),
    NotificationsModule,
    TeachersModule,
    AssignmentsModule,
    LessonsModule,
    GiftedModule,
    FilesModule,
    FLModule,
  ],
  providers: [RatingService],
  controllers: [RatingController],
})
export class RatingModule {}
