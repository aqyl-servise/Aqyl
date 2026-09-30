import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * teacher.trialDenied — бесплатные уроки по этой почте или номеру уже были
 * получены (оферта, п. 4.2). Решение принималось при регистрации и при
 * подтверждении номера, но нигде не сохранялось, и списание его не видело:
 * повторная регистрация после удаления аккаунта снова давала 5 уроков.
 *
 * Заполнять задним числом нечего: на 29.09.2026 отказов при регистрации не
 * было, а все 7 подтверждённых номеров разные.
 */
export class TrialDenied1788000000000 implements MigrationInterface {
  name = 'TrialDenied1788000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "teacher" ADD COLUMN IF NOT EXISTS "trialDenied" boolean NOT NULL DEFAULT false`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "teacher" DROP COLUMN IF EXISTS "trialDenied"`);
  }
}
