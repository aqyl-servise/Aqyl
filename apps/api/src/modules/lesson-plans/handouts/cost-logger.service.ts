import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationCostLog } from '../entities/generation-cost-log.entity';
import { AiResponse } from '../../../services/ai-client.service';
import { costKzt } from '../../../config/ai-pricing';

/**
 * Пишет стоимость одного AI-вызова в разрезе урока и операции (срез 2).
 *
 * Общий учёт по пользователю и дню ведёт AiUsageRecorder внутри AiClientService.
 * Здесь — вторая, урок-центричная запись: она нужна, чтобы показать «сколько
 * стоил план / пакет материалов для этого урока». Цена берётся той же функцией
 * costKzt, тариф не дублируется. Сбой лога не должен ронять генерацию.
 */
@Injectable()
export class CostLoggerService {
  private readonly logger = new Logger(CostLoggerService.name);

  constructor(
    @InjectRepository(GenerationCostLog) private readonly repo: Repository<GenerationCostLog>,
  ) {}

  /** Записать стоимость вызова и вернуть её в тенге (0 при сбое записи). */
  async log(lessonId: string, operation: string, res: AiResponse): Promise<number> {
    const cost = costKzt(res.model, res.tokensIn, res.tokensOut);
    try {
      await this.repo.save(this.repo.create({
        lessonId, operation, model: res.model,
        inputTokens: res.tokensIn, outputTokens: res.tokensOut, costKzt: cost,
      }));
    } catch (err) {
      this.logger.warn(`Не удалось записать стоимость (${operation}, урок ${lessonId}): ${(err as Error).message}`);
    }
    return cost;
  }

  async clear(lessonId: string, operation: string): Promise<void> {
    await this.repo.delete({ lessonId, operation });
  }

  /** Итоги по уроку: сумма и разбивка по операциям (тенге). */
  async summary(lessonId: string): Promise<{ total: number; byOperation: Record<string, number> }> {
    const rows = await this.repo.find({ where: { lessonId } });
    const byOperation: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      byOperation[r.operation] = (byOperation[r.operation] ?? 0) + r.costKzt;
      total += r.costKzt;
    }
    return { total, byOperation };
  }
}
