import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Общие ссылки на урок: учитель отправляет план коллеге (/s/<token>).
 * Одна ссылка на урок; просмотры считаются. Страница не индексируется.
 */
export class LessonShares1788300000000 implements MigrationInterface {
  name = 'LessonShares1788300000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "lesson_shares" (
        "token" varchar(16) PRIMARY KEY,
        "lessonId" uuid NOT NULL UNIQUE,
        "teacherId" uuid NOT NULL,
        "views" integer NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "revokedAt" timestamptz
      )`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_lesson_shares_teacher" ON "lesson_shares" ("teacherId")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "lesson_shares"`);
  }
}
