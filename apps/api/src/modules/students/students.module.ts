import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Student } from "../schools/entities/student.entity";
import { Classroom } from "../schools/entities/classroom.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
  imports: [TypeOrmModule.forFeature([Student, Classroom, Teacher])],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
