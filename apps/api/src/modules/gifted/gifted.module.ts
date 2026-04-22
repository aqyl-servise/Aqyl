import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Teacher } from "../teachers/entities/teacher.entity";
import { Student } from "../schools/entities/student.entity";
import { Submission } from "../schools/entities/submission.entity";
import { GiftedPlan } from "../schools/entities/gifted-plan.entity";
import { GiftedStudent } from "../schools/entities/gifted-student.entity";
import { GiftedTeacherAssignment } from "../schools/entities/gifted-teacher-assignment.entity";
import { GiftedMaterial } from "../schools/entities/gifted-material.entity";
import { GiftedAchievement } from "../schools/entities/gifted-achievement.entity";
import { GiftedService } from "./gifted.service";
import { GiftedController } from "./gifted.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Teacher, Student, Submission,
      GiftedPlan, GiftedStudent, GiftedTeacherAssignment,
      GiftedMaterial, GiftedAchievement,
    ]),
  ],
  providers: [GiftedService],
  controllers: [GiftedController],
})
export class GiftedModule {}
