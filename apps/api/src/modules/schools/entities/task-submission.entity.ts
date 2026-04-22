import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./student.entity";
import { Assignment } from "./assignment.entity";

@Entity()
export class TaskSubmission {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", nullable: true })
  content?: string;

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ nullable: true })
  score?: number;

  @Column({ default: "pending" })
  status!: "pending" | "submitted" | "graded";

  @Column({ nullable: true })
  submittedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Student, (s) => s.taskSubmissions, { onDelete: "CASCADE" })
  student!: Student;

  @ManyToOne(() => Assignment, (a) => a.submissions, { onDelete: "CASCADE" })
  assignment!: Assignment;
}
