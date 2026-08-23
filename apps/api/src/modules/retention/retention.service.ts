import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccountDeletionService } from '../auth/account-deletion.service';
import { TrialGuardService } from '../trial-guard/trial-guard.service';
import { BillingService } from '../billing/billing.service';

/**
 * Регламентная очистка данных с истёкшим сроком хранения.
 *
 * Закрывает обещания, которые мы даём в интерфейсе и в политике:
 *   — «после указанной даты восстановление невозможно» — значит запись должна
 *     физически исчезнуть, а не остаться помеченной признаком удаления;
 *   — «отпечатки хранятся 3 года» — значит по истечении срока они удаляются.
 *
 * Без этого задания оба утверждения были бы ложными, а проверка магазина
 * прямо требует убедиться, что через N дней записи в базе действительно нет.
 *
 * Процесс запускается в одном экземпляре (pm2 fork), поэтому блокировки между
 * инстансами не нужны. При переходе на несколько инстансов задание надо будет
 * защитить внешней блокировкой, иначе оно выполнится несколько раз.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly accountDeletion: AccountDeletionService,
    private readonly trialGuard: TrialGuardService,
    private readonly billing: BillingService,
  ) {}

  /** Ежедневно в 03:00 — время наименьшей нагрузки. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'retention-purge' })
  async runDailyPurge(): Promise<void> {
    await this.purgeAll();
  }

  /**
   * Вынесено отдельным методом, чтобы очистку можно было запустить вручную
   * (например, из скрипта) и покрыть тестом, не дожидаясь расписания.
   */
  async purgeAll(): Promise<{ accounts: number; fingerprints: number }> {
    let accounts = 0;
    let fingerprints = 0;

    // Аккаунты и отпечатки чистим независимо: сбой одного не должен отменять
    // второе, иначе одна ошибка останавливает всю политику хранения.
    try {
      accounts = await this.accountDeletion.purgeDue();
    } catch (err) {
      this.logger.error(`Не удалось удалить просроченные аккаунты: ${(err as Error).message}`);
    }

    try {
      fingerprints = await this.trialGuard.purgeExpired();
    } catch (err) {
      this.logger.error(`Не удалось удалить просроченные отпечатки: ${(err as Error).message}`);
    }

    if (accounts || fingerprints) {
      this.logger.log(`Очистка: аккаунтов удалено ${accounts}, отпечатков удалено ${fingerprints}`);
    }
    return { accounts, fingerprints };
  }

  /**
   * Ежедневно в 09:00 — напоминания об окончании подписки за 3 дня.
   *
   * Утро, а не ночь: письмо должно попасть в ящик в рабочее время, иначе
   * теряется среди ночной почты. Отделено от ночной очистки намеренно.
   */
  @Cron('0 9 * * *')
  async sendExpiryReminders(): Promise<void> {
    try {
      const { sent } = await this.billing.sendExpiryReminders(3);
      if (sent > 0) this.logger.log(`Напоминаний об окончании подписки отправлено: ${sent}`);
    } catch (err) {
      this.logger.error(`Не удалось разослать напоминания: ${(err as Error).message}`);
    }
    // Пакеты уроков (ТЗ №3, п. 7): письмо за 7 дней до сгорания баланса.
    // То же утреннее окно и то же суточное «окно в одни сутки» внутри.
    try {
      const { sent } = await this.billing.sendBalanceExpiryReminders(7);
      if (sent > 0) this.logger.log(`Напоминаний о сгорании баланса отправлено: ${sent}`);
    } catch (err) {
      this.logger.error(`Не удалось разослать напоминания о балансе: ${(err as Error).message}`);
    }
  }

  /** Сгорание платного баланса по сроку (ТЗ №3, п. 7) — ночью, вместе с очисткой. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'balance-expiry' })
  async expireBalances(): Promise<void> {
    try {
      const { expired } = await this.billing.expireBalances();
      if (expired > 0) this.logger.warn(`Сгоревших балансов пакетов: ${expired}`);
    } catch (err) {
      this.logger.error(`Не удалось обнулить просроченные балансы: ${(err as Error).message}`);
    }
  }
}
