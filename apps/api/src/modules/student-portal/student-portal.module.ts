import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Student } from "../schools/entities/student.entity";
import { Schedule } from "../schools/entities/schedule.entity";
import { Assignment } from "../schools/entities/assignment.entity";
import { TaskSubmission } from "../schools/entities/task-submission.entity";
import { Questionnaire } from "../schools/entities/questionnaire.entity";
import { QuestionnaireResponse } from "../schools/entities/questionnaire-response.entity";
import { SubjectTeacherAssignment } from "../schools/entities/subject-teacher-assignment.entity";
import { StudentPortalController } from "./student-portal.controller";
import { StudentPortalService } from "./student-portal.service";

@Module({
  imports: [TypeOrmModule.forFeature([
    Student, Schedule, Assignment, TaskSubmission,
    Questionnaire, QuestionnaireResponse, SubjectTeacherAssignment,
  ])],
  controllers: [StudentPortalController],
  providers: [StudentPortalService],
})
export class StudentPortalModule {}
