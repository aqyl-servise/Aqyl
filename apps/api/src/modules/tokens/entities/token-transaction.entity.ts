import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity("token_transactions")
export class TokenTransaction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  packageId!: string;

  @Index()
  @Column()
  schoolId!: string;

  @Column()
  userId!: string;

  @Column({ default: 0 })
  tokensInput!: number;

  @Column({ default: 0 })
  tokensOutput!: number;

  @Column()
  actionType!: string;

  @Column()
  model!: string;

  @Column({ type: "decimal", precision: 10, scale: 6, nullable: true })
  costUsd?: number;

  @Column({ default: false })
  fromCache!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
