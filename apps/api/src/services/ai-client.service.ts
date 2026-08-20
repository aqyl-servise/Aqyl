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
  /**
   * Кэшировать стабильный префикс запроса (инструменты + системный промпт).
   *
   * Включать только там, где ОДИН И ТОТ ЖЕ префикс идёт подряд несколькими
   * вызовами (раздатки: один лист = один вызов, листов за урок несколько).
   * Кэш — префиксный: любое изменение байта выше точки останова обнуляет его,
   * поэтому системный промпт для таких вызовов должен быть константой.
   * Порог кэширования зависит от модели (Sonnet 4.6 — 1024 токена,
   * Haiku 4.5 — 4096): более короткий префикс молча не кэшируется.
   */
  cachePrefix?: boolean;
}

export interface AiResponse {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  /** Токены, записанные в кэш (тариф ×1.25). */
  cacheWriteTokens?: number;
  /** Токены, прочитанные из кэша (тариф ×0.1). */
  cacheReadTokens?: number;
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

  /**
   * Системный промпт как параметр запроса. При cachePrefix — блоком с точкой
   * останова кэша: инструменты рендерятся перед системным промптом, поэтому
   * одна метка кэширует их вместе.
   */
  private systemParam(params: AiRequestParams): string | Anthropic.TextBlockParam[] {
    if (!params.cachePrefix) return params.systemPrompt;
    return [{ type: 'text', text: params.systemPrompt, cache_control: { type: 'ephemeral' } }];
  }

  /** Токены кэша из ответа. Нули означают, что кэш не сработал. */
  private cacheTokens(usage: Anthropic.Usage): { write: number; read: number } {
    return {
      write: usage.cache_creation_input_tokens ?? 0,
      read: usage.cache_read_input_tokens ?? 0,
    };
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
      system: this.systemParam(params),
      messages: params.messages,
    });

    const content = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;
    const cache = this.cacheTokens(response.usage);

    // Учёт не в await: ответ уже получен и оплачен, ждать записи в отчёт
    // незачем, а её сбой не должен задерживать генерацию.
    // В общий отчёт идёт ВЕСЬ обработанный вход: при кэше input_tokens — лишь
    // некэшированный остаток, а кэш-токены приходят отдельными полями.
    void this.usage.record({
      userId: params.userId,
      schoolId: params.schoolId,
      actionType: params.action,
      model,
      tokensIn: tokensIn + cache.write + cache.read,
      tokensOut,
    });

    return { content, model, tokensIn, tokensOut, cacheWriteTokens: cache.write, cacheReadTokens: cache.read };
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
      system: this.systemParam(params),
      messages: params.messages,
      tools: [{ name: tool.name, description: tool.description, input_schema: tool.input_schema as never }],
      tool_choice: { type: 'tool', name: tool.name },
    });

    const block = response.content.find((b) => b.type === 'tool_use');
    const data = block ? ((block as { input: unknown }).input as T) : null;
    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;
    const cache = this.cacheTokens(response.usage);
    if (params.cachePrefix) {
      this.logger.debug(`${params.action}: кэш префикса — запись ${cache.write}, чтение ${cache.read} токенов`);
    }

    void this.usage.record({
      userId: params.userId,
      schoolId: params.schoolId,
      actionType: params.action,
      model,
      tokensIn: tokensIn + cache.write + cache.read,
      tokensOut,
    });

    return { data, model, tokensIn, tokensOut, cacheWriteTokens: cache.write, cacheReadTokens: cache.read };
  }
}
