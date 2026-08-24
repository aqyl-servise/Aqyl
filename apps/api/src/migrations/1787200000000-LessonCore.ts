import { MigrationInterface, QueryRunner } from 'typeorm';

/** LessonCore — единый паспорт урока (ТЗ 1.6, этап 2). */
export class LessonCore1787200000000 implements MigrationInterface {
  name = 'LessonCore1787200000000';
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "core" jsonb NULL`);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "lessons" DROP COLUMN IF EXISTS "core"`);
  }
}
