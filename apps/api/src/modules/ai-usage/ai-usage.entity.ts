import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity("ai_usage_daily")
@Unique(["userId", "date", "actionType"])
export class AiUsageDaily {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() userId!: string;
  @Column({ nullable: true }) schoolId?: string;
  @Column() actionType!: string;
  @Column({ type: "date" }) date!: string;
  @Column({ default: 1 }) count!: number;
  @Column({ default: 0 }) tokensInput!: number;
  @Column({ default: 0 }) tokensOutput!: number;
  @Column({ type: "float", default: 0 }) costKzt!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity("ai_usage_alerts")
export class AiUsageAlert {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() userId!: string;
  @Column({ nullable: true }) schoolId?: string;
  @Column() alertType!: string;
  @CreateDateColumn() sentAt!: Date;
  @Column({ default: false }) resolved!: boolean;
}
