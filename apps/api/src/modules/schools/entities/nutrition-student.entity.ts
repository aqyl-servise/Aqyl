import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("nutrition_student")
export class NutritionStudent {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ nullable: true }) schoolId?: string;
  @Column() studentId!: string;
  @Column({ default: "free" }) nutritionType!: string;
  @Column({ nullable: true }) academicYear?: string;
  @Column({ type: "text", nullable: true }) notes?: string;
  @CreateDateColumn() createdAt!: Date;
}
