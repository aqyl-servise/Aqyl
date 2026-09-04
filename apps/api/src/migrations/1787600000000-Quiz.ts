import { MigrationInterface, QueryRunner } from 'typeorm';

/** Квизы и их вопросы (ТЗ 3.0, слой 3 — контент). */
export class Quiz1787600000000 implements MigrationInterface {
  name = 'Quiz1787600000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "quizzes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "teacherId" character varying NOT NULL,
        "title" character varying NOT NULL,
        "subject" character varying,
        "grade" character varying,
        "language" character varying NOT NULL DEFAULT 'ru',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quizzes" PRIMARY KEY ("id")
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_quizzes_teacher" ON "quizzes" ("teacherId", "createdAt" DESC)`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS "quiz_questions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "quizId" uuid NOT NULL,
        "order" integer NOT NULL,
        "text" text NOT NULL,
        "options" jsonb NOT NULL,
        "correctIndex" integer NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quiz_questions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quiz_questions_quiz" FOREIGN KEY ("quizId")
          REFERENCES "quizzes"("id") ON DELETE CASCADE
      )
    `);
    // Показ всегда идёт по порядку внутри одного квиза.
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_quiz_questions_order" ON "quiz_questions" ("quizId", "order")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "quiz_questions"`);
    await q.query(`DROP TABLE IF EXISTS "quizzes"`);
  }
}
