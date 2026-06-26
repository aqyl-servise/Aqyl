import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type DiagramType =
  | 'process'
  | 'mindmap'
  | 'timeline'
  | 'cycle'
  | 'hierarchy'
  | 'comparison';

export type DiagramLanguage = 'kz' | 'ru';

@Entity('visualizer_diagrams')
export class Diagram {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ nullable: false })
  schoolId!: string;

  @Index()
  @Column()
  userId!: string;

  @Column()
  title!: string;

  @Column({
    type: 'enum',
    enum: ['process', 'mindmap', 'timeline', 'cycle', 'hierarchy', 'comparison'],
  })
  type!: DiagramType;

  @Column({ type: 'enum', enum: ['kz', 'ru'] })
  language!: DiagramLanguage;

  @Column({ type: 'jsonb' })
  content!: Record<string, any>;

  @Column({ default: 'aqyl-blue' })
  theme!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
