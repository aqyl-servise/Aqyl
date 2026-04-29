import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

@Entity()
export class OpenLesson {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column()
  subject!: string;

  @Column()
  grade!: number;

  @Column({ nullable: true })
  date?: Date;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ default: "planned" })
  status!: "planned" | "conducted" | "reviewed";

  @Column({ type: "text", nullable: true })
  directorComment?: string;

  @Column({ type: "jsonb", default: "[]" })
  fileUrls!: string[];

  @Column({ nullable: true })
  schoolId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Teacher, { onDelete: "CASCADE" })
  teacher!: Teacher;
}
