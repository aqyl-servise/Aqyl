import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("refresh_tokens")
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // SHA-256 hash of the raw refresh token — never store the raw value.
  @Index()
  @Column()
  token!: string;

  // Teacher.id is a uuid string in this codebase (not a numeric id).
  @Index()
  @Column()
  userId!: string;

  @Column({ default: "teacher" })
  userType!: string; // 'teacher' | 'student' | 'admin' | ...

  @Column({ type: "timestamp" })
  expiresAt!: Date;

  @Column({ default: false })
  isRevoked!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
