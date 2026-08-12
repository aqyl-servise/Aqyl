import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Первая миграция проекта — схема среза 2 (раздаточные материалы).
 *
 * Написана ИДЕМПОТЕНТНО (IF NOT EXISTS, DO-блоки для enum) намеренно: проект
 * переходит на миграции по ходу жизни, и на проде эти объекты УЖЕ созданы
 * (ранее применены вручную, т.к. DB_SYNCHRONIZE=false). Идемпотентный up()
 * позволяет migration:run безопасно «принять» существующую схему как базовую
 * (на проде — no-op с записью в таблицу migrations) и при этом создать её с
 * нуля на чистой БД (CI, новое окружение).
 *
 * Следующие миграции пишутся обычным способом (через migration:generate) — они
 * стартуют уже поверх этой базовой точки.
 */
export class HandoutsSrez21723400000000 implements MigrationInterface {
  name = 'HandoutsSrez21723400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lesson_stages" ADD COLUMN IF NOT EXISTS "linkedToValue" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "lesson_handouts_handouttype_enum" AS ENUM
          ('warmup','explanation','individual','pair','group','text','quiz','reflection');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lesson_handouts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "lessonId" character varying NOT NULL,
        "stageId" character varying NOT NULL,
        "order" integer NOT NULL,
        "handoutType" "lesson_handouts_handouttype_enum" NOT NULL,
        "studentContent" jsonb,
        "teacherContent" jsonb,
        "levels" jsonb,
        "linkedToValue" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_lesson_handouts" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lesson_handouts_lessonId" ON "lesson_handouts" ("lessonId")`,
    );

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "lesson_handout_packages_status_enum" AS ENUM ('generating','ready','error');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lesson_handout_packages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "lessonId" character varying NOT NULL,
        "status" "lesson_handout_packages_status_enum" NOT NULL DEFAULT 'generating',
        "generationCost" double precision NOT NULL DEFAULT 0,
        "generationError" text,
        "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lesson_handout_packages" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lesson_handout_packages_lessonId" ON "lesson_handout_packages" ("lessonId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "generation_cost_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "lessonId" character varying NOT NULL,
        "operation" character varying NOT NULL,
        "model" character varying NOT NULL,
        "inputTokens" integer NOT NULL DEFAULT 0,
        "outputTokens" integer NOT NULL DEFAULT 0,
        "costKzt" double precision NOT NULL DEFAULT 0,
        "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_generation_cost_log" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_generation_cost_log_lessonId" ON "generation_cost_log" ("lessonId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "generation_cost_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lesson_handout_packages"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lesson_handout_packages_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lesson_handouts"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lesson_handouts_handouttype_enum"`);
    await queryRunner.query(`ALTER TABLE "lesson_stages" DROP COLUMN IF EXISTS "linkedToValue"`);
  }
}
