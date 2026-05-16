import { Injectable } from '@nestjs/common';
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
