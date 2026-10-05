import { Injectable, Logger } from '@nestjs/common';
import { AiClientService } from '../../services/ai-client.service';
import { CostLoggerService } from './handouts/cost-logger.service';
import { KzFix, kazakhWords, parseFixes, proofreadPrompt, unknownKazakhWords } from './engine/kz-proofread';

/**
 * Корректор казахского текста: один вызов модели на урок (план) и один на
 * пакет раздатки. Подробности и причины — engine/kz-proofread.ts.
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
    const items = texts.map((t) => String(t ?? '').trim()).filter(Boolean);
    if (!items.length) return [];
    try {
      const suspicious = await unknownKazakhWords(kazakhWords(items));
      const p = proofreadPrompt(items, suspicious, opts.subject);
      const res = await this.ai.request({
        action: 'kz_proofread', systemPrompt: p.system,
        messages: [{ role: 'user', content: p.user }],
        userId: opts.userId ?? null, schoolId: opts.schoolId ?? null,
      });
      await this.cost.log(opts.lessonId, opts.operation, res);
      const fixes = parseFixes(this.parseJson(res.content));
      // Фрагмент, которого в тексте нет, — галлюцинация корректора: не применяем.
      const real = fixes.filter((f) => items.some((t) => t.includes(f.wrong)));
      if (real.length) {
        this.logger.log(
          `Урок ${opts.lessonId} (${opts.label}): казахский, исправлено ${real.length} — ` +
          real.map((f) => `«${f.wrong}» → «${f.right}»`).join('; '),
        );
      }
      return real;
    } catch (err) {
      this.logger.warn(`Урок ${opts.lessonId} (${opts.label}): вычитка не удалась: ${(err as Error).message}`);
      return [];
    }
  }

  private parseJson(content: string): unknown {
    const s = String(content ?? '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try { return JSON.parse(s.slice(start, end + 1)); } catch { return null; }
  }
}
