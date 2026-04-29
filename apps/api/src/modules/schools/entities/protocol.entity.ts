import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

export type ProtocolType = "pedagogical-council" | "parent-meeting" | "educational" | "other";

@Entity()
export class Protocol {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ default: "pedagogical-council" })
  type!: ProtocolType;

  @Column({ nullable: true })
  date?: Date;

  @Column({ type: "text", nullable: true })
  content?: string;

  @Column({ type: "jsonb", default: "[]" })
  fileUrls!: string[];

  @Column({ nullable: true })
  schoolId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Teacher, { onDelete: "CASCADE" })
  createdBy!: Teacher;
}
