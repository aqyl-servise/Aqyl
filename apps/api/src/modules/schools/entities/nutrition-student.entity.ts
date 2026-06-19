import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("nutrition_student")
export class NutritionStudent {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ nullable: true }) schoolId?: string;
  @Index() @Column() studentId!: string;
  @Column({ default: "free" }) nutritionType!: string;
  @Column({ nullable: true }) academicYear?: string;
  @Column({ type: "text", nullable: true }) notes?: string;
  @CreateDateColumn() createdAt!: Date;
}
