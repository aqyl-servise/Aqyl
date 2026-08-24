import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Языковой шлюз (ТЗ 1.6, этап 1): пометка урока, в котором после всех
 * попыток перегенерации остались языковые нарушения. Выборка для ручного
 * разбора: SELECT id FROM lessons WHERE "languageWarning".
 */
export class LanguageWarning1787100000000 implements MigrationInterface {
  name = 'LanguageWarning1787100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "languageWarning" boolean NOT NULL DEFAULT false`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "lessons" DROP COLUMN IF EXISTS "languageWarning"`);
  }
}
