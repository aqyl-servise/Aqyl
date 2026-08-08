import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { getModelForAction, getMaxTokensForAction } from '../config/ai-models';

export interface AiRequestParams {
  action: string;
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
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

  constructor() {
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

    return {
      content,
      model,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  }
}
