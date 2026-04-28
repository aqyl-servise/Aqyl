import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { Student } from "../schools/entities/student.entity";
import { Classroom } from "../schools/entities/classroom.entity";
import { Assignment } from "../schools/entities/assignment.entity";
import { TaskSubmission } from "../schools/entities/task-submission.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Student, Classroom, Assignment, TaskSubmission])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
