import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";
import { Student } from "./student.entity";
import { Schedule } from "./schedule.entity";
import { Assignment } from "./assignment.entity";

@Entity()
export class Classroom {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column()
  grade!: number;

  @Column()
  subject!: string;

  @ManyToOne(() => Teacher, (teacher) => teacher.classrooms, { onDelete: "CASCADE", nullable: true })
  teacher!: Teacher;

  @ManyToOne(() => Teacher, { nullable: true, onDelete: "SET NULL" })
  classTeacher?: Teacher;

  @OneToMany(() => Student, (student) => student.classroom)
  students!: Student[];

  @OneToMany(() => Schedule, (s) => s.classroom)
  schedules!: Schedule[];

  @OneToMany(() => Assignment, (a) => a.classroom)
  assignments!: Assignment[];
}
