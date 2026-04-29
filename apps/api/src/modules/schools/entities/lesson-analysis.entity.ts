import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { OpenLesson } from "./open-lesson.entity";
import { Teacher } from "../../teachers/entities/teacher.entity";

@Entity()
export class LessonAnalysis {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => OpenLesson, { onDelete: "CASCADE" })
  lesson!: OpenLesson;

  @Column()
  lessonId!: string;

  @ManyToOne(() => Teacher, { nullable: true })
  analyzer?: Teacher;

  @Column({ nullable: true })
  analyzerId?: string;

  @Column({ type: "text", nullable: true })
  visitPurpose?: string;

  @Column({ type: "text", nullable: true })
  lessonTopic?: string;

  @Column({ type: "text", nullable: true })
  lessonPurpose?: string;

  @Column({ type: "text", nullable: true })
  equipment?: string;

  @Column({ type: "jsonb", default: "[]" })
  studentSurveyTable!: unknown[];

  @Column({ type: "jsonb", default: "[]" })
  lessonProgressTable!: unknown[];

  @Column({ type: "text", nullable: true })
  conclusion?: string;

  @Column({ type: "text", nullable: true })
  recommendations?: string;

  @Column({ type: "text", nullable: true })
  teacherSignature?: string;

  @Column({ nullable: true })
  teacherSignDate?: Date;

  @Column({ type: "text", nullable: true })
  analyzerSignature?: string;

  @Column({ nullable: true })
  analyzerSignDate?: Date;

  @Column({ default: true })
  isDraft!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
