import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { getModelForAction, getMaxTokensForAction } from '../config/ai-models';
import { AiUsageRecorder } from './ai-usage-recorder.service';

export interface AiRequestParams {
  action: string;
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  /**
   * Кто инициировал вызов — нужен для учёта расхода. Без него вызов
   * выполнится, но в отчёт не попадёт, поэтому в пользовательских сценариях
   * его надо передавать всегда.
   */
  userId?: string | null;
  schoolId?: string | null;
}

export interface AiResponse {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly client?: Anthropic;

  constructor(private readonly usage: AiUsageRecorder) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  get isConfigured(): boolean {
    return !!this.client;
  }

  async request(params: AiRequestParams): Promise<AiResponse> {
    if (!this.client) {
      throw new Error('Anthropic API key is not configured');
    }

    const model = getModelForAction(params.action);
    const maxTokens = params.maxTokens ?? getMaxTokensForAction(params.action);

    // Режим аудита исходящих запросов (пункт «Приёмка» требования 1.5:
    // записать десять реальных запросов и просмотреть их глазами — в них не
    // должно быть имён, почты, телефонов, идентификаторов учётной записи и
    // наименования школы).
    //
    // ВЫКЛЮЧЕН ПО УМОЛЧАНИЮ и должен оставаться выключенным в обычной работе:
    // сам по себе журнал с полным текстом запросов — это хранение содержимого,
    // которого мы стараемся избегать. Включать точечно на время проверки:
    //     AI_AUDIT_PROMPTS=true
    if (process.env.AI_AUDIT_PROMPTS === 'true') {
      this.logger.warn(
        `[AI-AUDIT] action=${params.action} model=${model}\n` +
          `--- system ---\n${params.systemPrompt}\n` +
          `--- messages ---\n${JSON.stringify(params.messages, null, 2)}`,
      );
    }

    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      system: params.systemPrompt,
      messages: params.messages,
    });

    const content = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;

    // Учёт не в await: ответ уже получен и оплачен, ждать записи в отчёт
    // незачем, а её сбой не должен задерживать генерацию.
    void this.usage.record({
      userId: params.userId,
      schoolId: params.schoolId,
      actionType: params.action,
      model,
      tokensIn,
      tokensOut,
    });

    return { content, model, tokensIn, tokensOut };
  }

  /**
   * Структурированный вывод через tool use. API гарантирует, что `input`
   * инструмента — валидный JSON по схеме, поэтому парсить текст (и ловить
   * недоставленные скобки/обрывы) не нужно. Используем для раздаточных
   * материалов, где текстовый JSON модели рвался и давал пустые листы.
   */
  async requestTool<T = Record<string, unknown>>(
    params: AiRequestParams,
    tool: { name: string; description: string; input_schema: Record<string, unknown> },
  ): Promise<{ data: T | null } & Omit<AiResponse, 'content'>> {
    if (!this.client) {
      throw new Error('Anthropic API key is not configured');
    }
    const model = getModelForAction(params.action);
    const maxTokens = params.maxTokens ?? getMaxTokensForAction(params.action);

    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      system: params.systemPrompt,
      messages: params.messages,
      tools: [{ name: tool.name, description: tool.description, input_schema: tool.input_schema as never }],
      tool_choice: { type: 'tool', name: tool.name },
    });

    const block = response.content.find((b) => b.type === 'tool_use');
    const data = block ? ((block as { input: unknown }).input as T) : null;
    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;

    void this.usage.record({
      userId: params.userId,
      schoolId: params.schoolId,
      actionType: params.action,
      model,
      tokensIn,
      tokensOut,
    });

    return { data, model, tokensIn, tokensOut };
  }
}
