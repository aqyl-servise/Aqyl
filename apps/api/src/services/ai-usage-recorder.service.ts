import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiUsageDaily } from '../modules/ai-usage/ai-usage.entity';
import { costKzt } from '../config/ai-pricing';

/**
 * Учёт расхода токенов для вызовов через AiClientService.
 *
 * Зачем отдельный сервис, а не существующий AiUsageService.recordTokens:
 * тот работает только при уже созданной строке за сегодня (`if (!row) return`)
 * — строку создаёт checkAndIncrement, который вызывается лишь на пути B2G с
 * лимитами. Модули B2C (генератор КСП, функциональная грамотность) этот путь
 * не проходят, поэтому их расход не записывался вообще.
 *
 * Здесь строка создаётся при первом вызове за день, а стоимость считается по
 * фактической модели ответа, а не по единой ставке.
 */
@Injectable()
export class AiUsageRecorder {
  private readonly logger = new Logger(AiUsageRecorder.name);

  constructor(
    @InjectRepository(AiUsageDaily) private readonly dailyRepo: Repository<AiUsageDaily>,
  ) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Записать один вызов. Ошибки учёта не должны ломать генерацию — то, за что
   * заплатил пользователь, важнее строки в отчёте, поэтому только лог.
   */
  async record(params: {
    userId?: string | null;
    schoolId?: string | null;
    actionType: string;
    model: string;
    tokensIn: number;
    tokensOut: number;
  }): Promise<void> {
    const { userId, schoolId, actionType, model, tokensIn, tokensOut } = params;
    if (!userId) return; // фоновые вызовы без пользователя не учитываем

    try {
      const date = this.today();
      const cost = costKzt(model, tokensIn, tokensOut);

      const row = await this.dailyRepo.findOne({ where: { userId, date, actionType } });
      if (row) {
        row.count += 1;
        row.tokensInput += tokensIn;
        row.tokensOutput += tokensOut;
        row.costKzt += cost;
        await this.dailyRepo.save(row);
        return;
      }

      await this.dailyRepo.save(
        this.dailyRepo.create({
          userId,
          schoolId: schoolId ?? undefined,
          actionType,
          date,
          count: 1,
          tokensInput: tokensIn,
          tokensOutput: tokensOut,
          costKzt: cost,
        }),
      );
    } catch (err) {
      this.logger.error(`Не удалось записать расход (${actionType}): ${(err as Error).message}`);
    }
  }
}
