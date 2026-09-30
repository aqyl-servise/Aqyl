import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * События воронки активации, которых нет в других таблицах: открыл форму
 * урока, скачал результат. Остальные шаги (регистрация, онбординг, черновик,
 * запуск генерации, готовый урок, оплата) уже лежат в teacher/lessons/payments.
 *
 * Пишется в нашу базу, а не во внешнюю аналитику: сторонний сервис — новый
 * получатель данных учителей (Политика, перечень получателей, трансграничная
 * передача), а все шаги воронки и так происходят в нашем приложении.
 */
export class FunnelEvents1788200000000 implements MigrationInterface {
  name = 'FunnelEvents1788200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "funnel_events" (
        "id" bigserial PRIMARY KEY,
        "teacherId" uuid NOT NULL,
        "event" varchar(40) NOT NULL,
        "lessonId" uuid,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_funnel_events_teacher_event" ON "funnel_events" ("teacherId", "event")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "funnel_events"`);
  }
}
