import { MigrationInterface, QueryRunner } from 'typeorm';

/** Недоставленные письма по уведомлениям Resend — чтобы форма могла сказать правду. */
export class EmailBounces1787500000000 implements MigrationInterface {
  name = 'EmailBounces1787500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "email_bounces" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "kind" character varying(32) NOT NULL,
        "reason" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_bounces" PRIMARY KEY ("id")
      )
    `);
    // Поиск всегда идёт по адресу в нижнем регистре и по свежести.
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_email_bounces_email" ON "email_bounces" (lower("email"), "createdAt" DESC)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "email_bounces"`);
  }
}
