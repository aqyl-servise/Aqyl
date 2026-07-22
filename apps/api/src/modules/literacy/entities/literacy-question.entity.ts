import {
  Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { LiteracySet } from './literacy-set.entity';

export type QuestionType = 'single' | 'multiple' | 'truefalse' | 'short' | 'open' | 'matching';

@Entity('literacy_questions')
export class LiteracyQuestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  setId!: string;

  @ManyToOne(() => LiteracySet, (s) => s.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'setId' })
  set!: LiteracySet;

  @Column({ type: 'int' })
  order!: number;

  @Column({ type: 'text' })
  questionText!: string;

  @Column({ type: 'enum', enum: ['single', 'multiple', 'truefalse', 'short', 'open', 'matching'] })
  questionType!: QuestionType;

  @Column({ type: 'int' })
  pisaLevel!: number; // 1–6, required

  @Column({ type: 'int' })
  points!: number; // required

  @Column({ type: 'jsonb', nullable: true })
  options?: unknown | null; // answer options where applicable

  @Column({ type: 'jsonb' })
  correctAnswer!: unknown; // key — required

  @Column({ type: 'text', nullable: true })
  answerCriteria?: string | null; // grading criterion for open questions
}
