import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Classroom } from "../../schools/entities/classroom.entity";
import { GeneratedDocument } from "../../schools/entities/generated-document.entity";

export type UserRole = "teacher" | "admin" | "principal" | "vice_principal" | "class_teacher" | "student";
export type UserStatus = "pending" | "active" | "rejected";

@Entity()
export class Teacher {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  fullName!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ default: "ru" })
  preferredLanguage!: string;

  @Column({ default: "teacher" })
  role!: UserRole;

  // "active" default ensures existing seeded rows stay active after schema sync
  @Column({ default: "active" })
  status!: UserStatus;

  @Column({ nullable: true })
  schoolName?: string;

  // Profile fields
  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  subject?: string;

  @Column({ nullable: true })
  experience?: number;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  university?: string;

  @Column({ nullable: true })
  courses?: string;

  @Column({ nullable: true })
  achievements?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Classroom, (classroom) => classroom.teacher)
  classrooms!: Classroom[];

  @OneToMany(() => GeneratedDocument, (document) => document.teacher)
  generatedDocuments!: GeneratedDocument[];
}
