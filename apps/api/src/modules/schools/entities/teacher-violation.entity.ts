import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

export type ViolationType = "reprimand" | "parent_complaint" | "other";

@Entity("teacher_violation")
export class TeacherViolation {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => Teacher, { onDelete: "CASCADE", eager: false }) teacher!: Teacher;
  @Column() schoolId!: string;
  @Column({ default: "other" }) type!: ViolationType;
  @Column("text") description!: string;
  @Column({ type: "date" }) date!: string;
  @Column({ type: "float", default: 1 }) pointsDeducted!: number;
  @Column({ nullable: true }) createdBy?: string;
  @CreateDateColumn() createdAt!: Date;
}
