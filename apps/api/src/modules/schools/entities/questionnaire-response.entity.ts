import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("questionnaire_response")
export class QuestionnaireResponse {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() questionnaireId!: string;
  @Column() studentId!: string;
  @Column({ type: "jsonb", nullable: true }) answers?: unknown;
  @Column({ type: "timestamp", nullable: true }) submittedAt?: Date;
  @CreateDateColumn() createdAt!: Date;
}
