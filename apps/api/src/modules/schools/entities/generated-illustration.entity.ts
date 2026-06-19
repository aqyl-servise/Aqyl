import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type IllustrationStatus = "generating" | "ready" | "error";

@Entity("generated_illustration")
export class GeneratedIllustration {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column() teacherId!: string;
  @Index() @Column() schoolId!: string;
  @Column({ length: 255 }) title!: string;
  @Column("text") prompt!: string;
  @Column({ nullable: true, length: 500 }) imageUrl?: string;
  @Column({ default: "generating" }) status!: IllustrationStatus;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
