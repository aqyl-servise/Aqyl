import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Флаг детерминированного запасного варианта валидатора баллов (ТЗ 1.5.2):
 * блок оценивания листа не прошёл проверку и после двух перегенераций, шкала
 * построена кодом. По флагу отбираются листы для ручного разбора.
 */
export class ScoringFallback1786900000000 implements MigrationInterface {
  name = 'ScoringFallback1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lesson_handouts" ADD COLUMN IF NOT EXISTS "scoringFallback" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lesson_handouts" DROP COLUMN IF EXISTS "scoringFallback"`,
    );
  }
}
