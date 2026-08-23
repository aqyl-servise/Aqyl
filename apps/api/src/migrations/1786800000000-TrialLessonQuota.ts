import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Пробный доступ переводится с 14 дней на квоту комплектов (оферта, п. 4.1).
 * Колонка помечает урок, израсходовавший один комплект бесплатного доступа.
 *
 * Заполнение для существующих данных обязательно: без него учителя, у которых
 * пробный период уже истёк, при выкатке разом получили бы 5 бесплатных уроков
 * заново. Поэтому все уроки, у которых генерация уже запускалась (любой статус
 * кроме черновика), помечаются израсходованными. Черновики лимит не тратят —
 * так же, как и в новой логике. B2G-учителей это не касается: у них квоты нет.
 */
export class TrialLessonQuota1786800000000 implements MigrationInterface {
  name = 'TrialLessonQuota1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "trialCounted" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "lessons" SET "trialCounted" = true WHERE "status" <> 'draft'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lessons" DROP COLUMN IF EXISTS "trialCounted"`,
    );
  }
}
