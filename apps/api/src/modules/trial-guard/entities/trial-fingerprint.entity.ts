import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Необратимый отпечаток адреса почты или номера телефона удалённого аккаунта.
 *
 * Задача: закон обязывает уничтожить персональные данные при удалении
 * аккаунта, но бизнесу нужно помнить, что пробный период по этому признаку
 * уже выдавался. В таблице хранится только HMAC — установить по нему личность
 * нельзя, сравнить с новой регистрацией можно.
 *
 * Почему HMAC, а не голый хеш: множество казахстанских номеров конечно и
 * невелико, голый SHA-256 перебирается за минуты. Тогда утверждение политики о
 * невозможности установить личность стало бы ложным. Секретный ключ лежит в
 * переменных окружения сервера, отдельно от базы.
 */
@Entity('trial_fingerprints')
@Index(['kind', 'digest'], { unique: true })
export class TrialFingerprint {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Что именно захешировано: почта или номер телефона. */
  @Column({ type: 'varchar', length: 16 })
  kind!: 'email' | 'phone';

  /** HMAC-SHA256 в hex от приведённого к единому виду значения. */
  @Column({ type: 'varchar', length: 64 })
  digest!: string;

  /** Когда отпечаток создан — по нему считается срок хранения. */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  /** После этой даты запись подлежит удалению (createdAt + 3 года). */
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;
}
