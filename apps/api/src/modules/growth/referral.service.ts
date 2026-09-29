import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomInt } from 'crypto';
import { DataSource } from 'typeorm';
import { BillingService } from '../billing/billing.service';
import { MailService } from '../mail/mail.service';
import { makeUnsubscribeToken, mailLang } from './growth-utils';
import { referralRewardMail } from './nudge-mail';

/** Сколько уроков за приглашённого (решение команды 29.09.2026). */
export const REFERRAL_BONUS = 5;
/** Сколько наград максимум у одного учителя. Больше — только решением администратора. */
export function referralCap(): number {
  const n = Number(process.env.REFERRAL_CAP);
  return Number.isInteger(n) && n > 0 ? n : 10;
}

// Без 0/O, 1/I/L: код диктуют голосом и набирают с листка.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/;

export function newReferralCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/**
 * Приглашения коллег.
 *
 * Награда — за первый ГОТОВЫЙ урок приглашённого, а не за регистрацию:
 * регистрация бесплатна и ничего не стоит подделать. Защиты от второго
 * аккаунта на том же устройстве у нас нет (новая почта получает свои
 * бесплатные уроки), поэтому:
 *  - общее устройство у пригласившего и приглашённого → held, решает
 *    администратор (общий адрес не в счёт: в школе весь коллектив выходит
 *    с одного адреса, а приглашают как раз коллег);
 *  - не больше referralCap() наград на одного учителя.
 *
 * Связь «кто кого пригласил» берётся из teacher.acquisition.ref — код
 * приходит вместе с регистрацией, как utm-метки; модуль авторизации не
 * трогаем.
 */
