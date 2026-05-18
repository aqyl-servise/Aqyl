import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export type NotificationType = "violation" | "rating_updated" | "ktp_reviewed";

@Entity("teacher_notification")
export class TeacherNotification {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() teacherId!: string;
  @Column({ nullable: true }) schoolId?: string;
  @Column({ default: "violation" }) type!: NotificationType;
  @Column({ length: 255 }) title!: string;
  @Column("text") message!: string;
  @Column({ default: false }) isRead!: boolean;
  @CreateDateColumn() createdAt!: Date;
}
