import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Воронка роста: письма-подсказки, отписка от них и короткие ссылки.
 *
 * - teacher.nudges — какие письма-подсказки учитель уже получил и когда
 *   ({"activation": "...", "trialEnd": "..."}). Каждое письмо — один раз.
 * - teacher.emailNudgesOff — учитель отписался. Квитанции и письма о доступе
 *   продолжают приходить: отписка касается только подсказок.
 * - short_links — короткие ссылки для печати и QR-кодов (/r/almaty): код
 *   раскрывается в utm-метки, счётчик переходов считается на сервере.
 */
export class GrowthFunnel1787800000000 implements MigrationInterface {
  name = 'GrowthFunnel1787800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "teacher" ADD COLUMN IF NOT EXISTS "nudges" jsonb NOT NULL DEFAULT '{}'`);
    await q.query(`ALTER TABLE "teacher" ADD COLUMN IF NOT EXISTS "emailNudgesOff" boolean NOT NULL DEFAULT false`);
    await q.query(`
      CREATE TABLE IF NOT EXISTS "short_links" (
        "code" varchar(40) PRIMARY KEY,
        "lang" varchar(2) NOT NULL DEFAULT 'ru',
        "utmSource" varchar(60) NOT NULL,
        "utmMedium" varchar(60),
        "utmCampaign" varchar(80),
        "note" varchar(200),
        "clicks" integer NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "short_links"`);
    await q.query(`ALTER TABLE "teacher" DROP COLUMN IF EXISTS "emailNudgesOff"`);
    await q.query(`ALTER TABLE "teacher" DROP COLUMN IF EXISTS "nudges"`);
  }
}
