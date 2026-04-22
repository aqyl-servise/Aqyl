import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

@Entity()
export class GeneratedDocument {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  type!: "lesson-plan" | "task-set";

  @Column()
  title!: string;

  @Column()
  language!: string;

  @Column({ type: "jsonb" })
  payload!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Teacher, (teacher) => teacher.generatedDocuments, {
    onDelete: "CASCADE",
  })
  teacher!: Teacher;
}
