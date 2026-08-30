import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Недоставленное письмо, о котором сообщил почтовый провайдер.
 *
 * Отправка по SMTP асинхронна: сервер принимает письмо молча, а отказ
 * приходит часами позже — приложение об этом не узнавало никогда, и человек
 * бесконечно ждал код на адрес с опечаткой. Resend сообщает о таких случаях
 * вебхуком, и здесь они сохраняются, чтобы форма регистрации могла сказать
 * прямо: письмо не дошло, проверьте адрес.
 */
@Entity("email_bounces")
export class EmailBounce {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  email!: string;

  /** Тип события Resend: bounced | complained | delivery_delayed. */
  @Column()
  kind!: string;

  /** Пояснение провайдера, если пришло. */
  @Column({ type: "text", nullable: true })
  reason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
