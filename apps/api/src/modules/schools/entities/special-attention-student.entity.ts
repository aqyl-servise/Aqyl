import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("special_attention_student")
export class SpecialAttentionStudent {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ nullable: true }) schoolId?: string;
  @Column() studentId!: string;
  @Column("text") reason!: string;
  @Column({ type: "jsonb", default: () => "'[]'" }) documents!: { title: string; fileUrl: string }[];
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
