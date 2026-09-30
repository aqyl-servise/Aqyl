import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { lessonsBeforePhone, requirePhoneVerification, trialLessonLimit } from '../billing/subscription.service';
import { activationMail, phoneGateMail, trialEndMail, NudgeMail } from './nudge-mail';
import { makeUnsubscribeToken, mailLang } from './growth-utils';

export type NudgeKind = 'activation' | 'trialEnd' | 'phoneGate';

interface Candidate {
  id: string;
  email: string;
  fullName: string | null;
  preferredLanguage: string | null;
  acquisition: Record<string, string> | null;
  /** activation/phoneGate — сколько бесплатных осталось; trialEnd — сколько уроков сделано. */
  n: number;
  /** phoneGate — сколько готовых уроков уже сделано. */
  made?: number;
}

/**
 * За один запуск — не больше стольких писем. Рассылка идёт через Resend,
 * у которого есть суточный лимит; квитанции об оплате не должны упереться в
 * него из-за подсказок.
 */
const BATCH_LIMIT = 80;
/** Пауза между письмами: Resend принимает не больше пары запросов в секунду. */
const SEND_GAP_MS = 700;

/**
 * Письма-подсказки B2C-учителям. Каждое уходит один раз (teacher.nudges).
 *
 * На 28.09.2026 из 113 зарегистрированных 89 не получили ни одного готового
 * урока: 60 прошли онбординг и остановились, у 13 урок остался черновиком.
 * Напоминания об этом не было никакого.
 *
 * - activation: прошли сутки после регистрации, готовых уроков нет.
 *   Автоматически — только для зарегистрированных за последние 7 дней. Тем,
 *   кто пришёл раньше, письмо отправляет администратор кнопкой в админке:
 *   письмо человеку, зарегистрировавшемуся месяц назад, — решение, а не
 *   побочный эффект деплоя.
 * - trialEnd: бесплатные уроки израсходованы (от суток до 14 дней назад),
 *   покупок и платного баланса нет.
 * - phoneGate: первый урок готов, дальше бесплатные требуют подтверждённого
 *   номера, а номера нет (01.10.2026 таких 18). Сами — если готовый урок
 *   был от суток до 14 дней назад; раньше — по кнопке.
 *
 * Не пишем: отписавшимся, удаляющим аккаунт, неактивным и адресам, с которых
 * почта возвращалась (email_bounces) — повторная отправка на такой адрес
 * портит репутацию домена.
 */
@Injectable()
export class NudgeService {
  private readonly logger = new Logger(NudgeService.name);
  private running = false;

  constructor(
    private readonly db: DataSource,
    private readonly mail: MailService,
  ) {}

  /** 11:00 — рабочее время учителя, не во время первых уроков. */
  @Cron('0 11 * * *', { name: 'nudges' })
  async daily(): Promise<void> {
    try {
      const a = await this.send('activation', { maxAgeDays: 7 });
      const t = await this.send('trialEnd', {});
      const g = await this.send('phoneGate', { maxAgeDays: 14 });
      if (a.sent || t.sent || g.sent) this.logger.log(`Подсказки: активация ${a.sent}, конец бесплатных ${t.sent}, номер ${g.sent}`);
    } catch (err) {
      this.logger.error(`Рассылка подсказок упала: ${(err as Error).message}`);
    }
  }

  private baseFilter(kind: NudgeKind): string {
    return `t."registrationSource" = 'b2c' AND t.status = 'active'
      AND t."emailNudgesOff" = false AND t."deletionRequestedAt" IS NULL
      -- Отказано в бесплатных уроках (п. 4.2) — письмо «у вас 5 бесплатных» было бы неправдой.
      AND t."trialDenied" = false
      AND NOT (t.nudges ? '${kind}')
      AND NOT EXISTS (SELECT 1 FROM email_bounces b WHERE lower(b.email) = lower(t.email))`;
  }

