import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type FLSubmissionStatus = "in_progress" | "submitted" | "graded";

export interface FLAnswer {
  taskId: string;
  answer: string;
  score?: number;
  teacherComment?: string;
}

@Entity("fl_submission")
export class FLSubmission {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index()
  @Column() assignmentId!: string;
  @Index()
  @Column() studentId!: string;
  @Index()
  @Column({ nullable: true }) schoolId?: string;
  @Column({ type: "jsonb", default: [] }) answers!: FLAnswer[];
  @Column({ nullable: true }) totalScore?: number;
  @Column({ nullable: true }) maxScore?: number;
  @Column({ default: "in_progress" }) status!: FLSubmissionStatus;
  @Column({ type: "timestamp", nullable: true }) startedAt?: Date;
  @Column({ type: "timestamp", nullable: true }) submittedAt?: Date;
  @Column({ type: "timestamp", nullable: true }) gradedAt?: Date;
  @CreateDateColumn() createdAt!: Date;
}
