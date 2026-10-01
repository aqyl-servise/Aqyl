import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Какие события пишем. Остальные шаги воронки уже есть в базе:
 * регистрация и онбординг — teacher, черновик/генерация/готовый урок —
 * lessons, оплата — payments.
 */
export type FunnelEvent =
  | 'generator_opened'        // открыл форму нового урока (клиент)
  | 'export_plan'             // скачал план в Word (сервер)
  | 'export_handouts'         // скачал раздатку PDF (сервер)
  | 'export_presentation'     // скачал презентацию PDF (сервер)
  | 'lesson_shared';          // поделился уроком ссылкой (сервер)

/** Что разрешено присылать с клиента. Скачивания пишет только сервер. */
export const CLIENT_EVENTS: readonly FunnelEvent[] = ['generator_opened'];

/**
 * С этой даты события пишутся. Для учителей, зарегистрированных раньше,
 * шаги «открыл форму» и «скачал» неполны: что было до неё, не восстановить.
 */
export const FUNNEL_TRACKING_SINCE = '2026-10-01';

/** Повтор того же события тем же учителем по тому же уроку в пределах окна не пишется. */
const DEDUP_MINUTES = 30;

export interface FunnelWeek {
  week: string;
  /** Неделя целиком после начала записи — шаги opened/exported достоверны. */
  tracked: boolean;
  registered: number;
  onboarded: number;
  opened: number;
  drafted: number;
  started: number;
  ready: number;
  exported: number;
  second: number;
  paid: number;
}

@Injectable()
export class FunnelService {
  private readonly logger = new Logger(FunnelService.name);

  constructor(private readonly db: DataSource) {}

  /**
   * Записать событие. Никогда не бросает: сбой учёта не должен ломать
   * скачивание или открытие формы.
   */
  async record(teacherId: string, event: FunnelEvent, lessonId?: string | null): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO funnel_events ("teacherId", event, "lessonId")
         SELECT $1, $2, $3
         WHERE NOT EXISTS (
           SELECT 1 FROM funnel_events
           WHERE "teacherId" = $1 AND event = $2 AND "lessonId" IS NOT DISTINCT FROM $3
             AND "createdAt" > now() - make_interval(mins => $4)
         )`,
        [teacherId, event, lessonId ?? null, DEDUP_MINUTES],
      );
    } catch (err) {
      this.logger.warn(`Событие ${event} не записано: ${(err as Error).message}`);
    }
  }

  /** Лесенка по неделям регистрации B2C: сколько учителей дошли до каждого шага. */
  async weekly(weeks: number): Promise<{ since: string; weeks: FunnelWeek[]; total: FunnelWeek; exports: Record<string, number> }> {
    const rows: Array<Record<string, string | number>> = await this.db.query(
      `WITH t AS (
         SELECT id, date_trunc('week', "createdAt")::date AS wk, "onboardingCompleted" AS onb
         FROM teacher WHERE "registrationSource" = 'b2c'
           AND ($1::int = 0 OR "createdAt" > date_trunc('week', now()) - make_interval(weeks => $1))
       ),
       l AS (
         SELECT "userId",
                count(*) AS total,
                count(*) FILTER (WHERE status IN ('generating', 'ready', 'error') OR "trialCounted" OR "paidCounted") AS started,
                count(*) FILTER (WHERE status = 'ready') AS ready
         FROM lessons GROUP BY "userId"
       ),
       e AS (
         SELECT "teacherId",
                bool_or(event = 'generator_opened') AS opened,
                bool_or(event LIKE 'export_%') AS exported
         FROM funnel_events GROUP BY "teacherId"
       ),
       p AS (SELECT DISTINCT "teacherId"::text AS tid FROM payments WHERE status = 'paid')
       SELECT t.wk::text AS week,
              count(*)::int AS registered,
              count(*) FILTER (WHERE t.onb)::int AS onboarded,
              count(*) FILTER (WHERE e.opened)::int AS opened,
              count(*) FILTER (WHERE l.total > 0)::int AS drafted,
              count(*) FILTER (WHERE l.started > 0)::int AS started,
              count(*) FILTER (WHERE l.ready > 0)::int AS ready,
              count(*) FILTER (WHERE e.exported)::int AS exported,
              count(*) FILTER (WHERE l.ready >= 2)::int AS second,
              count(*) FILTER (WHERE p.tid IS NOT NULL)::int AS paid
       FROM t
       LEFT JOIN l ON l."userId" = t.id::text
       LEFT JOIN e ON e."teacherId" = t.id
       LEFT JOIN p ON p.tid = t.id::text
       GROUP BY t.wk ORDER BY t.wk DESC`,
      [Math.max(0, Math.min(104, Math.floor(weeks)))],
    );
    const list: FunnelWeek[] = rows.map((r) => ({
      week: String(r.week),
      tracked: String(r.week) >= FUNNEL_TRACKING_SINCE_WEEK,
      registered: Number(r.registered), onboarded: Number(r.onboarded), opened: Number(r.opened),
      drafted: Number(r.drafted), started: Number(r.started), ready: Number(r.ready),
      exported: Number(r.exported), second: Number(r.second), paid: Number(r.paid),
    }));
    const keys = ['registered', 'onboarded', 'opened', 'drafted', 'started', 'ready', 'exported', 'second', 'paid'] as const;
    const total = { week: 'всего', tracked: list.every((w) => w.tracked) } as FunnelWeek;
    for (const k of keys) (total as unknown as Record<string, number>)[k] = list.reduce((a, w) => a + w[k], 0);

    const ex: Array<{ event: string; n: number }> = await this.db.query(
      `SELECT event, count(DISTINCT "teacherId")::int AS n FROM funnel_events WHERE event LIKE 'export_%' GROUP BY event`,
    );
    return { since: FUNNEL_TRACKING_SINCE, weeks: list, total, exports: Object.fromEntries(ex.map((x) => [x.event, x.n])) };
  }
}

/**
 * Понедельник недели, начиная с которой шаги opened/exported полные:
 * неделя, в которую попала дата начала записи, неполна, поэтому берём
 * следующий понедельник после неё (или её саму, если это понедельник).
 */
const FUNNEL_TRACKING_SINCE_WEEK = (() => {
  const d = new Date(`${FUNNEL_TRACKING_SINCE}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 — понедельник
  if (dow) d.setUTCDate(d.getUTCDate() + (7 - dow));
  return d.toISOString().slice(0, 10);
})();
