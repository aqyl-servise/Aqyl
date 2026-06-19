import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("special_attention_student")
export class SpecialAttentionStudent {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ nullable: true }) schoolId?: string;
  @Index() @Column() studentId!: string;
  @Column("text") reason!: string;
  @Column({ type: "jsonb", default: () => "'[]'" }) documents!: { title: string; fileUrl: string }[];
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
