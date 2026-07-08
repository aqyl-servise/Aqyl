import { Entity, PrimaryColumn, Column, Index } from 'typeorm';
import { StageType } from './lesson-stage.entity';

// Seed reference: the arsenal of tools a teacher can pick per lesson stage.
@Entity('lesson_tool_catalog')
export class ToolCatalog {
  @PrimaryColumn()
  toolId!: string; // e.g. 'prior_knowledge', 'diagram', 'text_adaptation'

  @Index()
  @Column({ type: 'enum', enum: ['warmup', 'explanation', 'task', 'quiz', 'reflection'] })
  stageType!: StageType;

  @Column()
  nameRu!: string;

  @Column()
  nameKz!: string;

  @Column()
  nameEn!: string;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  // Short description fed into the Sonnet prompt so it generates the right content.
  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
