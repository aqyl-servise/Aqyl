import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("nutrition_order")
export class NutritionOrder {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ nullable: true }) schoolId?: string;
  @Column({ nullable: true, length: 500 }) fileUrl?: string;
  @Column({ length: 255 }) title!: string;
  @CreateDateColumn() createdAt!: Date;
}
