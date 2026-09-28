import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { SubscriptionService } from '../billing/subscription.service';

/** Таблицы с фоновой генерацией: у всех status generating/ready/error и updatedAt. */
const GEN_TABLES = [
  { table: 'lessons', label: 'планы уроков' },
  { table: 'lesson_handout_packages', label: 'раздатка' },
  { table: 'lesson_presentations', label: 'презентации' },
  { table: 'literacy_sets', label: 'функциональная грамотность' },
] as const;

/** Окно, в котором считаем сбои. */
const WINDOW_MIN = 30;
/** Генерация дольше этого считается прерванной: процесс перезапустился посреди работы. */
const STUCK_MIN = 20;
/** Сколько сбоев за окно — уже не случайность, а поломка. */
const FAIL_THRESHOLD = 3;
/** Не чаще одного письма за этот срок: при поломке сбои идут потоком. */
const REPEAT_HOURS = 2;

/**
 * Наблюдение за генерацией.
 *
 * 11–14 сентября 2026 ключ модели был недействителен, генерация падала у всех
 * (79 сбоев), и несколько дней этого никто не замечал: узнали от учителей.
 * Теперь раз в 10 минут считаем сбои, и если их больше порога — письмо команде.
 *
 * Заодно закрываем прерванные генерации. Генерация идёт в фоне того же
 * процесса; перезапуск (каждый деплой) обрывает её, и запись навсегда
 * остаётся в статусе generating: учитель видит вечное «генерируется», а
 * списанный бесплатный урок не возвращается. Такие записи переводим в error
 * — учитель может запустить заново — и возвращаем урок, как при обычном сбое.
 *
 * Процесс один (pm2 fork), поэтому блокировка между экземплярами не нужна;
 * см. RetentionService.
 */
@Injectable()
export class OpsAlertService {
  private readonly logger = new Logger(OpsAlertService.name);
  private lastAlertAt = 0;

  constructor(
    private readonly db: DataSource,
    private readonly mail: MailService,
    private readonly subscription: SubscriptionService,
  ) {}

  /** Кому слать. OPS_ALERT_EMAILS — через запятую; по умолчанию рабочая почта. */
  private recipients(): string[] {
    const raw = process.env.OPS_ALERT_EMAILS ?? process.env.SUPPORT_EMAIL ?? 'aqylservise@gmail.com';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  @Cron('*/10 * * * *', { name: 'generation-watch' })
  async watch(): Promise<void> {
    try {
      await this.closeStuck();
    } catch (err) {
      this.logger.error(`Не удалось закрыть прерванные генерации: ${(err as Error).message}`);
    }
    try {
      await this.checkFailures();
    } catch (err) {
      this.logger.error(`Проверка сбоев генерации упала: ${(err as Error).message}`);
    }
  }

  /** Прерванные генерации → error; для планов уроков — возврат списанного урока. */
  async closeStuck(): Promise<number> {
    let closed = 0;
    for (const { table } of GEN_TABLES) {
      const msg = table === 'lessons'
        ? 'Генерация прервалась на сервере. Запустите её ещё раз — урок не списан.'
        : 'Генерация прервалась на сервере. Запустите её ещё раз.';
      const rows: Array<{ id: string; userId?: string }> = await this.db.query(
        `UPDATE "${table}" SET status = 'error', "generationError" = $1
         WHERE status = 'generating' AND "updatedAt" < now() - make_interval(mins => $2)
         RETURNING id${table === 'lessons' ? ', "userId"' : ''}`,
        [msg, STUCK_MIN],
      ).then((r: unknown) => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : r) as Array<{ id: string; userId?: string }>);
      closed += rows.length;
      if (table !== 'lessons') continue;
      for (const r of rows) {
        try {
          await this.subscription.refundLessonStart(r.userId!, r.id);
        } catch (err) {
          this.logger.error(`Урок ${r.id}: возврат после прерывания не удался: ${(err as Error).message}`);
        }
      }
    }
    if (closed) this.logger.warn(`Закрыто прерванных генераций: ${closed}`);
    return closed;
  }

  async checkFailures(): Promise<void> {
    const lines: string[] = [];
    let failed = 0;
    const samples = new Set<string>();

    for (const { table, label } of GEN_TABLES) {
      const [row] = await this.db.query(
        `SELECT count(*) FILTER (WHERE status = 'error')::int AS err,
                count(*) FILTER (WHERE status = 'ready')::int AS ok
         FROM "${table}" WHERE "updatedAt" > now() - make_interval(mins => $1)`,
        [WINDOW_MIN],
      );
      if (!row || row.err === 0) continue;
      failed += row.err;
      lines.push(`${label}: сбоев ${row.err}, успешно ${row.ok}`);
      const errs: Array<{ e: string | null }> = await this.db.query(
        `SELECT DISTINCT left("generationError", 200) AS e FROM "${table}"
         WHERE status = 'error' AND "updatedAt" > now() - make_interval(mins => $1) LIMIT 3`,
        [WINDOW_MIN],
      );
      errs.forEach((x) => x.e && samples.add(x.e));
    }

    if (failed < FAIL_THRESHOLD) return;
    if (Date.now() - this.lastAlertAt < REPEAT_HOURS * 3600_000) return;
    this.lastAlertAt = Date.now();

    const text =
      `За последние ${WINDOW_MIN} минут генерация падала ${failed} раз.\n\n` +
      lines.join('\n') +
      (samples.size ? `\n\nТексты ошибок:\n- ${[...samples].join('\n- ')}` : '') +
      `\n\nСписанные уроки учителям возвращаются автоматически, но пока причина не устранена, ` +
      `каждая попытка заканчивается ошибкой. Частые причины: закончился баланс или истёк ключ ` +
      `Anthropic (console.anthropic.com), недоступен сервис модели.\n\n` +
      `Следующее письмо — не раньше чем через ${REPEAT_HOURS} ч, если сбои продолжатся.`;
    await this.mail.sendOpsAlert(this.recipients(), `Aqyl: сбои генерации — ${failed} за ${WINDOW_MIN} мин`, text);
  }
}
