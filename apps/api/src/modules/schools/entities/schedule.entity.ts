import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";
import { Classroom } from "./classroom.entity";

@Entity()
export class Schedule {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  dayOfWeek!: number; // 1=Mon ... 5=Fri

  @Column()
  period!: number; // 1-8

  @Column()
  subject!: string;

  @Column({ nullable: true })
  startTime?: string; // "08:30"

  @Column({ nullable: true })
  endTime?: string; // "09:15"

  @ManyToOne(() => Classroom, (c) => c.schedules, { onDelete: "CASCADE" })
  classroom!: Classroom;

  @ManyToOne(() => Teacher, { nullable: true, onDelete: "SET NULL" })
  teacher?: Teacher;
}
