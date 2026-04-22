import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Classroom } from "./classroom.entity";
import { Submission } from "./submission.entity";
import { TaskSubmission } from "./task-submission.entity";

@Entity()
export class Student {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  fullName!: string;

  @Column({ nullable: true })
  orderNum?: number;

  @ManyToOne(() => Classroom, (classroom) => classroom.students, { onDelete: "CASCADE" })
  classroom!: Classroom;

  @OneToMany(() => Submission, (submission) => submission.student)
  submissions!: Submission[];

  @OneToMany(() => TaskSubmission, (ts) => ts.student)
  taskSubmissions!: TaskSubmission[];
}
