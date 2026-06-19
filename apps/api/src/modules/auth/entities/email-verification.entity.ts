import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("email_verifications")
export class EmailVerification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  email!: string;

  @Column()
  code!: string; // 6-digit numeric code

  @Column({ type: "timestamp" })
  expiresAt!: Date; // valid for 15 minutes

  @Column({ default: false })
  isUsed!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
