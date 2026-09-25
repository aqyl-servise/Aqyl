import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Источник первого касания при регистрации (utm-метки, внешний реферер,
 * страница входа, платформа). До этого источник не записывался вовсе, и
 * ответить на вопрос «какой канал привёл учителей» было нечем.
 *
 * Колонка допускает NULL: все уже зарегистрированные учителя останутся без
 * источника — восстановить его задним числом нельзя.
 */
export class TeacherAcquisition1787700000000 implements MigrationInterface {
  name = 'TeacherAcquisition1787700000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "teacher" ADD COLUMN IF NOT EXISTS "acquisition" jsonb`);
    // Отчёты группируют по источнику — индекс по нему.
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_teacher_acq_source" ON "teacher" (("acquisition"->>'utm_source'))`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "IDX_teacher_acq_source"`);
    await q.query(`ALTER TABLE "teacher" DROP COLUMN IF EXISTS "acquisition"`);
  }
}
