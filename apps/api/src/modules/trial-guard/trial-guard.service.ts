import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { createHmac } from 'node:crypto';
import { TrialFingerprint } from './entities/trial-fingerprint.entity';

/** Срок хранения отпечатков — 3 года. */
const RETENTION_YEARS = 3;

@Injectable()
export class TrialGuardService implements OnModuleInit {
  private readonly logger = new Logger(TrialGuardService.name);

  constructor(
    @InjectRepository(TrialFingerprint) private readonly repo: Repository<TrialFingerprint>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get<string>('TRIAL_FINGERPRINT_KEY')) {
      // Без ключа отпечатки не считаются и пробный период выдаётся всем —
      // это осознанное поведение (не роняем сервис), но о нём надо знать.
      this.logger.warn(
        'TRIAL_FINGERPRINT_KEY не задан — защита пробного периода отключена, триал будет выдаваться при каждой регистрации',
      );
    }
  }

  private get key(): string | null {
    return this.config.get<string>('TRIAL_FINGERPRINT_KEY') || null;
  }

  /**
   * Приведение адреса почты к единому виду до вычисления отпечатка.
   * Для gmail.com и googlemail.com точки в локальной части незначащие, а всё
   * после «плюса» — метка: без нормализации один и тот же ящик дал бы
   * бесконечное число разных отпечатков.
   */
  static normalizeEmail(raw: string): string {
    const email = raw.trim().toLowerCase();
    const at = email.lastIndexOf('@');
    if (at < 1) return email;
    let local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      local = local.split('+')[0].replace(/\./g, '');
    } else {
      local = local.split('+')[0];
    }
    return `${local}@${domain}`;
  }

  /** Номер телефона: только цифры, в международном формате. */
  static normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    // Казахстанские номера пишут и как 8XXX…, и как 7XXX… — приводим к «7…».
    if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
    return digits;
  }

  /** HMAC-SHA256 в hex. null, если ключ не настроен. */
  private digest(kind: 'email' | 'phone', normalized: string): string | null {
    const key = this.key;
    if (!key || !normalized) return null;
    return createHmac('sha256', key).update(`${kind}:${normalized}`).digest('hex');
  }

  /**
   * Выдавать ли пробный период при регистрации.
   * Триал выдаётся, только если отпечатков почты и телефона нет в таблице.
   */
  async shouldGrantTrial(email: string, phone?: string | null): Promise<boolean> {
    const digests = [
      this.digest('email', TrialGuardService.normalizeEmail(email)),
      phone ? this.digest('phone', TrialGuardService.normalizePhone(phone)) : null,
    ].filter((d): d is string => Boolean(d));

    if (!digests.length) return true; // ключ не настроен — не блокируем регистрацию

    const found = await this.repo.count({ where: digests.map((digest) => ({ digest })) });
    return found === 0;
  }

  /**
   * Записать отпечатки при удалении аккаунта. Вызывается ПОСЛЕ того, как
   * персональные данные уничтожены: сюда попадает только необратимое значение.
   */
  async remember(email: string, phone?: string | null): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + RETENTION_YEARS);

    const rows: { kind: 'email' | 'phone'; digest: string }[] = [];
    const emailDigest = this.digest('email', TrialGuardService.normalizeEmail(email));
    if (emailDigest) rows.push({ kind: 'email', digest: emailDigest });
    if (phone) {
      const phoneDigest = this.digest('phone', TrialGuardService.normalizePhone(phone));
      if (phoneDigest) rows.push({ kind: 'phone', digest: phoneDigest });
    }
    if (!rows.length) return;

    // Повторное удаление того же адреса не должно падать на уникальном индексе.
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(TrialFingerprint)
      .values(rows.map((r) => ({ ...r, expiresAt })))
      .orIgnore()
      .execute();
  }

  /** Удаление отпечатков с истёкшим сроком хранения. Вызывать по расписанию. */
  async purgeExpired(): Promise<number> {
    const res = await this.repo.delete({ expiresAt: LessThan(new Date()) });
    return res.affected ?? 0;
  }
}
