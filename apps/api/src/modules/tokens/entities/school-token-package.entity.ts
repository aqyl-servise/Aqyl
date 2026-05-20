import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity("school_token_packages")
export class SchoolTokenPackage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  schoolId!: string;

  @Column({ type: "bigint" })
  totalTokens!: number;

  @Column({ type: "bigint", default: 0 })
  usedTokens!: number;

  @Column({ type: "date" })
  periodStart!: string;

  @Column({ type: "date" })
  periodEnd!: string;

  @Column({ default: "included" })
  planType!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
