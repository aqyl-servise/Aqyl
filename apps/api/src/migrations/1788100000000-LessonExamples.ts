import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Библиотека примеров для поиска: публичные страницы «КСП по химии, 8 класс:
 * Кислород». План генерируется нашим же движком от служебного аккаунта,
 * публикуется только после вычитки (status draft → published).
 */
export class LessonExamples1788100000000 implements MigrationInterface {
  name = 'LessonExamples1788100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "lesson_examples" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "slug" varchar(160) NOT NULL UNIQUE,
        "lang" varchar(2) NOT NULL,
        "subject" varchar(100) NOT NULL,
        "grade" integer NOT NULL,
        "topic" varchar(300) NOT NULL,
        "objectives" jsonb NOT NULL DEFAULT '[]',
        "lessonId" uuid,
        "status" varchar(12) NOT NULL DEFAULT 'draft',
        "views" integer NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "publishedAt" timestamp
      )`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_lesson_examples_status" ON "lesson_examples" ("status")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "lesson_examples"`);
  }
}
