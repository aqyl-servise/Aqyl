import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsentAction, ConsentRecord, ConsentType } from './entities/consent-record.entity';

/**
 * Действующая редакция текстов согласий.
 *
 * Меняется вместе с текстом Политики конфиденциальности, Пользовательского
 * соглашения или формулировок отметок на экране регистрации. По этому номеру
 * видно, под какой именно версией человек поставил отметку.
 */
export const CONSENT_DOCUMENT_VERSION = '1.0';

/** Откуда пришло согласие. */
export type ConsentMethod = 'registration' | 'profile';

export interface ConsentContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    @InjectRepository(ConsentRecord) private readonly repo: Repository<ConsentRecord>,
  ) {}

  /** Записать факт согласия или отзыва. */
  async record(
    userId: string,
    consentType: ConsentType,
    method: ConsentMethod,
    ctx: ConsentContext = {},
    action: ConsentAction = 'granted',
  ): Promise<void> {
    await this.repo.save(
      this.repo.create({
        userId,
        consentType,
        action,
        documentVersion: CONSENT_DOCUMENT_VERSION,
        method,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
      }),
    );
  }

  /**
   * Оба согласия при регистрации. Пишем двумя отдельными записями: закон
   * требует раздельного согласия, значит и в журнале они раздельные —
   * одна запись «согласился со всем» доказательством не является.
   *
   * Сбой записи не должен ронять регистрацию: пользователь уже создан, а
   * потерянная запись журнала чинится разбором логов.
   */
  async recordRegistration(userId: string, ctx: ConsentContext = {}): Promise<void> {
    try {
      await this.record(userId, 'personal_data', 'registration', ctx);
      await this.record(userId, 'cross_border', 'registration', ctx);
    } catch (err) {
      this.logger.error(`Не удалось записать согласия для пользователя ${userId}: ${(err as Error).message}`);
    }
  }

  /**
   * Отзыв обоих согласий — при удалении учётной записи (это и есть отзыв).
   * Пишем отдельными записями action='revoked', историю не затираем: от даты
   * отзыва отсчитывается 3-летний срок хранения записи (ТЗ, раздел 8).
   * Сбой записи не должен ронять удаление аккаунта.
   */
  async recordRevocation(userId: string, ctx: ConsentContext = {}): Promise<void> {
    try {
      await this.record(userId, 'personal_data', 'profile', ctx, 'revoked');
      await this.record(userId, 'cross_border', 'profile', ctx, 'revoked');
    } catch (err) {
      this.logger.error(`Не удалось записать отзыв согласий для пользователя ${userId}: ${(err as Error).message}`);
    }
  }

  /** История согласий пользователя — для ответа на запрос субъекта данных. */
  async history(userId: string): Promise<ConsentRecord[]> {
    return this.repo.find({ where: { userId }, order: { occurredAt: 'DESC' } });
  }
}
