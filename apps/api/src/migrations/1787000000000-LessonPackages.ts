import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Пакеты уроков (ТЗ №3): баланс и срок на учителе, флаг платного списания на
 * уроке, журнал покупок. Backfill не нужен — платных списаний в истории нет,
 * а действующие подписки продолжают работать через subscriptions.
 */
export class LessonPackages1787000000000 implements MigrationInterface {
  name = 'LessonPackages1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "teacher" ADD COLUMN IF NOT EXISTS "paidLessonsBalance" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "teacher" ADD COLUMN IF NOT EXISTS "balanceExpiresAt" timestamptz NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "paidCounted" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "package_purchases" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "teacherId" character varying NOT NULL,
        "packageCode" character varying(16) NOT NULL,
        "lessons" integer NOT NULL,
        "priceKzt" integer NOT NULL,
        "paymentId" character varying,
        "balanceAfter" integer NOT NULL,
        "expiresAtAfter" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_package_purchases" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_package_purchases_teacher" ON "package_purchases" ("teacherId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "package_purchases"`);
    await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN IF EXISTS "paidCounted"`);
    await queryRunner.query(`ALTER TABLE "teacher" DROP COLUMN IF EXISTS "balanceExpiresAt"`);
    await queryRunner.query(`ALTER TABLE "teacher" DROP COLUMN IF EXISTS "paidLessonsBalance"`);
  }
}
