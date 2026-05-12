import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type FLDirection = "reading" | "math" | "science";
export type FLDifficulty = "low" | "medium" | "high";
export type FLTaskType = "test" | "open" | "practical";
export type FLSource = "bank" | "teacher" | "ai";

export interface FLTaskOption {
  text: string;
  isCorrect: boolean;
}

@Entity("fl_task")
export class FLTask {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() title!: string;
  @Column("text") description!: string;
  @Column({ nullable: true }) subject?: string;
  @Column({ nullable: true }) grade?: number;
  @Column({ nullable: true }) direction?: FLDirection;
  @Column({ nullable: true }) difficulty?: FLDifficulty;
  @Column({ nullable: true }) taskType?: FLTaskType;
  @Column({ type: "jsonb", nullable: true }) options?: FLTaskOption[];
  @Column({ type: "text", nullable: true }) correctAnswer?: string;
  @Column({ default: "bank" }) source!: FLSource;
  @Column({ nullable: true }) schoolId?: string;
  @Column({ nullable: true }) teacherId?: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
