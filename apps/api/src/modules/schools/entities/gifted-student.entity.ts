import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./student.entity";

@Entity("gifted_students")
export class GiftedStudent {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => Student, { onDelete: "CASCADE", eager: false })
  student!: Student;
  @Column({ nullable: true }) notes?: string;
  @CreateDateColumn() createdAt!: Date;
}
