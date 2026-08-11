import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type HandoutPackageStatus = 'generating' | 'ready' | 'error';

/**
 * Пакет раздаточных материалов урока (срез 2). Один на урок: повторная
 * генерация заменяет предыдущий. `generationCost` — суммарная стоимость пакета
 * в тенге (детализация по вызовам — в GenerationCostLog).
 */
@Entity('lesson_handout_packages')
export class HandoutPackage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column()
  lessonId!: string;

  @Column({ type: 'enum', enum: ['generating', 'ready', 'error'], default: 'generating' })
  status!: HandoutPackageStatus;

  @Column({ type: 'float', default: 0 })
  generationCost!: number; // тенге

  @Column({ type: 'text', nullable: true })
  generationError?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
