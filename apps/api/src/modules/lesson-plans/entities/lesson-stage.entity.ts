import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Lesson } from './lesson.entity';
import { Descriptor } from './descriptor.entity';

export type StageType = 'warmup' | 'explanation' | 'task' | 'quiz' | 'reflection';

@Entity('lesson_stages')
export class LessonStage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  lessonId!: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson!: Lesson;

  @Column({ type: 'int' })
  order!: number;

  @Column({ type: 'enum', enum: ['warmup', 'explanation', 'task', 'quiz', 'reflection'] })
  stageType!: StageType;

  @Column({ nullable: true })
  stageName?: string; // generated

  @Column({ type: 'int', default: 0 })
  timeMinutes!: number;

  @Column({ nullable: true })
  toolId?: string; // chosen tool from ToolCatalog

  // ── Generated content (Sonnet) ─────────────────────────────────
  @Column({ type: 'text', nullable: true })
  teacherActions?: string | null;

  @Column({ type: 'text', nullable: true })
  studentActions?: string | null;

  @Column({ type: 'text', nullable: true })
  assessmentCriteria?: string | null;

  @Column({ type: 'text', nullable: true })
  method?: string | null;

  @Column({ type: 'text', nullable: true })
  resources?: string | null;

  // ── Assessment ─────────────────────────────────────────────────
  @Column({ type: 'boolean', default: false })
  isAssessed!: boolean;

  @Column({ type: 'int', nullable: true })
  points?: number | null;

  @OneToMany(() => Descriptor, (d) => d.stage, { cascade: true })
  descriptors!: Descriptor[];
}
