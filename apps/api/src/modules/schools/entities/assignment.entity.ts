import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";
import { Classroom } from "./classroom.entity";
import { TaskSubmission } from "./task-submission.entity";

@Entity()
export class Assignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column()
  subject!: string;

  @Column({ nullable: true })
  dueDate?: Date;

  @Column({ default: 100 })
  maxScore!: number;

  @Column({ default: "draft" })
  status!: "draft" | "published" | "active" | "closed";

  @Column({ nullable: true })
  schoolId?: string;

  @Column({ nullable: true })
  assignmentType?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Teacher, { onDelete: "CASCADE" })
  teacher!: Teacher;

  @ManyToOne(() => Classroom, (c) => c.assignments, { onDelete: "CASCADE" })
  classroom!: Classroom;

  @OneToMany(() => TaskSubmission, (ts) => ts.assignment)
  submissions!: TaskSubmission[];
}
