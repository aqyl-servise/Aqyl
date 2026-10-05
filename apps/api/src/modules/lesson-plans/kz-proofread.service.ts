import { Injectable, Logger } from '@nestjs/common';
import { AiClientService } from '../../services/ai-client.service';
import { CostLoggerService } from './handouts/cost-logger.service';
import { KzFix, PROOFREAD_TOOL, anchorFixes, chunkTexts, kazakhWords, parseFixes, proofreadPrompt, unknownKazakhWords } from './engine/kz-proofread';

/**
 * Корректор казахского текста: план урока и пакет раздатки вычитываются
 * частями (по ~6000 знаков, части параллельно). Подробности и причины —
 * engine/kz-proofread.ts.
 *
 * Сбой вычитки не роняет генерацию: текст остаётся как есть.
 */
@Injectable()
export class KzProofreadService {
  private readonly logger = new Logger(KzProofreadService.name);

  constructor(
    private readonly ai: AiClientService,
    private readonly cost: CostLoggerService,
  ) {}

  async proofread(
    texts: string[],
    opts: { lessonId: string; userId?: string | null; schoolId?: string | null; subject?: string | null; operation: string; label: string },
  ): Promise<KzFix[]> {
    // Выключатель на случай, если корректор начнёт портить текст: KZ_PROOFREAD=off в .env.
    if (String(process.env.KZ_PROOFREAD ?? '').toLowerCase() === 'off') return [];
    const chunks = chunkTexts(texts);
    if (!chunks.length) return [];
    const parts = await Promise.all(chunks.map((c) => this.proofreadChunk(c, opts)));
    const real: KzFix[] = [];
    for (const f of parts.flat()) if (!real.some((r) => r.wrong === f.wrong)) real.push(f);
    if (real.length) {
      this.logger.log(
        `Урок ${opts.lessonId} (${opts.label}): казахский, исправлено ${real.length} — ` +
        real.map((f) => `«${f.wrong}» → «${f.right}»`).join('; '),
      );
    }
    return real;
  }

  private async proofreadChunk(
    items: string[],
    opts: { lessonId: string; userId?: string | null; schoolId?: string | null; subject?: string | null; operation: string; label: string },
  ): Promise<KzFix[]> {
    try {
      const suspicious = await unknownKazakhWords(kazakhWords(items));
      const p = proofreadPrompt(items, suspicious, opts.subject);
      const res = await this.ai.requestTool<{ fixes?: unknown }>({
        action: 'kz_proofread', systemPrompt: p.system,
        messages: [{ role: 'user', content: p.user }],
        userId: opts.userId ?? null, schoolId: opts.schoolId ?? null,
      }, PROOFREAD_TOOL);
      await this.cost.log(opts.lessonId, opts.operation, {
        content: '', model: res.model, tokensIn: res.tokensIn, tokensOut: res.tokensOut,
        cacheWriteTokens: res.cacheWriteTokens, cacheReadTokens: res.cacheReadTokens,
      });
      // Фрагмент, которого в тексте нет, — галлюцинация корректора: не применяем.
      return anchorFixes(items, parseFixes(res.data));
    } catch (err) {
      this.logger.warn(`Урок ${opts.lessonId} (${opts.label}): вычитка не удалась: ${(err as Error).message}`);
      return [];
    }
  }
}
