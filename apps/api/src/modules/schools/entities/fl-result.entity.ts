import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type FLResultDirection = "reading" | "math" | "science";

@Entity("fl_result")
export class FLResult {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column() studentId!: string;
  @Index() @Column() classroomId!: string;
  @Index() @Column() schoolId!: string;
  @Column({ nullable: true }) direction?: FLResultDirection;
  @Column({ type: "float", default: 0 }) score!: number;
  @Column({ nullable: true }) quarter?: number;
  @Column({ nullable: true }) academicYear?: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
