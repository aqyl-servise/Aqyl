import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Classroom } from "../schools/entities/classroom.entity";
import { Student } from "../schools/entities/student.entity";
import { StudentTransfer } from "../schools/entities/student-transfer.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { SubjectTeacherAssignment } from "../schools/entities/subject-teacher-assignment.entity";
import { FinalAttestationStudent } from "../schools/entities/final-attestation-student.entity";
import { ClassroomsController } from "./classrooms.controller";
import { ClassroomsService } from "./classrooms.service";

@Module({
  imports: [TypeOrmModule.forFeature([Classroom, Student, StudentTransfer, Teacher, SubjectTeacherAssignment, FinalAttestationStudent])],
  controllers: [ClassroomsController],
  providers: [ClassroomsService],
})
export class ClassroomsModule {}
