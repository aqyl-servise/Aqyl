import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { trialLessonLimit } from '../billing/subscription.service';
import { activationMail, trialEndMail, NudgeMail } from './nudge-mail';
import { makeUnsubscribeToken, mailLang } from './growth-utils';

export type NudgeKind = 'activation' | 'trialEnd';

interface Candidate {
  id: string;
  email: string;
  fullName: string | null;
  preferredLanguage: string | null;
  acquisition: Record<string, string> | null;
  /** activation — сколько бесплатных осталось; trialEnd — сколько уроков сделано. */
  n: number;
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
      if (a.sent || t.sent) this.logger.log(`Подсказки: активация ${a.sent}, конец бесплатных ${t.sent}`);
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
    const lang = mailLang(c);
    const m = kind === 'activation'
      ? activationMail({ lang, fullName: c.fullName, freeLessons: c.n, unsubscribeUrl })
      : trialEndMail({ lang, fullName: c.fullName, lessonsMade: c.n, unsubscribeUrl });
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
  startBacklog(): { started: boolean } {
    // Флаг — до первой асинхронной операции: двойное нажатие не запустит две рассылки.
    if (this.running) throw new Error('Рассылка уже идёт');
    this.running = true;
    this.progress = { kind: 'activation', total: 0, sent: 0, failed: 0, startedAt: new Date().toISOString(), finishedAt: null };
    void (async () => {
      try {
        const list = await this.candidates('activation', { maxAgeDays: null });
        await this.deliver('activation', list);
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

  /** Предпросмотр письма для админки: как увидит его учитель. */
  preview(kind: NudgeKind, lang: 'ru' | 'kz'): NudgeMail {
    const unsubscribeUrl = '#';
    return kind === 'activation'
      ? activationMail({ lang, fullName: null, freeLessons: trialLessonLimit(), unsubscribeUrl })
      : trialEndMail({ lang, fullName: null, lessonsMade: trialLessonLimit(), unsubscribeUrl });
  }
}
