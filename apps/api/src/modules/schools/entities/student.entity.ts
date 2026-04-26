import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Classroom } from "./classroom.entity";
import { Submission } from "./submission.entity";
import { TaskSubmission } from "./task-submission.entity";
import { Teacher } from "../../teachers/entities/teacher.entity";

@Entity()
export class Student {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  fullName!: string;

  @Column({ nullable: true })
  orderNum?: number;

  // Extended fields for manual registration
  @Column({ nullable: true, unique: true })
  iin?: string;

  @Column({ nullable: true, type: "date" })
  dateOfBirth?: Date;

  @Column({ nullable: true })
  parentName?: string;

  @Column({ nullable: true })
  parentContact?: string;

  @Column({ nullable: true })
  userId?: string; // FK to Teacher.id (auth account)

  @ManyToOne(() => Teacher, { nullable: true, onDelete: "SET NULL" })
  classTeacher?: Teacher;

  @ManyToOne(() => Classroom, (classroom) => classroom.students, { onDelete: "CASCADE" })
  classroom!: Classroom;

  @OneToMany(() => Submission, (submission) => submission.student)
  submissions!: Submission[];

  @OneToMany(() => TaskSubmission, (ts) => ts.student)
  taskSubmissions!: TaskSubmission[];
}
