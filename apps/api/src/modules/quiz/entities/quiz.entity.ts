import {
  Column, CreateDateColumn, Entity, Index, OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from "typeorm";
import { QuizQuestion } from "./quiz-question.entity";

/**
 * Квиз — самостоятельный набор вопросов, который учитель создаёт по теме
 * (ТЗ 3.0, раздел 4). Не привязан к уроку: запускается отдельно и хранится в
 * материалах для повторного запуска.
 */
@Entity("quizzes")
export class Quiz {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  teacherId!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  subject?: string;

  @Column({ nullable: true })
  grade?: string;

  /** Язык вопросов: ru | kz | en. От него зависит проверка языковым шлюзом. */
  @Column({ default: "ru" })
  language!: string;

  @OneToMany(() => QuizQuestion, (q) => q.quiz, { cascade: true })
  questions!: QuizQuestion[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
