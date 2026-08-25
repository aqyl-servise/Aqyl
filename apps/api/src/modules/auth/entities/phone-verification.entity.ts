import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Коды подтверждения номера телефона (защита от мультиаккаунтов).
 *
 * Отдельная таблица, а не переиспользование email_verifications: там ключ —
 * адрес почты, а здесь код привязан к учителю и номеру, и нужен счётчик
 * попыток — иначе шестизначный код подбирается перебором за минуты.
 */
@Entity('phone_verifications')
export class PhoneVerification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  teacherId!: string;

  /** Нормализованный номер (только цифры, формат 7XXXXXXXXXX). */
  @Column({ length: 20 })
  phone!: string;

  @Column({ length: 6 })
  code!: string;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'boolean', default: false })
  isUsed!: boolean;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
