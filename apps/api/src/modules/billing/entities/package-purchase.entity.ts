import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * Журнал покупок пакетов уроков (ТЗ №3, п. 2.2). Только аудит и бухгалтерия:
 * механика доступа считается по балансу на учителе, а не по этой таблице.
 * packageCode 'admin' — начисление из админки (priceKzt = 0).
 */
@Entity("package_purchases")
export class PackagePurchase {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  teacherId!: string;

  @Column({ length: 16 })
  packageCode!: string;

  @Column({ type: "int" })
  lessons!: number;

  @Column({ type: "int" })
  priceKzt!: number;

  @Column({ type: "varchar", nullable: true })
  paymentId?: string | null;

  /** Снимок после начисления — чтобы аудит читался без реконструкции. */
  @Column({ type: "int" })
  balanceAfter!: number;

  @Column({ type: "timestamptz" })
  expiresAtAfter!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
