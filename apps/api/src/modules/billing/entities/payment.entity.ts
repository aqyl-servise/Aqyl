import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  teacherId!: string;

  @Column({ nullable: true })
  subscriptionId!: string;

  @Column()
  provider!: string; // 'kaspi' | 'halyk'

  @Index()
  @Column({ nullable: true })
  externalId!: string; // ID транзакции от провайдера

  @Index()
  @Column({ nullable: true })
  orderId!: string; // наш внутренний ID заказа

  @Column({ type: "int" })
  amount!: number; // в тенге

  @Column({ default: "KZT" })
  currency!: string;

  @Index()
  @Column({ default: "pending" })
  status!: string; // 'pending' | 'paid' | 'failed' | 'refunded'

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null; // сырой ответ от провайдера

  @Column({ type: "timestamp", nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
