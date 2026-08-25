import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { createHmac } from 'node:crypto';
import { AccountSignal } from './entities/account-signal.entity';
import { Teacher } from '../teachers/entities/teacher.entity';

/**
 * Мягкие признаки связи аккаунтов — адрес и отпечаток устройства.
 *
 * Осознанно НЕ блокируют ничего сами: в школе весь коллектив выходит с одного
 * адреса, мобильные операторы раздают один адрес тысячам абонентов, а отпечаток
 * устройства сбрасывается сменой браузера. Автоматическая блокировка по таким
 * признакам стоила бы нам целой школы вместо одного нарушителя, поэтому здесь
 * только сбор и показ, а решение принимает администратор.
 */
@Injectable()
export class AccountSignalsService {
  private readonly logger = new Logger(AccountSignalsService.name);

  constructor(
    @InjectRepository(AccountSignal) private readonly repo: Repository<AccountSignal>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    private readonly config: ConfigService,
  ) {}

  /** Тот же ключ, что у отпечатков пробного периода: сырые значения не храним. */
  private digest(kind: string, raw: string): string | null {
    const key = this.config.get<string>('TRIAL_FINGERPRINT_KEY');
    if (!key || !raw) return null;
    return createHmac('sha256', key).update(`${kind}:${raw}`).digest('hex');
  }

  /**
   * Записать признаки. Вызывается при регистрации и входе; сбой не должен
   * ломать вход, поэтому все ошибки гасятся.
   */
  async record(
    teacherId: string,
    signals: { ip?: string | null; device?: string | null },
  ): Promise<void> {
    const rows: { kind: 'ip' | 'device'; digest: string }[] = [];
    const ip = this.digest('ip', (signals.ip ?? '').trim());
    if (ip) rows.push({ kind: 'ip', digest: ip });
    const device = this.digest('device', (signals.device ?? '').trim());
    if (device) rows.push({ kind: 'device', digest: device });
    if (!rows.length) return;

    for (const r of rows) {
      try {
        // Уникальный индекс (teacherId, kind, digest): повторный вход тем же
        // устройством увеличивает счётчик, а не плодит записи.
        await this.repo.query(
          `INSERT INTO "account_signals" ("teacherId", "kind", "digest")
           VALUES ($1, $2, $3)
           ON CONFLICT ("teacherId", "kind", "digest")
           DO UPDATE SET "hits" = "account_signals"."hits" + 1, "lastSeen" = now()`,
          [teacherId, r.kind, r.digest],
        );
      } catch (err) {
        this.logger.warn(`Не удалось записать признак ${r.kind}: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Кластеры: признаки, встречающиеся у нескольких аккаунтов. Именно они —
   * повод посмотреть. Возвращаем с почтами, чтобы администратор сразу видел,
   * о ком речь, без второго запроса.
   */
  async clusters(minAccounts = 2, limit = 50) {
    const rows: { kind: string; digest: string; ids: string[] }[] = await this.repo.query(
      `SELECT "kind", "digest", array_agg(DISTINCT "teacherId") AS ids
       FROM "account_signals"
       GROUP BY "kind", "digest"
       HAVING count(DISTINCT "teacherId") >= $1
       ORDER BY count(DISTINCT "teacherId") DESC
       LIMIT $2`,
      [minAccounts, limit],
    );
    if (!rows.length) return [];

    const allIds = [...new Set(rows.flatMap((r) => r.ids))];
    const teachers = await this.teacherRepo.find({ where: { id: In(allIds) } });
    const byId = new Map(teachers.map((t) => [t.id, t]));

    return rows.map((r) => ({
      kind: r.kind,
      // Полный хеш админке не нужен — только чтобы отличать кластеры глазами.
      digestShort: r.digest.slice(0, 10),
      accounts: r.ids
        .map((id) => {
          const t = byId.get(id);
          return t
            ? {
                id, email: t.email, fullName: t.fullName,
                status: t.status, createdAt: t.createdAt,
                phoneVerified: !!t.phoneVerifiedAt,
              }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    })).filter((c) => c.accounts.length >= minAccounts);
  }
}
