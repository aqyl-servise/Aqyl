import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";
import { Student } from "./student.entity";
import { Schedule } from "./schedule.entity";
import { Assignment } from "./assignment.entity";
import { School } from "./school.entity";

@Entity()
export class Classroom {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column()
  grade!: number;

  // nullable so classrooms can exist without a subject teacher
  @Column({ nullable: true })
  subject?: string;

  @Column({ nullable: true })
  academicYear?: string;

  @Column({ nullable: true })
  schoolId?: string;

  @ManyToOne(() => School, (s) => s.classrooms, { nullable: true, onDelete: "CASCADE" })
  school?: School;

  // SET NULL so classrooms are not destroyed when a teacher is removed
  @ManyToOne(() => Teacher, (teacher) => teacher.classrooms, { onDelete: "SET NULL", nullable: true })
  teacher?: Teacher;

  @ManyToOne(() => Teacher, { nullable: true, onDelete: "SET NULL" })
  classTeacher?: Teacher;

  @OneToMany(() => Student, (student) => student.classroom)
  students!: Student[];

  @OneToMany(() => Schedule, (s) => s.classroom)
  schedules!: Schedule[];

  @OneToMany(() => Assignment, (a) => a.classroom)
  assignments!: Assignment[];
}
