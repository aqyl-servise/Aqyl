import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

@Entity()
export class UploadedFile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  filename!: string;

  @Column()
  originalName!: string;

  @Column()
  mimetype!: string;

  @Column()
  size!: number;

  @Column()
  path!: string;

  @Column({ nullable: true })
  refType?: string;

  @Column({ nullable: true })
  refId?: string;

  @Column({ nullable: true })
  folderId?: string;

  @Column({ nullable: true })
  section?: string;

  @Column({ nullable: true })
  schoolId?: string;

  @Column({ type: "jsonb", nullable: true })
  assignedClassrooms?: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Teacher, { onDelete: "CASCADE" })
  uploadedBy!: Teacher;
}
