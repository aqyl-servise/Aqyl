import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./student.entity";
import { Classroom } from "./classroom.entity";

@Entity("student_transfers")
export class StudentTransfer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Student, { onDelete: "CASCADE" })
  student!: Student;

  @ManyToOne(() => Classroom, { nullable: true, onDelete: "SET NULL" })
  fromClassroom?: Classroom | null;

  @ManyToOne(() => Classroom, { nullable: true, onDelete: "SET NULL" })
  toClassroom?: Classroom | null;

  @Column({ nullable: true })
  note?: string;

  @CreateDateColumn()
  transferredAt!: Date;
}
