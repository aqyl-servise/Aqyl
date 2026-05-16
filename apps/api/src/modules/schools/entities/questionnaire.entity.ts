import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type QuestionnaireType = "uploaded" | "ai_generated";
export type QuestionnaireStatus = "draft" | "assigned" | "completed";

@Entity("questionnaire")
export class Questionnaire {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ nullable: true }) schoolId?: string;
  @Column({ nullable: true }) createdBy?: string;
  @Column({ length: 255 }) title!: string;
  @Column({ type: "text", nullable: true }) description?: string;
  @Column("text") content!: string;
  @Column({ default: "uploaded" }) type!: QuestionnaireType;
  @Column({ nullable: true, length: 500 }) fileUrl?: string;
  @Column({ type: "jsonb", default: () => "'[]'" }) assignedClassroomIds!: string[];
  @Column({ default: "draft" }) status!: QuestionnaireStatus;
  @Column({ type: "text", nullable: true }) aiAnalysisResult?: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
