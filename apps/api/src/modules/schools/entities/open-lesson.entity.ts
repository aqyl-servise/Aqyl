import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

@Entity()
export class OpenLesson {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  subject!: string;

  @Column({ nullable: true })
  classroomId?: string;

  @Column({ nullable: true })
  cabinet?: string;

  @Column({ nullable: true })
  lessonTime?: string;

  @Column({ nullable: true })
  date?: Date;

  @Column({ type: "text", nullable: true })
  lessonTopic?: string;

  @Column({ type: "text", nullable: true })
  visitPurpose?: string;

  @Column({ type: "text", nullable: true })
  lessonPurpose?: string;

  @Column({ type: "text", nullable: true })
  equipment?: string;

  @Column({ default: "planned" })
  status!: "planned" | "conducted" | "analyzed";

  @Column({ nullable: true })
  schoolId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Teacher, { onDelete: "CASCADE" })
  teacher!: Teacher;
}
