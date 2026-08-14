import { MigrationInterface, QueryRunner } from 'typeorm';

/** Таблица презентаций по плану урока (ТЗ 2.0). IF NOT EXISTS для совместимости. */
export class Presentation1786700000000 implements MigrationInterface {
  name = 'Presentation1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "lesson_presentations_status_enum" AS ENUM ('generating','ready','error');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lesson_presentations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "lessonId" character varying NOT NULL,
        "status" "lesson_presentations_status_enum" NOT NULL DEFAULT 'generating',
        "slides" jsonb,
        "generationCost" double precision NOT NULL DEFAULT 0,
        "generationError" text,
        "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lesson_presentations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lesson_presentations_lessonId" ON "lesson_presentations" ("lessonId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "lesson_presentations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lesson_presentations_status_enum"`);
  }
}
