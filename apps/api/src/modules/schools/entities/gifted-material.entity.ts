import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

export type GiftedMaterialCategory = "test_tasks" | "online_lessons" | "completed_work" | "monitoring" | "work_plan";

@Entity("gifted_materials")
export class GiftedMaterial {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => Teacher, { onDelete: "CASCADE", eager: false })
  teacher!: Teacher;
  @Column() category!: GiftedMaterialCategory;
  @Column() title!: string;
  @Column({ nullable: true }) fileUrl?: string;
  @Column({ nullable: true }) linkUrl?: string;
  @CreateDateColumn() createdAt!: Date;
}
