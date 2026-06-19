import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";
import { Classroom } from "./classroom.entity";

@Entity("subject_teacher_assignment")
export class SubjectTeacherAssignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  subject!: string;

  @Index()
  @Column()
  teacherId!: string;

  @Index()
  @Column()
  classroomId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Teacher, { onDelete: "CASCADE" })
  teacher!: Teacher;

  @ManyToOne(() => Classroom, { onDelete: "CASCADE" })
  classroom!: Classroom;
}
