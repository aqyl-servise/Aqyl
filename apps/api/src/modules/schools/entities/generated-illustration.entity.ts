import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type IllustrationStatus = "generating" | "ready" | "error";

@Entity("generated_illustration")
export class GeneratedIllustration {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() teacherId!: string;
  @Column() schoolId!: string;
  @Column({ length: 255 }) title!: string;
  @Column("text") prompt!: string;
  @Column({ nullable: true, length: 500 }) imageUrl?: string;
  @Column({ default: "generating" }) status!: IllustrationStatus;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
