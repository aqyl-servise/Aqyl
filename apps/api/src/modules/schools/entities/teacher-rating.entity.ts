import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

export type RatingPeriod = "quarter" | "semester" | "year";

@Entity("teacher_rating")
export class TeacherRating {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @ManyToOne(() => Teacher, { onDelete: "CASCADE", eager: false }) teacher!: Teacher;
  @Index() @Column() schoolId!: string;
  @Column({ default: "year" }) period!: RatingPeriod;
  @Column({ default: 0 }) periodNumber!: number;
  @Column({ default: "2025-2026" }) academicYear!: string;
  @Column({ type: "float", default: 0 }) totalScore!: number;
  @Column({ type: "float", default: 0 }) scoreExperience!: number;
  @Column({ type: "float", default: 0 }) scoreCategory!: number;
  @Column({ type: "float", default: 0 }) scoreAcademic!: number;
  @Column({ type: "float", default: 0 }) scoreFLiteracy!: number;
  @Column({ type: "float", default: 0 }) scoreOpenLessons!: number;
  @Column({ type: "float", default: 0 }) scoreAchievements!: number;
  @Column({ type: "float", default: 0 }) scoreActivity!: number;
  @Column({ type: "float", default: 5 }) scoreViolations!: number;
  @Column({ type: "float", default: 0 }) manualAdjustment!: number;
  @Column({ type: "text", nullable: true }) manualComment?: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
