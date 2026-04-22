import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

export type GiftedPlanType = "school_plan" | "psychologist";

@Entity("gifted_plans")
export class GiftedPlan {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ default: "school_plan" }) type!: GiftedPlanType;
  @Column() title!: string;
  @Column({ nullable: true }) fileUrl?: string;
  @ManyToOne(() => Teacher, { nullable: true, onDelete: "SET NULL", eager: false })
  uploadedBy?: Teacher;
  @CreateDateColumn() createdAt!: Date;
}
