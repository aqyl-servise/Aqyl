import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./student.entity";

@Entity("gifted_achievements")
export class GiftedAchievement {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => Student, { onDelete: "CASCADE", eager: false })
  student!: Student;
  @Column() title!: string;
  @Column({ nullable: true, type: "date" }) date?: Date;
  @Column({ default: "school" }) level!: string;
  @Column({ nullable: true }) subject?: string;
  @Column({ nullable: true }) place?: string;
  @CreateDateColumn() createdAt!: Date;
}
