import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Пример плана урока для публичной библиотеки.
 *
 * Сам план — обычный урок (lessons) служебного аккаунта: генерируется тем же
 * движком, что и у учителей, и так же выгружается в Word. Здесь — только то,
 * что нужно странице: адрес, язык, предмет, класс, тема и статус публикации.
 *
 * - lessonId пустой — пример ждёт очереди на генерацию;
 * - status draft — на вычитке, на сайте не виден;
 * - status published — страница открыта и есть в sitemap.
 */
@Entity('lesson_examples')
export class LessonExample {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 2 })
  lang!: 'ru' | 'kz';

  @Column({ type: 'varchar', length: 100 })
  subject!: string;

  @Column({ type: 'int' })
  grade!: number;

  @Column({ type: 'varchar', length: 300 })
  topic!: string;

  /**
   * Коды целей обучения из типовой программы, если их указали при создании.
   * Без кодов страница цели обучения по кодам не показывает: код, который
   * модель восстановила сама, может оказаться выдуманным.
   */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  objectives!: string[];

  @Column({ type: 'uuid', nullable: true })
  lessonId?: string | null;

  @Index()
  @Column({ type: 'varchar', length: 12, default: 'draft' })
  status!: 'draft' | 'published';

  @Column({ type: 'int', default: 0 })
  views!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date | null;
}
