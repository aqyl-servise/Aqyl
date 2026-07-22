import {
  Entity, PrimaryGeneratedColumn, Column, Index, OneToMany, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { LiteracyQuestion } from './literacy-question.entity';

export type LiteracyType = 'reading' | 'math' | 'science';
export type LiteracyLang = 'ru' | 'kz' | 'en';
export type LiteracySourceMode = 'own' | 'generated';
export type LiteracyStatus = 'draft' | 'generating' | 'ready' | 'error';

@Entity('literacy_sets')
export class LiteracySet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  userId!: string;

  // Nullable: B2C teachers have no school.
  @Index()
  @Column({ type: 'varchar', nullable: true })
  schoolId!: string | null;

  // Nullable: reserved for embedding the set into a lesson stage (next срез). Always null now.
  @Column({ type: 'varchar', nullable: true })
  lessonId!: string | null;

  @Column({ type: 'enum', enum: ['reading', 'math', 'science'] })
  literacyType!: LiteracyType;

  @Column({ nullable: true })
  subject?: string;

  @Column({ type: 'int', nullable: true })
  grade?: number;

  @Column({ type: 'enum', enum: ['ru', 'kz', 'en'], default: 'ru' })
  language!: LiteracyLang;

  @Column({ type: 'enum', enum: ['own', 'generated'], default: 'generated' })
  sourceMode!: LiteracySourceMode;

  @Column({ type: 'text', nullable: true })
  sourceTopic?: string | null;

  @Column({ type: 'text', nullable: true })
  sourceNotes?: string | null; // optional "Дополнительные пожелания"

  @Column({ type: 'text', default: '' })
  stimulusText!: string;

  @Column({ type: 'jsonb', nullable: true })
  stimulusData?: Record<string, unknown> | null; // tables/data for math/science

  @Column({ type: 'int', default: 6 })
  questionCount!: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  pisaLevels!: number[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  questionTypes!: string[];

  @Column({ type: 'int', default: 0 })
  totalPoints!: number;

  @Column({ type: 'enum', enum: ['draft', 'generating', 'ready', 'error'], default: 'draft' })
  status!: LiteracyStatus;

  @Column({ type: 'text', nullable: true })
  generationError?: string | null;

  @OneToMany(() => LiteracyQuestion, (q) => q.set, { cascade: true })
  questions!: LiteracyQuestion[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
