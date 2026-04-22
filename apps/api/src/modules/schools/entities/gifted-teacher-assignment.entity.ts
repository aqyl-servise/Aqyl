import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";
import { Student } from "./student.entity";

@Entity("gifted_teacher_assignments")
export class GiftedTeacherAssignment {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => Teacher, { onDelete: "CASCADE", eager: false })
  teacher!: Teacher;
  @ManyToOne(() => Student, { onDelete: "CASCADE", eager: false })
  student!: Student;
  @CreateDateColumn() createdAt!: Date;
}
