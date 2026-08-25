import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm';

/**
 * Мягкие признаки связи аккаунтов: адрес и отпечаток устройства.
 *
 * НЕ основание для блокировки. В школе весь коллектив сидит за одним адресом,
 * мобильные операторы раздают один адрес тысячам, а отпечаток устройства
 * меняется сменой браузера. Это повод посмотреть глазами — решение принимает
 * администратор.
 *
 * Значения хранятся необратимым HMAC (тот же ключ, что у отпечатков пробного
 * периода): сырые адреса в базе не лежат — этого требует и политика.
 */
@Entity('account_signals')
@Index(['kind', 'digest'])
@Index(['teacherId', 'kind', 'digest'], { unique: true })
export class AccountSignal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  teacherId!: string;

  @Column({ length: 8 })
  kind!: 'ip' | 'device';

  @Column({ length: 64 })
  digest!: string;

  /** Сколько раз признак встречался у этого аккаунта. */
  @Column({ type: 'int', default: 1 })
  hits!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  firstSeen!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastSeen!: Date;
}
