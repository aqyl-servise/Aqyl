import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AdaptationSourceType = 'text' | 'pdf';
export type AdaptationLanguage = 'kz' | 'ru';

@Entity('text_adapter_adaptations')
export class Adaptation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  userId!: string;

  // Nullable: B2C teachers belong to no school.
  @Index()
  @Column({ nullable: true })
  schoolId!: string | null;

  @Column({ type: 'enum', enum: ['text', 'pdf'], default: 'text' })
  sourceType!: AdaptationSourceType;

  @Column({ type: 'text' })
  sourceText!: string;

  @Column({ type: 'int' })
  targetGrade!: number;

  @Column({ type: 'enum', enum: ['kz', 'ru'] })
  language!: AdaptationLanguage;

  @Column({ type: 'jsonb' })
  result!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
