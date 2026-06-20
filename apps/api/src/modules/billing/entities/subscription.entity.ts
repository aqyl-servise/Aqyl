import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("subscriptions")
export class Subscription {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  teacherId!: string;

  @Column({ default: "trial" })
  status!: string; // 'trial' | 'active' | 'expired' | 'cancelled'

  @Column({ type: "int", default: 4000 })
  pricePerMonth!: number; // в тенге

  @Column({ type: "timestamp", nullable: true })
  currentPeriodStart!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  currentPeriodEnd!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  trialEndsAt!: Date | null;

  @Column({ default: false })
  cancelAtPeriodEnd!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
