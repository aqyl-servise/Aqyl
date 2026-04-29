import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";
import { Classroom } from "./classroom.entity";

@Entity("schools")
export class School {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  region?: string;

  // nullable so existing rows (created before this column was added) don't break synchronize
  @Column({ nullable: true, unique: true })
  code?: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Teacher, (t) => t.school)
  teachers!: Teacher[];

  @OneToMany(() => Classroom, (c) => c.school)
  classrooms!: Classroom[];
}
