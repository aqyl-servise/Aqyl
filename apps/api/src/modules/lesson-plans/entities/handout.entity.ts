import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

// Тип раздаточного материала. Для этапа «Задание» зависит от инструмента
// (individual/pair/group/text), для остальных — от типа этапа.
export type HandoutType =
  | 'warmup' | 'explanation' | 'individual' | 'pair' | 'group' | 'text' | 'quiz' | 'reflection';

/**
 * Готовый раздаточный лист (срез 2) — одно приложение пакета.
 *
 * Содержимое хранится в jsonb в двух версиях: `studentContent` (без ключей) и
 * `teacherContent` (с ключами, критериями, баллами). Для индивидуального
 * задания три уровня A/B/C лежат в `levels`, а studentContent/teacherContent —
 * только заголовок-обёртка.
 */
@Entity('lesson_handouts')
export class Handout {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  lessonId!: string;

  // Этап/задание, к которому относится приложение.
  @Column()
  stageId!: string;

  // Номер приложения = порядок этапа в уроке.
  @Column({ type: 'int' })
  order!: number;

  @Column({ type: 'enum', enum: ['warmup', 'explanation', 'individual', 'pair', 'group', 'text', 'quiz', 'reflection'] })
  handoutType!: HandoutType;

  @Column({ type: 'jsonb', nullable: true })
  studentContent?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  teacherContent?: Record<string, unknown> | null;

  // Три уровня A/B/C для индивидуального задания. null для остальных типов.
  @Column({ type: 'jsonb', nullable: true })
  levels?: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  linkedToValue!: boolean;

  // Лист не удалось сгенерировать непустым даже после повторов (ТЗ 1.2,
  // дефект 1). Такой лист виден в UI с кнопкой «Повторить», а не молча пуст.
  @Column({ type: 'boolean', default: false })
  error!: boolean;
}
