import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('malimet_documents')
export class MalimetDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  schoolId!: string;

  @Column()
  classroomId!: string;

  @Column()
  teacherId!: string;

  @Column({ type: 'smallint' })
  quarter!: number;

  @Column({ length: 9 })
  academicYear!: string;

  @Column({ type: 'jsonb' })
  formData!: Record<string, unknown>;

  @Column({ length: 5 })
  lang!: string;

  @Column({ nullable: true })
  filePath!: string;

  @Column({ nullable: true, length: 10 })
  fileFormat!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