  async candidates(kind: NudgeKind, opts: { maxAgeDays?: number | null }): Promise<Candidate[]> {
    const limit = trialLessonLimit();
    const cols = `t.id, t.email, t."fullName", t."preferredLanguage", t.acquisition`;
    if (kind === 'activation') {
      const params: unknown[] = [limit];
      let age = '';
      if (opts.maxAgeDays) {
        params.push(opts.maxAgeDays);
        age = `AND t."createdAt" > now() - make_interval(days => $2)`;
      }
      return this.db.query(
        `SELECT ${cols}, $1::int - (SELECT count(*) FROM lessons l WHERE l."userId" = t.id::text AND l."trialCounted")::int AS n
         FROM teacher t
         WHERE ${this.baseFilter(kind)}
           AND t."createdAt" < now() - interval '24 hours' ${age}
           AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l."userId" = t.id::text AND l.status = 'ready')
           AND $1::int - (SELECT count(*) FROM lessons l WHERE l."userId" = t.id::text AND l."trialCounted")::int > 0
         ORDER BY t."createdAt" DESC`,
        params,
      );
    }
    if (kind === 'phoneGate') {
      // Защита выключена — ворот нет, и письмо было бы неправдой.
      if (!requirePhoneVerification()) return [];
      // Упёрся в номер только тот, кто израсходовал уроки, доступные без него
      // (LESSONS_BEFORE_PHONE). Кому номер ещё не нужен, письмо было бы неправдой.
      const params: unknown[] = [limit, lessonsBeforePhone()];
      let age = '';
      if (opts.maxAgeDays) {
        params.push(opts.maxAgeDays);
        age = `AND x.last_ready > now() - make_interval(days => $3)`;
      }
      return this.db.query(
        `SELECT ${cols}, $1::int - x.used AS n, x.made FROM teacher t
         CROSS JOIN LATERAL (
           SELECT count(*) FILTER (WHERE l."trialCounted")::int AS used,
                  count(*) FILTER (WHERE l.status = 'ready')::int AS made,
                  max(l."updatedAt") FILTER (WHERE l.status = 'ready') AS last_ready
           FROM lessons l WHERE l."userId" = t.id::text
         ) x
         WHERE ${this.baseFilter(kind)}
           AND t."phoneVerifiedAt" IS NULL
           AND x.made > 0 AND x.used < $1 AND x.used >= $2
           AND x.last_ready < now() - interval '24 hours' ${age}
           AND COALESCE(t."paidLessonsBalance", 0) = 0
           AND NOT EXISTS (SELECT 1 FROM payments p WHERE p."teacherId"::text = t.id::text AND p.status = 'paid')
         ORDER BY x.last_ready DESC`,
        params,
      );
    }
    return this.db.query(
      `SELECT ${cols}, x.made AS n FROM teacher t
       CROSS JOIN LATERAL (
         SELECT count(*) FILTER (WHERE l."trialCounted")::int AS used,
                count(*) FILTER (WHERE l.status = 'ready')::int AS made,
                max(l."createdAt") FILTER (WHERE l."trialCounted") AS last_trial
         FROM lessons l WHERE l."userId" = t.id::text
       ) x
       WHERE ${this.baseFilter(kind)}
         AND x.used >= $1 AND x.made > 0
         AND x.last_trial < now() - interval '24 hours'
         AND x.last_trial > now() - interval '14 days'
         AND COALESCE(t."paidLessonsBalance", 0) = 0
         AND NOT EXISTS (SELECT 1 FROM payments p WHERE p."teacherId"::text = t.id::text AND p.status = 'paid')
         AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s."teacherId"::text = t.id::text AND s.status = 'active')
       ORDER BY x.last_trial DESC`,
      [limit],
    );
  }

  private compose(kind: NudgeKind, c: Candidate): NudgeMail & { unsubscribeUrl: string } {
    const site = (process.env.FRONTEND_URL ?? 'https://aqyl-service.kz').split(',')[0].trim();
    const unsubscribeUrl = `${site}/api/mail/unsubscribe?t=${makeUnsubscribeToken(c.id)}`;
    const m = mailFor(kind, mailLang(c), c.fullName, c.n, unsubscribeUrl, c.made);
    return { ...m, unsubscribeUrl };
  }

  /** Отправка по списку кандидатов. dryRun — только посчитать. */
  async send(kind: NudgeKind, opts: { maxAgeDays?: number | null; dryRun?: boolean }): Promise<{ total: number; sent: number; failed: number }> {
    const list = await this.candidates(kind, opts);
    if (opts.dryRun || !list.length) return { total: list.length, sent: 0, failed: 0 };
    // Кнопка в админке и утренний запуск не должны слать параллельно одному и тому же учителю.
    if (this.running) throw new Error('Рассылка уже идёт');
    this.running = true;
    try {
      return await this.deliver(kind, list);
    } finally {
      this.running = false;
    }
  }

