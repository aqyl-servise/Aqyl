import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

@Entity()
export class ClassHourHistory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  classHourId!: string;

  @Column({ nullable: true })
  changedById?: string;

  @ManyToOne(() => Teacher, { nullable: true, onDelete: "SET NULL" })
  changedBy?: Teacher;

  @Column({ type: "text", nullable: true })
  changeDescription?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
