import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

@Entity()
export class FileFolder {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  parentId?: string;

  @Column({ nullable: true })
  section?: string;

  @Column({ nullable: true })
  teacherRefId?: string;

  @Column({ nullable: true })
  schoolId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Teacher, { nullable: true, onDelete: "SET NULL" })
  createdBy?: Teacher;
}
