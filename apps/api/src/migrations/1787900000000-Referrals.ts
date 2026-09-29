import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Приглашения коллег: за каждого приглашённого, кто сделал первый готовый
 * урок, пригласившему начисляется 5 уроков (решение команды 29.09.2026).
 *
 * - teacher.referralCode — код в ссылке приглашения (?ref=КОД), выдаётся при
 *   первом открытии страницы «Пригласить коллегу».
 * - referrals — одна строка на приглашённого: кто пригласил и чем кончилось
 *   (pending → rewarded | held | capped | declined).
 */
export class Referrals1787900000000 implements MigrationInterface {
  name = 'Referrals1787900000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "teacher" ADD COLUMN IF NOT EXISTS "referralCode" varchar(12)`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_teacher_referral_code" ON "teacher" ("referralCode")`);
    await q.query(`
      CREATE TABLE IF NOT EXISTS "referrals" (
        "inviteeId" uuid PRIMARY KEY,
        "inviterId" uuid NOT NULL,
        "status" varchar(12) NOT NULL DEFAULT 'pending',
        "lessons" integer NOT NULL DEFAULT 0,
        "note" varchar(200),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "decidedAt" timestamp
      )`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_referrals_inviter" ON "referrals" ("inviterId")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "referrals"`);
    await q.query(`DROP INDEX IF EXISTS "UQ_teacher_referral_code"`);
    await q.query(`ALTER TABLE "teacher" DROP COLUMN IF EXISTS "referralCode"`);
  }
}
