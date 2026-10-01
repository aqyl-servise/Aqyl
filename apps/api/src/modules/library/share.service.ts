import { Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { DataSource } from 'typeorm';
import { LessonPlansService } from '../lesson-plans/lesson-plans.service';
import { ReferralService } from '../growth/referral.service';
import { FunnelService } from '../funnel/funnel.service';
import { planOf, PublicPlan } from './library.service';

// Без похожих знаков: ссылку иногда диктуют или перепечатывают.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const TOKEN_RE = /^[a-hjkmnp-z2-9]{10}$/;

function newToken(): string {
  let s = '';
  for (let i = 0; i < 10; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

export interface SharedPlan {
  lang: 'ru' | 'kz';
  subject: string;
  grade: number | null;
  topic: string;
  /** Код приглашения автора — кнопка «Сделать такой же» ведёт на регистрацию с ним. */
  ref: string | null;
  plan: NonNullable<PublicPlan['plan']>;
}

/**
 * «Поделиться уроком»: учитель отправляет готовый план коллеге.
 *
 * Учителя пересылают друг другу материалы в школьных чатах, и это главный
 * канал, который у нас есть кроме поиска. Страница по ссылке показывает план
 * и ведёт на регистрацию с кодом приглашения автора: зарегистрировался
 * коллега и сделал урок — автору +5 уроков (ReferralService).
 *
 * Что видно по ссылке: предмет, класс, тема и план. Имя учителя, дата,
 * номер урока и число учеников — нет. Ссылку можно отозвать.
 */
@Injectable()
export class ShareService {
  constructor(
    private readonly db: DataSource,
    private readonly lessonPlans: LessonPlansService,
    private readonly referrals: ReferralService,
    private readonly funnel: FunnelService,
  ) {}

  /** Ссылка на свой готовый урок; повторный вызов возвращает ту же ссылку. */
  async share(lessonId: string, teacherId: string): Promise<{ token: string }> {
    // Проверка владения и готовности — через обычное чтение урока владельцем.
    const l = await this.lessonPlans.getOne(lessonId, { userId: teacherId, schoolId: null });
    if (l.status !== 'ready') throw new NotFoundException('Поделиться можно только готовым уроком');

    const [existing] = await this.db.query(
      `SELECT token FROM lesson_shares WHERE "lessonId" = $1`, [lessonId],
    );
    if (existing) {
      await this.db.query(`UPDATE lesson_shares SET "revokedAt" = NULL WHERE "lessonId" = $1`, [lessonId]);
      return { token: existing.token };
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const token = newToken();
      const r = await this.db.query(
        `INSERT INTO lesson_shares (token, "lessonId", "teacherId") VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING RETURNING token`,
        [token, lessonId, teacherId],
      );
      if (r.length) {
        void this.funnel.record(teacherId, 'lesson_shared', lessonId);
        return { token };
      }
      // Совпал токен или параллельный запрос уже создал ссылку на этот урок.
      const [again] = await this.db.query(`SELECT token FROM lesson_shares WHERE "lessonId" = $1`, [lessonId]);
      if (again) return { token: again.token };
    }
    throw new Error('Не удалось создать ссылку');
  }

  async revoke(lessonId: string, teacherId: string): Promise<{ ok: boolean }> {
    await this.db.query(
      `UPDATE lesson_shares SET "revokedAt" = now() WHERE "lessonId" = $1 AND "teacherId" = $2`,
      [lessonId, teacherId],
    );
    return { ok: true };
  }

  /** Публичное чтение по ссылке. */
  async open(token: string): Promise<SharedPlan> {
    if (!TOKEN_RE.test(token)) throw new NotFoundException();
    const [row] = await this.db.query(
      `SELECT s."lessonId", s."teacherId", t."registrationSource"
       FROM lesson_shares s JOIN teacher t ON t.id = s."teacherId"
       WHERE s.token = $1 AND s."revokedAt" IS NULL AND t.status = 'active'`,
      [token],
    );
    if (!row) throw new NotFoundException();
    let l;
    try {
      l = await this.lessonPlans.getOne(row.lessonId, { userId: row.teacherId, schoolId: null });
    } catch {
      throw new NotFoundException();
    }
    if (l.status !== 'ready') throw new NotFoundException();
    await this.db.query(`UPDATE lesson_shares SET views = views + 1 WHERE token = $1`, [token]);

    // Код приглашения — только у учителей B2C: у школьных учителей рефералки нет.
    let ref: string | null = null;
    if (row.registrationSource === 'b2c') {
      try { ref = await this.referrals.ensureCode(row.teacherId); } catch { ref = null; }
    }
    return {
      lang: l.language === 'kz' ? 'kz' : 'ru',
      subject: l.subject ?? '',
      grade: l.grade ?? null,
      topic: l.lessonTitle ?? '',
      ref,
      plan: planOf(l, l.learningObjectives ?? []),
    };
  }
}
