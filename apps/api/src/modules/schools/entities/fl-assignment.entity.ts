import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type FLAssignmentFormat = "test" | "text_work" | "practical";
export type FLAssignmentStatus = "draft" | "published" | "closed";

@Entity("fl_assignment")
export class FLAssignment {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() title!: string;
  @Column({ type: "text", nullable: true }) description?: string;
  @Column({ type: "jsonb", default: [] }) tasks!: string[];
  @Column() classroomId!: string;
  @Column() teacherId!: string;
  @Column() schoolId!: string;
  @Column({ nullable: true }) format?: FLAssignmentFormat;
  @Column({ nullable: true }) timeLimit?: number;
  @Column({ type: "timestamp", nullable: true }) dueDate?: Date;
  @Column({ default: "draft" }) status!: FLAssignmentStatus;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
