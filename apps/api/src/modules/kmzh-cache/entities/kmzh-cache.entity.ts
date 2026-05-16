import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("kmzh_cache")
export class KmzhCache {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  cacheKey!: string;

  @Column({ type: "varchar", length: 100 })
  subject!: string;

  @Column({ type: "smallint" })
  classNumber!: number;

  @Column({ type: "varchar", length: 500 })
  topic!: string;

  @Column({ type: "varchar", length: 500 })
  topicNormalized!: string;

  @Column({ type: "varchar", length: 10 })
  language!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 20 })
  promptVersion!: string;

  @Column({ type: "integer", default: 1 })
  useCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  lastUsedAt!: Date | null;
}
