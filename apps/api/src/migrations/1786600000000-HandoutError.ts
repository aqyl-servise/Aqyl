import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Колонка lesson_handouts.error — пометка листа, который не удалось
 * сгенерировать непустым (ТЗ 1.2, дефект 1). IF NOT EXISTS для совместимости с
 * базой, где схему уже накатили иначе.
 */
export class HandoutError1786600000000 implements MigrationInterface {
  name = 'HandoutError1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lesson_handouts" ADD COLUMN IF NOT EXISTS "error" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lesson_handouts" DROP COLUMN IF EXISTS "error"`);
  }
}
