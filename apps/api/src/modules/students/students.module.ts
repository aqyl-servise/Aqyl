import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Student } from "../schools/entities/student.entity";
import { Classroom } from "../schools/entities/classroom.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { StudentTransfer } from "../schools/entities/student-transfer.entity";
import { FinalAttestationStudent } from "../schools/entities/final-attestation-student.entity";
import { SubjectTeacherAssignment } from "../schools/entities/subject-teacher-assignment.entity";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
  imports: [TypeOrmModule.forFeature([Student, Classroom, Teacher, StudentTransfer, FinalAttestationStudent, SubjectTeacherAssignment])],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
