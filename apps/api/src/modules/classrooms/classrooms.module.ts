import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Classroom } from "../schools/entities/classroom.entity";
import { Student } from "../schools/entities/student.entity";
import { StudentTransfer } from "../schools/entities/student-transfer.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { ClassroomsController } from "./classrooms.controller";
import { ClassroomsService } from "./classrooms.service";

@Module({
  imports: [TypeOrmModule.forFeature([Classroom, Student, StudentTransfer, Teacher])],
  controllers: [ClassroomsController],
  providers: [ClassroomsService],
})
export class ClassroomsModule {}
