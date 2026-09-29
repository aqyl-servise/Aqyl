import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * - pending — приглашённый зарегистрировался, первого готового урока ещё нет;
 * - rewarded — урок есть, пригласившему начислено;
 * - held — у обоих аккаунтов общее устройство: похоже на приглашение самого
 *   себя, решает администратор;
 * - capped — у пригласившего уже максимум наград;
 * - declined — отклонено администратором или пригласивший неактивен.
 */
export type ReferralStatus = 'pending' | 'rewarded' | 'held' | 'capped' | 'declined';

/** Одна строка на приглашённого учителя. */
@Entity('referrals')
export class Referral {
  @PrimaryColumn('uuid')
  inviteeId!: string;

  @Index()
  @Column('uuid')
  inviterId!: string;

  @Column({ type: 'varchar', length: 12, default: 'pending' })
  status!: ReferralStatus;

  /** Сколько уроков начислено пригласившему. */
  @Column({ type: 'int', default: 0 })
  lessons!: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  decidedAt?: Date | null;
}
