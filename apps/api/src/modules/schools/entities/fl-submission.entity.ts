import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

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
  @Column() assignmentId!: string;
  @Column() studentId!: string;
  @Column({ type: "jsonb", default: [] }) answers!: FLAnswer[];
  @Column({ nullable: true }) totalScore?: number;
  @Column({ nullable: true }) maxScore?: number;
  @Column({ default: "in_progress" }) status!: FLSubmissionStatus;
  @Column({ type: "timestamp", nullable: true }) startedAt?: Date;
  @Column({ type: "timestamp", nullable: true }) submittedAt?: Date;
  @Column({ type: "timestamp", nullable: true }) gradedAt?: Date;
  @CreateDateColumn() createdAt!: Date;
}
