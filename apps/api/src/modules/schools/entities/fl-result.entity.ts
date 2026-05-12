import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type FLResultDirection = "reading" | "math" | "science";

@Entity("fl_result")
export class FLResult {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() studentId!: string;
  @Column() classroomId!: string;
  @Column() schoolId!: string;
  @Column({ nullable: true }) direction?: FLResultDirection;
  @Column({ type: "float", default: 0 }) score!: number;
  @Column({ nullable: true }) quarter?: number;
  @Column({ nullable: true }) academicYear?: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
