import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Тип согласия. Каждое даётся отдельным действием — общей отметки быть не должно. */
export type ConsentType =
  /** Сбор и обработка персональных данных + принятие политики и соглашения. */
  | 'personal_data'
  /** Трансграничная передача содержания запросов для создания учебных материалов. */
  | 'cross_border';

/** Что произошло: согласие дано или отозвано. */
export type ConsentAction = 'granted' | 'revoked';

/**
 * Журнал согласий на обработку персональных данных.
 *
 * Закон Республики Казахстан требует, чтобы согласие было самостоятельным
 * действием, а не строкой в общих условиях, — и чтобы факт согласия можно было
 * доказать. Поэтому пишем не флаг «согласен», а запись с полным составом:
 * кто, на что, по какой редакции текста, когда, откуда и каким способом.
 *
 * Отзыв согласия не удаляет прежнюю запись, а добавляет новую с
 * action = 'revoked' и теми же полями: история должна оставаться полной.
 */
@Entity('consent_records')
@Index(['userId', 'consentType'])
export class ConsentRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Идентификатор пользователя, давшего согласие. */
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  consentType!: ConsentType;

  @Column({ type: 'varchar', length: 16, default: 'granted' })
  action!: ConsentAction;

  /**
   * Номер редакции текста, под которым дано согласие. Нужен, чтобы при
   * изменении документов было видно, с какой именно версией согласился человек.
   */
  @Column({ type: 'varchar', length: 32 })
  documentVersion!: string;

  /** Дата и время с часовым поясом. */
  @CreateDateColumn({ type: 'timestamptz' })
  occurredAt!: Date;

  /** Адрес отправителя запроса. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress?: string | null;

  /** Способ получения: экран регистрации, настройки профиля и т.д. */
  @Column({ type: 'varchar', length: 32 })
  method!: string;

  /** Клиент, с которого пришёл запрос — вспомогательный признак для разбора. */
  @Column({ type: 'text', nullable: true })
  userAgent?: string | null;
}
