import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";
import { Classroom } from "./classroom.entity";

@Entity("sor_soch_document")
export class SorSochDocument {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column()
  type!: "sor" | "soch";

  @Column({ nullable: true })
  subject?: string;

  @Column({ nullable: true })
  quarter?: string;

  @Column({ nullable: true })
  fileUrl?: string;

  @Index()
  @Column({ nullable: true })
  teacherId?: string;

  @Index()
  @Column({ nullable: true })
  classroomId?: string;

  @Index()
  @Column({ nullable: true })
  schoolId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Teacher, { onDelete: "SET NULL", nullable: true })
  teacher?: Teacher;

  @ManyToOne(() => Classroom, { onDelete: "SET NULL", nullable: true })
  classroom?: Classroom;
}
