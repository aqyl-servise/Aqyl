import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Teacher } from "../../teachers/entities/teacher.entity";

export type AttestationCategory = "none" | "second" | "first" | "highest";

@Entity()
export class TeacherAttestation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Teacher, { onDelete: "CASCADE" })
  teacher!: Teacher;

  @Column({ nullable: true })
  diplomaFileUrl?: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ type: "date", nullable: true })
  categoryDate?: string;

  @Column({ type: "date", nullable: true })
  nextAttestationDate?: string;

  @Column({ nullable: true })
  ozpResult?: string;

  @Column({ nullable: true })
  ozpFileUrl?: string;

  @Column({ type: "jsonb", default: [] })
  coursesFileUrls!: string[];

  @Column({ type: "jsonb", default: [] })
  protocolsFileUrls!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
