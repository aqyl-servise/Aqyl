import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LessonStage } from './lesson-stage.entity';

@Entity('lesson_descriptors')
export class Descriptor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  stageId!: string;

  @ManyToOne(() => LessonStage, (stage) => stage.descriptors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stageId' })
  stage!: LessonStage;

  @Column({ type: 'int' })
  order!: number;

  @Column({ type: 'text' })
  text!: string; // generated

  @Column({ type: 'int' })
  points!: number;
}
