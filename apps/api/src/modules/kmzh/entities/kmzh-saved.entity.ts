import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('kmzh_saved')
export class KmzhSaved {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  schoolId!: string;

  @Column({ nullable: true })
  classroomId!: string;

  @Column({ type: 'text' })
  planJson!: string;

  @Column({ nullable: true })
  lessonTitle!: string;

  @Column({ nullable: true })
  grade!: string;

  @Column({ nullable: true })
  date!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
