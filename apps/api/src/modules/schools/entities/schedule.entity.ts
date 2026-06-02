import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";
import { Classroom } from "./classroom.entity";

@Entity()
export class Schedule {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ nullable: true })
  schoolId?: string;

  @Column()
  dayOfWeek!: number; // 1=Mon ... 6=Sat

  @Column()
  period!: number; // 1-8

  @Column()
  subject!: string;

  @Column({ nullable: true })
  startTime?: string; // "08:30"

  @Column({ nullable: true })
  endTime?: string; // "09:15"

  @Column({ nullable: true })
  room?: string;

  @Column({ nullable: true })
  academicYear?: string;

  @Column({ default: "main" })
  version!: string;

  @ManyToOne(() => Classroom, (c) => c.schedules, { onDelete: "CASCADE" })
  classroom!: Classroom;

  @ManyToOne(() => Teacher, { nullable: true, onDelete: "SET NULL" })
  teacher?: Teacher;

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
