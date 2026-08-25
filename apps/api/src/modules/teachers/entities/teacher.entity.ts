import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Classroom } from "../../schools/entities/classroom.entity";
import { GeneratedDocument } from "../../schools/entities/generated-document.entity";
import { School } from "../../schools/entities/school.entity";

export type UserRole =
  | "teacher" | "admin" | "principal"
  | "vice_principal" | "vice_principal_academic" | "vice_principal_education"
  | "psychologist" | "social_pedagogue"
  | "class_teacher" | "student";
export type UserStatus = "pending" | "active" | "rejected" | "inactive";

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

  @Index()
  @Column({ nullable: true })
  schoolId?: string;

  // ── B2C (individual teacher) registration fields ──────────────────────────
  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({ default: "b2g" })
  registrationSource!: string; // 'b2g' | 'b2c'

  @Column({ default: "active" })
  subscriptionStatus!: string; // 'trial' | 'active' | 'expired' | 'none'

  @Column({ type: "timestamp", nullable: true })
  trialEndsAt?: Date | null; // 14 days from B2C registration

  // ── Пакеты уроков (ТЗ №3) ─────────────────────────────────────────────────
  // Один баланс, одна дата: покупка любого пакета делает balance += N и
  // expiresAt = now + 3 мес — перенос остатка получается сам собой.
  @Column({ type: "int", default: 0 })
  paidLessonsBalance!: number;

  @Column({ type: "timestamptz", nullable: true })
  balanceExpiresAt?: Date | null;

  // ── Удаление аккаунта ──────────────────────────────────────────────────────
  // Мягкое удаление: доступ закрывается сразу, но данные ещё можно вернуть
  // входом с прежними почтой и паролем. По истечении срока запись и все
  // материалы уничтожаются без возможности восстановления (см. purgeDue).
  @Column({ type: "timestamp", nullable: true })
  deletionRequestedAt?: Date | null;

  /** Дата окончательного уничтожения данных: deletionRequestedAt + 14 дней. */
  @Column({ type: "timestamp", nullable: true })
  purgeAfter?: Date | null;

  // ── B2C onboarding ─────────────────────────────────────────────────────────
  @Column({ default: false })
  onboardingCompleted!: boolean;

  @Column({ nullable: true })
  gradeLevel?: string; // классы, которые преподаёт: '1-4' | '5-9' | '10-11' (через запятую)

  @Column({ nullable: true })
  region?: string; // область Казахстана

  @Column({ nullable: true })
  language?: string; // язык обучения: 'ru' | 'kz' | 'mixed'

  @ManyToOne(() => School, (s) => s.teachers, { nullable: true, onDelete: "SET NULL" })
  school?: School;

  // Profile fields
  @Column({ nullable: true })
  phone?: string;

  /**
   * Момент подтверждения номера по SMS. Пока пусто — бесплатные уроки не
   * выдаются: номер телефона единственный практичный барьер против
   * регистрации на новый почтовый ящик ради нового пробного доступа.
   */
  @Column({ type: "timestamptz", nullable: true })
  phoneVerifiedAt?: Date | null;

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

  @Column({ default: false })
  isClassTeacher!: boolean;

  @Column({ nullable: true })
  managedClassroomId?: string;

  @Column({ nullable: true })
  managedClassroomName?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Classroom, (classroom) => classroom.teacher)
  classrooms!: Classroom[];

  @OneToMany(() => GeneratedDocument, (document) => document.teacher)
  generatedDocuments!: GeneratedDocument[];
}
