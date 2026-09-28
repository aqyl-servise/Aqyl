import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Короткая ссылка для печати и QR-кодов: aqyl-service.kz/r/almaty.
 *
 * Длинная ссылка с utm-метками не помещается на листовку и ломается при
 * наборе руками. Код раскрывается в метки на нашей стороне, а переход
 * считается сервером — видно, сколько человек отсканировали код, даже если
 * никто из них не зарегистрировался.
 */
@Entity('short_links')
export class ShortLink {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  code!: string;

  /** На какую версию витрины ведёт: ru — «/», kz — «/kz». */
  @Column({ type: 'varchar', length: 2, default: 'ru' })
  lang!: 'ru' | 'kz';

  @Column({ type: 'varchar', length: 60 })
  utmSource!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  utmMedium?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  utmCampaign?: string | null;

  /** Для себя: где висит, кому отдали. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  note?: string | null;

  @Column({ type: 'int', default: 0 })
  clicks!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
