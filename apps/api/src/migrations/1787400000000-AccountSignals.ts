import { MigrationInterface, QueryRunner } from 'typeorm';

/** Мягкие признаки связи аккаунтов (адрес, устройство) — флаги для админки. */
export class AccountSignals1787400000000 implements MigrationInterface {
  name = 'AccountSignals1787400000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "account_signals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "teacherId" character varying NOT NULL,
        "kind" character varying(8) NOT NULL,
        "digest" character varying(64) NOT NULL,
        "hits" integer NOT NULL DEFAULT 1,
        "firstSeen" timestamptz NOT NULL DEFAULT now(),
        "lastSeen" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_account_signals" PRIMARY KEY ("id")
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_account_signals_kind_digest" ON "account_signals" ("kind", "digest")`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_account_signals_teacher" ON "account_signals" ("teacherId", "kind", "digest")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "account_signals"`);
  }
}
