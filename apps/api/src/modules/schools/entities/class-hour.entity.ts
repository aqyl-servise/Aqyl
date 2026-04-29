import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";
import { Classroom } from "./classroom.entity";

export type ClassHourTopic = "education" | "law" | "circle" | "apko" | "other";
export type ClassHourStatus = "planned" | "conducted" | "rescheduled";
export type ClassHourDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

@Entity()
export class ClassHour {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ default: "other" })
  topic!: ClassHourTopic;

  @Column({ nullable: true })
  dayOfWeek?: ClassHourDay;

  @Column({ nullable: true })
  time?: string;

  @Column({ nullable: true })
  date?: Date;

  @Column({ nullable: true })
  duration?: number;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "text", nullable: true })
  comment?: string;

  @Column({ default: "planned" })
  status!: ClassHourStatus;

  @Column({ type: "jsonb", default: "[]" })
  fileUrls!: string[];

  @Column({ nullable: true })
  schoolId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Teacher, { onDelete: "CASCADE" })
  classTeacher!: Teacher;

  @ManyToOne(() => Classroom, { onDelete: "CASCADE" })
  classroom!: Classroom;
}
