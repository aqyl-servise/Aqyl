import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from "typeorm";
import { Quiz } from "./quiz.entity";

/**
 * Вопрос квиза. Тип только один — выбор одного ответа из 2–4 вариантов
 * (ТЗ 3.0, п. 3.2): в живом квизе на телефоне ничего сложнее не работает.
 *
 * Правильный ответ хранится номером варианта, а не текстом: текст учитель
 * правит, и сверка по строке разъехалась бы после первой же правки.
 */
@Entity("quiz_questions")
export class QuizQuestion {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  quizId!: string;

  @ManyToOne(() => Quiz, (q) => q.questions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "quizId" })
  quiz!: Quiz;

  /** Порядок показа, с нуля. */
  @Column({ type: "int" })
  order!: number;

  @Column({ type: "text" })
  text!: string;

  @Column({ type: "jsonb" })
  options!: string[];

  /** Номер правильного варианта в options. */
  @Column({ type: "int" })
  correctIndex!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
