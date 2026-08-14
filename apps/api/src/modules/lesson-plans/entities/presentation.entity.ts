import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type PresentationStatus = 'generating' | 'ready' | 'error';

/**
 * Презентация по плану урока (ТЗ 2.0). Один слайд-набор на урок: повторная
 * генерация заменяет. Слайды хранятся структурно (jsonb), PDF рендерится на
 * скачивании — файлы не храним, как у раздаток.
 */
@Entity('lesson_presentations')
export class Presentation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column()
  lessonId!: string;

  @Column({ type: 'enum', enum: ['generating', 'ready', 'error'], default: 'generating' })
  status!: PresentationStatus;

  // Собранный массив слайдов (титул → ... → финал).
  @Column({ type: 'jsonb', nullable: true })
  slides?: Record<string, unknown>[] | null;

  @Column({ type: 'float', default: 0 })
  generationCost!: number; // тенге

  @Column({ type: 'text', nullable: true })
  generationError?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
