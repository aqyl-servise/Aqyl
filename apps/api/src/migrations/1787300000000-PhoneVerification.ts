import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Подтверждение телефона как защита от мультиаккаунтов: бесплатные уроки
 * выдаются только на подтверждённый номер, отпечаток номера переживает
 * удаление аккаунта (trial_fingerprints).
 */
export class PhoneVerification1787300000000 implements MigrationInterface {
  name = 'PhoneVerification1787300000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "teacher" ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" timestamptz NULL`);
    await q.query(`
      CREATE TABLE IF NOT EXISTS "phone_verifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "teacherId" character varying NOT NULL,
        "phone" character varying(20) NOT NULL,
        "code" character varying(6) NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "isUsed" boolean NOT NULL DEFAULT false,
        "expiresAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_phone_verifications" PRIMARY KEY ("id")
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_phone_verifications_teacher" ON "phone_verifications" ("teacherId")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "phone_verifications"`);
    await q.query(`ALTER TABLE "teacher" DROP COLUMN IF EXISTS "phoneVerifiedAt"`);
  }
}
