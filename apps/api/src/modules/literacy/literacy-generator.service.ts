import { Injectable, Logger } from '@nestjs/common';
import { AiClientService } from '../../services/ai-client.service';
import {
  StimulusParams, QuestionsParams,
  stimulusPrompt, analyzePrompt, questionsPrompt, regenQuestionPrompt,
} from './prompts/literacy-prompts';
import { validateQuestions, validateOne, NormalizedQuestion, ValidationResult } from './engine/literacy-validator';

/**
 * Reusable functional-literacy generator (ТЗ раздел 10). Pure AI logic, no HTTP
 * and no persistence — so the lesson generator can call it later without rework.
 */
@Injectable()
export class LiteracyGeneratorService {
  private readonly logger = new Logger(LiteracyGeneratorService.name);

  constructor(private readonly ai: AiClientService) {}

  async generateStimulus(p: StimulusParams): Promise<{ stimulusText: string; stimulusData: Record<string, unknown> | null }> {
    const prompt = stimulusPrompt(p);
    const res = await this.ai.request({ action: 'literacy_stimulus', systemPrompt: prompt.system, messages: [{ role: 'user', content: prompt.user }] });
    const parsed = this.parseJson<{ stimulusText?: string; stimulusData?: Record<string, unknown> | null }>(res.content);
    if (!parsed?.stimulusText) throw new Error('ИИ не вернул стимульный материал');
    return { stimulusText: parsed.stimulusText, stimulusData: parsed.stimulusData ?? null };
  }

  async analyzeMaterial(text: string, language: string): Promise<{ topic?: string; difficulty?: string; suitable?: boolean; note?: string } | null> {
    try {
      const prompt = analyzePrompt(text, language);
      const res = await this.ai.request({ action: 'literacy_analyze', systemPrompt: prompt.system, messages: [{ role: 'user', content: prompt.user }] });
      return this.parseJson(res.content);
    } catch (e) {
      this.logger.warn(`analyzeMaterial failed: ${(e as Error).message}`);
      return null;
    }
  }

  /** Generate + code-validate the question set. Throws with a reason if invalid. */
  async generateQuestions(p: QuestionsParams): Promise<ValidationResult> {
    const prompt = questionsPrompt(p);
    const res = await this.ai.request({ action: 'literacy_questions', systemPrompt: prompt.system, messages: [{ role: 'user', content: prompt.user }] });
    const parsed = this.parseJson<{ questions?: unknown[] }>(res.content);
    const raw = Array.isArray(parsed?.questions) ? parsed!.questions : [];
    const result = validateQuestions(raw as never, p.questionCount);
    if (!result.ok) throw new Error(result.reason ?? 'Валидация вопросов не пройдена');
    return result;
  }

  async regenerateQuestion(p: QuestionsParams): Promise<NormalizedQuestion> {
    const prompt = regenQuestionPrompt(p);
    const res = await this.ai.request({ action: 'literacy_regen_question', systemPrompt: prompt.system, messages: [{ role: 'user', content: prompt.user }] });
    const parsed = this.parseJson<NormalizedQuestion>(res.content);
    const one = validateOne(parsed as never);
    if (!one) throw new Error('ИИ вернул некорректный вопрос');
    return one;
  }

  private parseJson<T>(text: string): T | null {
    if (!text) return null;
    let s = text.trim().replace(/^```json?\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const start = s.search(/[[{]/);
    if (start === -1) return null;
    s = s.slice(start);
    try {
      return JSON.parse(s) as T;
    } catch {
      for (let i = s.length; i > 0; i--) {
        try { return JSON.parse(s.slice(0, i)) as T; } catch { /* keep trimming */ }
      }
      return null;
    }
  }
}