  /**
   * Запуск рассылки из админки — в фоне. Письмо уходит за 3–4 секунды, партия
   * из 80 — за несколько минут, а nginx рвёт ответ через 60 секунд: 29.09 админ
   * увидел 504, хотя письма уходили. Теперь запрос возвращается сразу, а
   * админка опрашивает ход рассылки (getProgress).
   */
  startBacklog(kind: 'activation' | 'phoneGate' = 'activation'): { started: boolean } {
    // Флаг — до первой асинхронной операции: двойное нажатие не запустит две рассылки.
    if (this.running) throw new Error('Рассылка уже идёт');
    this.running = true;
    this.progress = { kind, total: 0, sent: 0, failed: 0, startedAt: new Date().toISOString(), finishedAt: null };
    void (async () => {
      try {
        const list = await this.candidates(kind, { maxAgeDays: null });
        await this.deliver(kind, list);
      } catch (err) {
        this.logger.error(`Рассылка по кнопке упала: ${(err as Error).message}`);
      } finally {
        this.running = false;
        this.progress.finishedAt = new Date().toISOString();
      }
    })();
    return { started: true };
  }

  /** Ход последней рассылки — для админки. */
  getProgress() {
    return { running: this.running, last: this.progress };
  }

  private progress: {
    kind: NudgeKind; total: number; sent: number; failed: number; startedAt: string; finishedAt: string | null;
  } = { kind: 'activation', total: 0, sent: 0, failed: 0, startedAt: '', finishedAt: null };

  /** Сама отправка партии. Флаг running выставляет вызывающий. */
  private async deliver(kind: NudgeKind, list: Candidate[]): Promise<{ total: number; sent: number; failed: number }> {
    const batch = list.slice(0, BATCH_LIMIT);
    this.progress = { kind, total: batch.length, sent: 0, failed: 0, startedAt: new Date().toISOString(), finishedAt: null };
    for (const c of batch) {
      const m = this.compose(kind, c);
      try {
        await this.mail.sendNudge({ email: c.email, subject: m.subject, html: m.html, text: m.text, unsubscribeUrl: m.unsubscribeUrl, tag: kind });
        await this.db.query(
          `UPDATE teacher SET nudges = nudges || jsonb_build_object($2::text, now()::text) WHERE id = $1`,
          [c.id, kind],
        );
        this.progress.sent++;
      } catch (err) {
        this.progress.failed++;
        this.logger.error(`Подсказка ${kind} учителю ${c.id} не ушла: ${(err as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, SEND_GAP_MS));
    }
    this.progress.finishedAt = new Date().toISOString();
    return { total: list.length, sent: this.progress.sent, failed: this.progress.failed };
  }

  /**
   * Тестовое письмо на произвольный адрес — тем же путём и с теми же
   * заголовками, что настоящее, чтобы проверка попадания во «Входящие» была
   * честной. Ссылка отписки — нерабочая заглушка: адрес не учительский.
   */
  async sendTest(kind: NudgeKind, lang: 'ru' | 'kz', email: string): Promise<void> {
    const site = (process.env.FRONTEND_URL ?? 'https://aqyl-service.kz').split(',')[0].trim();
    const unsubscribeUrl = `${site}/api/mail/unsubscribe?t=test`;
    const m = mailFor(kind, lang, null, sampleN(kind), unsubscribeUrl);
    await this.mail.sendNudge({ email, subject: m.subject, html: m.html, text: m.text, unsubscribeUrl, tag: `test:${kind}` });
  }

  /** Предпросмотр письма для админки: как увидит его учитель. */
  preview(kind: NudgeKind, lang: 'ru' | 'kz'): NudgeMail {
    return mailFor(kind, lang, null, sampleN(kind), '#');
  }
}

/** Одно место, где вид письма выбирается по его типу. */
function mailFor(kind: NudgeKind, lang: 'ru' | 'kz', fullName: string | null, n: number, unsubscribeUrl: string, made?: number): NudgeMail {
  if (kind === 'activation') return activationMail({ lang, fullName, freeLessons: n, unsubscribeUrl });
  if (kind === 'phoneGate') {
    return phoneGateMail({ lang, fullName, freeLessons: n, lessonsMade: made ?? lessonsBeforePhone(), unsubscribeUrl });
  }
  return trialEndMail({ lang, fullName, lessonsMade: n, unsubscribeUrl });
}

/** Число для предпросмотра: как у типичного адресата этого письма. */
function sampleN(kind: NudgeKind): number {
  return kind === 'phoneGate' ? Math.max(1, trialLessonLimit() - lessonsBeforePhone()) : trialLessonLimit();
}
