import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

/**
 * Лог стоимости генерации по уроку (срез 2, §4.2/§7.4).
 *
 * Учёт токенов уже ведётся в ai_usage_daily (агрегат по пользователю и дню).
 * Здесь — разбивка по конкретному уроку и операции, чтобы измерить экономику
 * пакета материалов: «сколько стоил пакет для этого урока». Цена считается той
 * же функцией costKzt, что и общий учёт, а не отдельным тарифом.
 */
@Entity('generation_cost_log')
export class GenerationCostLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  lessonId!: string;

  @Column()
  operation!: string; // 'plan' | 'handouts' | 'literacy'

  @Column()
  model!: string;

  @Column({ type: 'int', default: 0 })
  inputTokens!: number;

  @Column({ type: 'int', default: 0 })
  outputTokens!: number;

  @Column({ type: 'float', default: 0 })
  costKzt!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
