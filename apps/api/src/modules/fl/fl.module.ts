import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FLTask } from "../schools/entities/fl-task.entity";
import { FLAssignment } from "../schools/entities/fl-assignment.entity";
import { FLSubmission } from "../schools/entities/fl-submission.entity";
import { FLResult } from "../schools/entities/fl-result.entity";
import { Student } from "../schools/entities/student.entity";
import { Classroom } from "../schools/entities/classroom.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { AiModule } from "../ai/ai.module";
import { FLService } from "./fl.service";
import { FLController } from "./fl.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([FLTask, FLAssignment, FLSubmission, FLResult, Student, Classroom, Teacher]),
    AiModule,
  ],
  providers: [FLService],
  controllers: [FLController],
  exports: [FLService, TypeOrmModule],
})
export class FLModule {}
