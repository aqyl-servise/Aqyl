import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";
import { Classroom } from "./classroom.entity";

export type ClassHourTopic = "education" | "law" | "circle" | "apko" | "other";

@Entity()
export class ClassHour {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ default: "other" })
  topic!: ClassHourTopic;

  @Column({ nullable: true })
  date?: Date;

  @Column({ nullable: true })
  duration?: number;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "jsonb", default: "[]" })
  fileUrls!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Teacher, { onDelete: "CASCADE" })
  classTeacher!: Teacher;

  @ManyToOne(() => Classroom, { onDelete: "CASCADE" })
  classroom!: Classroom;
}
