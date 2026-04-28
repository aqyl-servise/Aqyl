import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

export type KtpStatus = "unchecked" | "reviewing" | "approved" | "revision";

@Entity("ktp_review")
export class KtpReview {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  fileId!: string;

  @Column({ default: "unchecked" })
  status!: KtpStatus;

  @Column({ type: "text", nullable: true })
  comment?: string;

  @ManyToOne(() => Teacher, { nullable: true, onDelete: "SET NULL" })
  reviewedBy?: Teacher;

  @UpdateDateColumn()
  updatedAt!: Date;
}
