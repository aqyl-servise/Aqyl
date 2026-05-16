import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type PresentationStatus = "generating" | "ready" | "error";

@Entity("generated_presentation")
export class GeneratedPresentation {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() teacherId!: string;
  @Column() schoolId!: string;
  @Column({ length: 255 }) title!: string;
  @Column("text") prompt!: string;
  @Column({ default: 10 }) slideCount!: number;
  @Column({ nullable: true, length: 500 }) fileUrl?: string;
  @Column({ default: "generating" }) status!: PresentationStatus;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