@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private running = false;

  constructor(
    private readonly db: DataSource,
    private readonly billing: BillingService,
    private readonly mail: MailService,
  ) {}

  /** Код учителя; при первом обращении выдаётся. */
  async ensureCode(teacherId: string): Promise<string> {
    const [row] = await this.db.query(`SELECT "referralCode" FROM teacher WHERE id = $1`, [teacherId]);
    if (!row) throw new NotFoundException();
    if (row.referralCode) return row.referralCode;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const r = await this.db.query(
          `UPDATE teacher SET "referralCode" = $2 WHERE id = $1 AND "referralCode" IS NULL RETURNING "referralCode"`,
          [teacherId, newReferralCode()],
        );
        const rows = Array.isArray(r[0]) ? r[0] : r;
        if (rows.length) return rows[0].referralCode;
        // Параллельный запрос уже выдал код — читаем его.
        const [again] = await this.db.query(`SELECT "referralCode" FROM teacher WHERE id = $1`, [teacherId]);
        if (again?.referralCode) return again.referralCode;
      } catch (err) {
        // Совпадение кода с чужим (уникальный индекс) — пробуем другой.
        if (!/unique|duplicate/i.test((err as Error).message)) throw err;
      }
    }
    throw new Error('Не удалось выдать код приглашения');
  }

  /** Для страницы «Пригласить коллегу». */
  async mine(teacherId: string) {
    const [t] = await this.db.query(`SELECT "registrationSource" FROM teacher WHERE id = $1`, [teacherId]);
    if (!t) throw new NotFoundException();
    if (t.registrationSource !== 'b2c') throw new BadRequestException('Приглашения доступны в личном кабинете учителя');
    const code = await this.ensureCode(teacherId);
    const rows: Array<{ status: string; n: number; lessons: number }> = await this.db.query(
      `SELECT status, count(*)::int AS n, COALESCE(sum(lessons), 0)::int AS lessons
       FROM referrals WHERE "inviterId" = $1 GROUP BY status`,
      [teacherId],
    );
    const by = (s: string) => rows.find((r) => r.status === s)?.n ?? 0;
    return {
      code,
      bonus: REFERRAL_BONUS,
      cap: referralCap(),
      invited: rows.reduce((a, r) => a + r.n, 0),
      // held — тоже «ждёт»: учителю не нужно знать, что его проверяют.
      waiting: by('pending') + by('held'),
      rewarded: by('rewarded'),
      lessonsEarned: rows.reduce((a, r) => a + r.lessons, 0),
    };
  }

  @Cron('*/10 * * * *', { name: 'referrals' })
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.link();
      await this.reward();
    } catch (err) {
      this.logger.error(`Обработка приглашений упала: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** Новые регистрации с кодом приглашения → строка в referrals. */
  async link(): Promise<number> {
    const r = await this.db.query(
      `INSERT INTO referrals ("inviteeId", "inviterId")
       SELECT t.id, i.id FROM teacher t
       JOIN teacher i ON i."referralCode" = upper(trim(t.acquisition->>'ref'))
       WHERE t."registrationSource" = 'b2c' AND t.id <> i.id
         AND lower(t.email) <> lower(i.email)
         AND t."createdAt" > i."createdAt"
       ON CONFLICT ("inviteeId") DO NOTHING
       RETURNING "inviteeId"`,
    );
    const rows = Array.isArray(r[0]) ? r[0] : r;
    if (rows.length) this.logger.log(`Новых приглашённых: ${rows.length}`);
    return rows.length;
  }

  /** Приглашённые с первым готовым уроком → награда, проверка или отказ. */
  async reward(): Promise<void> {
    const due: Array<{ inviteeId: string; inviterId: string; sharedDevice: boolean; inviterOk: boolean; rewarded: number }> =
      await this.db.query(
        `SELECT r."inviteeId", r."inviterId",
           EXISTS (
             SELECT 1 FROM account_signals a JOIN account_signals b
               ON a.kind = 'device' AND b.kind = 'device' AND a.digest = b.digest
             WHERE a."teacherId"::text = r."inviterId"::text AND b."teacherId"::text = r."inviteeId"::text
           ) AS "sharedDevice",
           (i.status = 'active' AND i."deletionRequestedAt" IS NULL) AS "inviterOk",
           (SELECT count(*)::int FROM referrals x WHERE x."inviterId" = r."inviterId" AND x.status = 'rewarded') AS rewarded
         FROM referrals r JOIN teacher i ON i.id = r."inviterId"
         WHERE r.status = 'pending'
           AND EXISTS (SELECT 1 FROM lessons l WHERE l."userId" = r."inviteeId"::text AND l.status = 'ready')
         ORDER BY r."createdAt"`,
      );
    const cap = referralCap();
    const rewardedNow = new Map<string, number>();
    for (const d of due) {
      if (!d.inviterOk) { await this.decide(d.inviteeId, 'declined', 'Пригласивший неактивен или удаляет аккаунт'); continue; }
      if (d.sharedDevice) { await this.decide(d.inviteeId, 'held', 'Общее устройство с пригласившим'); continue; }
      const already = d.rewarded + (rewardedNow.get(d.inviterId) ?? 0);
      if (already >= cap) { await this.decide(d.inviteeId, 'capped', `Достигнут предел: ${cap}`); continue; }
      if (await this.grant(d.inviteeId, 'pending')) rewardedNow.set(d.inviterId, (rewardedNow.get(d.inviterId) ?? 0) + 1);
    }
  }

  private async decide(inviteeId: string, status: 'held' | 'capped' | 'declined', note: string): Promise<void> {
    await this.db.query(
      `UPDATE referrals SET status = $2, note = $3, "decidedAt" = now() WHERE "inviteeId" = $1 AND status = 'pending'`,
      [inviteeId, status, note],
    );
  }

  /**
   * Начисление. Статус меняется условным UPDATE до начисления: повторный
   * запуск (или двойное нажатие в админке) уроки второй раз не начислит.
   */
  private async grant(inviteeId: string, from: 'pending' | 'held' | 'capped'): Promise<boolean> {
    const r = await this.db.query(
      `UPDATE referrals SET status = 'rewarded', lessons = $2, "decidedAt" = now()
       WHERE "inviteeId" = $1 AND status = $3 RETURNING "inviterId"`,
      [inviteeId, REFERRAL_BONUS, from],
    );
    const rows = Array.isArray(r[0]) ? r[0] : r;
    if (!rows.length) return false;
    const inviterId: string = rows[0].inviterId;
    const { balance, expiresAt } = await this.billing.creditPackage(
      inviterId, { code: 'referral', lessons: REFERRAL_BONUS, priceKzt: 0 }, null,
    );
    this.logger.log(`Приглашение: учителю ${inviterId} +${REFERRAL_BONUS} ур. (баланс ${balance})`);
    await this.notify(inviterId, balance, expiresAt);
    return true;
  }

  private async notify(inviterId: string, balance: number, expiresAt: Date): Promise<void> {
    try {
      const [t] = await this.db.query(
        `SELECT email, "preferredLanguage", acquisition, "emailNudgesOff" FROM teacher WHERE id = $1`, [inviterId],
      );
      if (!t || t.emailNudgesOff) return;
      const site = (process.env.FRONTEND_URL ?? 'https://aqyl-service.kz').split(',')[0].trim();
      const unsubscribeUrl = `${site}/api/mail/unsubscribe?t=${makeUnsubscribeToken(inviterId)}`;
      const m = referralRewardMail({ lang: mailLang(t), lessons: REFERRAL_BONUS, balance, expiresAt, unsubscribeUrl });
      await this.mail.sendNudge({ email: t.email, subject: m.subject, html: m.html, text: m.text, unsubscribeUrl, tag: 'referralReward' });
    } catch (err) {
      // Уроки уже начислены; письмо — только уведомление.
      this.logger.error(`Письмо о награде за приглашение не ушло: ${(err as Error).message}`);
    }
  }

  // ── админка ─────────────────────────────────────────────────────────────

  async adminOverview() {
    const [totals] = await this.db.query(
      `SELECT count(*)::int AS invited,
              count(*) FILTER (WHERE status = 'pending')::int AS pending,
              count(*) FILTER (WHERE status = 'rewarded')::int AS rewarded,
              count(*) FILTER (WHERE status IN ('held', 'capped'))::int AS review,
              COALESCE(sum(lessons), 0)::int AS lessons
       FROM referrals`,
    );
    const review = await this.db.query(
      `SELECT r."inviteeId", r.status, r.note, r."createdAt",
              i.email AS "inviterEmail", e.email AS "inviteeEmail"
       FROM referrals r JOIN teacher i ON i.id = r."inviterId" JOIN teacher e ON e.id = r."inviteeId"
       WHERE r.status IN ('held', 'capped') ORDER BY r."createdAt" DESC LIMIT 100`,
    );
    const top = await this.db.query(
      `SELECT i.email, count(*)::int AS invited,
              count(*) FILTER (WHERE r.status = 'rewarded')::int AS rewarded
       FROM referrals r JOIN teacher i ON i.id = r."inviterId"
       GROUP BY i.email ORDER BY invited DESC LIMIT 10`,
    );
    return { totals, review, top, bonus: REFERRAL_BONUS, cap: referralCap() };
  }

  async adminApprove(inviteeId: string): Promise<{ ok: boolean }> {
    const [r] = await this.db.query(`SELECT status FROM referrals WHERE "inviteeId" = $1`, [inviteeId]);
    if (!r) throw new NotFoundException();
    if (r.status !== 'held' && r.status !== 'capped') throw new BadRequestException('Начислить можно только приглашение на проверке');
    return { ok: await this.grant(inviteeId, r.status) };
  }

  async adminDecline(inviteeId: string): Promise<{ ok: boolean }> {
    const r = await this.db.query(
      `UPDATE referrals SET status = 'declined', "decidedAt" = now(), note = coalesce(note || ' · ', '') || 'отклонено администратором'
       WHERE "inviteeId" = $1 AND status IN ('held', 'capped') RETURNING "inviteeId"`,
      [inviteeId],
    );
    const rows = Array.isArray(r[0]) ? r[0] : r;
    return { ok: rows.length > 0 };
  }
}
