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
  // S3 object key (null for legacy disk-backed rows where imageUrl is a relative path).
  @Column({ nullable: true, length: 500 }) s3Key?: string;
  @Column({ default: "generating" }) status!: IllustrationStatus;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
