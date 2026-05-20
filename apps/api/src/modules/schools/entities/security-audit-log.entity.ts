import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("security_audit_log")
export class SecurityAuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  eventType!: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  schoolId?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  endpoint?: string;

  @Column({ nullable: true })
  requestMethod?: string;

  @Column({ type: "jsonb", nullable: true })
  details?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
