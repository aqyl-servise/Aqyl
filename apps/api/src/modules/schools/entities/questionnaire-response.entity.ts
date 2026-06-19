import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("questionnaire_response")
export class QuestionnaireResponse {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column() questionnaireId!: string;
  @Index() @Column() studentId!: string;
  @Column({ type: "jsonb", nullable: true }) answers?: unknown;
  @Column({ type: "timestamp", nullable: true }) submittedAt?: Date;
  @CreateDateColumn() createdAt!: Date;
}
