import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('kmzh_stage_cache')
export class KmzhStageCache {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 64 })
  cacheKey!: string;

  @Column({ length: 5 })
  lang!: string;

  @Column({ nullable: true, length: 100 })
  subject!: string;

  @Column({ nullable: true, length: 20 })
  grade!: string;

  @Column({ type: 'text' })
  stagesJson!: string;

  @Column({ default: 'v1', length: 10 })
  promptVersion!: string;

  @Column({ default: 1 })
  useCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUsedAt!: Date;
}
