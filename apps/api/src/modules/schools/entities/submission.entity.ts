import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./student.entity";

@Entity()
export class Submission {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Student, (student) => student.submissions, {
    onDelete: "CASCADE",
  })
  student!: Student;

  @Column()
  topic!: string;

  @Column("decimal", { precision: 5, scale: 2 })
  score!: number;

  @Column("decimal", { precision: 5, scale: 2 })
  maxScore!: number;

  @Column()
  submittedAt!: Date;
}
