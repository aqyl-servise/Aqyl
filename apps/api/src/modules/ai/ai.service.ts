import { HttpException, HttpStatus, Injectable, Optional } from "@nestjs/common";
import { AiUsageService, UserContext } from "../ai-usage/ai-usage.service";
import { AiClientService } from "../../services/ai-client.service";
import { buildPrompt } from "../../utils/prompt-builder";


const GENERATION_PROMPT = `Ты — AI-ассистент образовательной платформы Aqyl для казахстанских школ.
Помогаешь учителям и администраторам. Отвечай чётко, практично и по делу. Избегай лишних предисловий.`;

@Injectable()
export class AiChatService {
  constructor(
    private readonly aiClientService: AiClientService,
    @Optional() private readonly aiUsageService: AiUsageService,
  ) {}

  private async checkLimit(userCtx: UserContext | undefined, actionType: string) {
    if (!userCtx || !this.aiUsageService?.isLimitedRole(userCtx.role)) return null;
    const check = await this.aiUsageService.checkAndIncrement(userCtx.userId, userCtx.schoolId, actionType);
    if (!check.allowed) {
      throw new HttpException({ message: check.message, limitReached: true }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return check;
  }

  private async recordUsage(userCtx: UserContext | undefined, actionType: string, usage?: { input_tokens: number; output_tokens: number }) {
    if (!userCtx || !this.aiUsageService?.isLimitedRole(userCtx.role) || !usage) return;
    this.aiUsageService.recordTokens(userCtx.userId, userCtx.schoolId, actionType, usage.input_tokens, usage.output_tokens).catch(() => {});
  }

  async chat(
    message: string,
    history: { role: "user" | "assistant"; content: string }[],
    section: string,
    context: Record<string, unknown>,
    language: string,
    userCtx?: UserContext,
  ): Promise<{ reply: string; warning?: boolean; warningMessage?: string }> {
    if (!this.aiClientService.isConfigured) {
      return { reply: "ИИ-ассистент временно недоступен. Проверьте настройку ANTHROPIC_API_KEY." };
    }

    const check = await this.checkLimit(userCtx, "chat");

    const systemPrompt = buildPrompt('assistant', {
      language: language || 'ru',
      section_context: section || 'general',
    });
    const limitedHistory = history.slice(-6);

    const result = await this.aiClientService.request({
      action: "assistant_chat",
      systemPrompt,
      messages: [
        ...limitedHistory,
        { role: "user", content: message },
      ],
    });

    await this.recordUsage(userCtx, "chat", { input_tokens: result.tokensIn, output_tokens: result.tokensOut });

    return {
      reply: result.content || "Не удалось получить ответ.",
      ...(check?.warning ? { warning: true, warningMessage: check.message } : {}),
    };
  }

  async generateAssignment(subject: string, grade: string, topic: string, type: string, userCtx?: UserContext): Promise<{ content: string; warning?: boolean; warningMessage?: string }> {
    if (!this.aiClientService.isConfigured) {
      return { content: `Задание по теме «${topic}» (${subject}, ${grade} класс):\n\n1. Ответьте на вопрос по теме.\n2. Выполните практическое задание.\n3. Сделайте вывод.` };
    }

    const check = await this.checkLimit(userCtx, "generate_assignment");

    const result = await this.aiClientService.request({
      action: "task_generate",
      systemPrompt: GENERATION_PROMPT,
      messages: [{
        role: "user",
        content: `Создай ${type} для ${grade} класса по предмету «${subject}» на тему «${topic}». Задание должно быть чётким, конкретным и соответствовать возрасту учеников. Дай готовый текст задания.`,
      }],
    });

    await this.recordUsage(userCtx, "generate_assignment", { input_tokens: result.tokensIn, output_tokens: result.tokensOut });

    return {
      content: result.content,
      ...(check?.warning ? { warning: true, warningMessage: check.message } : {}),
    };
  }

  async generateFLTask(params: {
    subject: string; grade: number; direction: string;
    difficulty: string; taskType: string; topic: string;
  }, userCtx?: UserContext): Promise<{ title: string; description: string; options?: { text: string; isCorrect: boolean }[]; correctAnswer?: string; warning?: boolean; warningMessage?: string }> {
    if (!this.aiClientService.isConfigured) {
      return { title: `Функциональная грамотность: ${params.topic}`, description: `Задание по функциональной грамотности для ${params.grade} класса на тему «${params.topic}».` };
    }

    const check = await this.checkLimit(userCtx, "fl_task");

    const isTest = params.taskType === "test";
    const jsonSchema = isTest
      ? `{"title":"...","description":"...","options":[{"text":"...","isCorrect":false},{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false}]}`
      : `{"title":"...","description":"...","correctAnswer":"..."}`;

    const systemPrompt = buildPrompt('fl_task', {
      subject: params.subject || '',
      class: String(params.grade || ''),
      direction: params.direction || '',
      difficulty: params.difficulty || 'medium',
      task_type: params.taskType || 'open',
      language: 'ru',
    });

    const result = await this.aiClientService.request({
      action: "fl_task_generate",
      systemPrompt,
      messages: [{ role: "user", content: `Тема: «${params.topic}». Верни ТОЛЬКО JSON (без markdown): ${jsonSchema}` }],
    });

    await this.recordUsage(userCtx, "fl_task", { input_tokens: result.tokensIn, output_tokens: result.tokensOut });

    const raw = result.content || "{}";
    try {
      const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      return { ...parsed, ...(check?.warning ? { warning: true, warningMessage: check.message } : {}) };
    } catch {
      return {
        title: `Задание по теме «${params.topic}»`,
        description: raw,
        ...(check?.warning ? { warning: true, warningMessage: check.message } : {}),
      };
    }
  }

  async generateLessonPlan(subject: string, grade: string, topic: string, duration: number, userCtx?: UserContext): Promise<{ content: string; warning?: boolean; warningMessage?: string }> {
    if (!this.aiClientService.isConfigured) {
      return { content: `КМЖ: ${subject}, ${grade} класс, тема: «${topic}», ${duration} мин.` };
    }

    const check = await this.checkLimit(userCtx, "generate_kmzh");

    const result = await this.aiClientService.request({
      action: "kmzh_generate",
      systemPrompt: GENERATION_PROMPT,
      messages: [{
        role: "user",
        content: `Составь краткосрочный поурочный план (КМЖ/ҚМЖ) по формату МОН РК для ${grade} класса, предмет «${subject}», тема «${topic}», продолжительность ${duration} минут.
Включи: цели урока (по таксономии Блума), ожидаемые результаты, ресурсы, этапы урока (начало/середина/конец) с временем и описанием деятельности учителя и учеников, критерии оценивания, рефлексию.`,
      }],
    });

    await this.recordUsage(userCtx, "generate_kmzh", { input_tokens: result.tokensIn, output_tokens: result.tokensOut });

    return {
      content: result.content,
      ...(check?.warning ? { warning: true, warningMessage: check.message } : {}),
    };
  }
}
