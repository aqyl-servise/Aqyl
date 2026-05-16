import { HttpException, HttpStatus, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { AiUsageService, UserContext } from "../ai-usage/ai-usage.service";

interface SectionContext {
  subject?: string;
  grade?: number;
  topic?: string;
  classroomName?: string;
  studentCount?: number;
  role?: string;
}

function buildSystemPrompt(section: string, context: SectionContext, language: string): string {
  const lang = language === "kz" ? "казахском" : language === "en" ? "English" : "русском";
  const base = `Ты — AI-ассистент образовательной платформы Aqyl для казахстанских школ. Отвечай на ${lang} языке. Будь краток и конкретен.`;

  const sections: Record<string, string> = {
    kmzh_generator: `${base} Помогаешь учителю составить краткосрочный план урока (КМЖ/КСП). Предмет: ${context.subject || "не указан"}, Класс: ${context.grade || "не указан"}, Тема: ${context.topic || "не указана"}.`,
    task_generator: `${base} Помогаешь учителю создать задания для учеников. Предмет: ${context.subject || "не указан"}, Класс: ${context.grade || "не указан"}.`,
    assignments: `${base} Помогаешь учителю управлять заданиями и анализировать успеваемость учеников.`,
    analytics: `${base} Помогаешь анализировать успеваемость класса. Класс: ${context.classroomName || "не указан"}, Учеников: ${context.studentCount || "не указано"}.`,
    open_lessons: `${base} Помогаешь учителю подготовить и оформить открытый урок.`,
    gifted_students: `${base} Помогаешь работать с одарёнными учащимися: олимпиады, конкурсы, индивидуальные планы.`,
    fl_tasks: `${base} Помогаешь создавать задания по функциональной грамотности в формате PISA/PIRLS/TIMSS. Предмет: ${context.subject || "не указан"}, Класс: ${context.grade || "не указан"}.`,
    school_analytics: `${base} Помогаешь директору/завучу анализировать успеваемость школы, выявлять проблемные зоны.`,
    attestation: `${base} Помогаешь с вопросами аттестации педагогов по казахстанским стандартам МОН РК.`,
    modo: `${base} Помогаешь с документацией МОДО (мониторинг достижений образовательных организаций).`,
    ktp_ksp: `${base} Помогаешь с календарно-тематическим планированием (КТП/КСП) по стандартам МОН РК.`,
    sor_soch: `${base} Помогаешь с суммативным оцениванием за раздел (СОР) и суммативным оцениванием за четверть (СОЧ).`,
    default: `${base} Помогаешь учителям и администраторам казахстанских школ с вопросами образования.`,
  };

  return sections[section] ?? sections.default;
}

// Legacy fallback: used by generate-assignment and generate-lesson-plan (unchanged endpoints)
const GENERATION_PROMPT = `Ты — AI-ассистент образовательной платформы Aqyl для казахстанских школ.
Помогаешь учителям и администраторам. Отвечай чётко, практично и по делу. Избегай лишних предисловий.`;

@Injectable()
export class AiChatService {
  private readonly client?: Anthropic;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly aiUsageService: AiUsageService,
  ) {
    const apiKey = this.configService.get<string>("ANTHROPIC_API_KEY");
    this.model = this.configService.get<string>("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

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
    context: SectionContext,
    language: string,
    userCtx?: UserContext,
  ): Promise<{ reply: string; warning?: boolean; warningMessage?: string }> {
    if (!this.client) {
      return { reply: "ИИ-ассистент временно недоступен. Проверьте настройку ANTHROPIC_API_KEY." };
    }

    const check = await this.checkLimit(userCtx, "chat");

    const systemPrompt = buildSystemPrompt(section, context, language);
    const limitedHistory = history.slice(-6);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...limitedHistory,
        { role: "user", content: message },
      ],
    });

    await this.recordUsage(userCtx, "chat", response.usage);

    const reply = response.content[0].type === "text" ? response.content[0].text : "Не удалось получить ответ.";
    return {
      reply,
      ...(check?.warning ? { warning: true, warningMessage: check.message } : {}),
    };
  }

  async generateAssignment(subject: string, grade: string, topic: string, type: string, userCtx?: UserContext): Promise<{ content: string; warning?: boolean; warningMessage?: string }> {
    if (!this.client) {
      return { content: `Задание по теме «${topic}» (${subject}, ${grade} класс):\n\n1. Ответьте на вопрос по теме.\n2. Выполните практическое задание.\n3. Сделайте вывод.` };
    }

    const check = await this.checkLimit(userCtx, "generate_assignment");

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: GENERATION_PROMPT,
      messages: [{
        role: "user",
        content: `Создай ${type} для ${grade} класса по предмету «${subject}» на тему «${topic}». Задание должно быть чётким, конкретным и соответствовать возрасту учеников. Дай готовый текст задания.`,
      }],
    });

    await this.recordUsage(userCtx, "generate_assignment", response.usage);

    const content = response.content[0].type === "text" ? response.content[0].text : "";
    return {
      content,
      ...(check?.warning ? { warning: true, warningMessage: check.message } : {}),
    };
  }

  async generateFLTask(params: {
    subject: string; grade: number; direction: string;
    difficulty: string; taskType: string; topic: string;
  }, userCtx?: UserContext): Promise<{ title: string; description: string; options?: { text: string; isCorrect: boolean }[]; correctAnswer?: string; warning?: boolean; warningMessage?: string }> {
    if (!this.client) {
      return { title: `Функциональная грамотность: ${params.topic}`, description: `Задание по функциональной грамотности для ${params.grade} класса на тему «${params.topic}».` };
    }

    const check = await this.checkLimit(userCtx, "fl_task");

    const dirMap: Record<string, string> = { reading: "читательской грамотности", math: "математической грамотности", science: "естественнонаучной грамотности" };
    const diffMap: Record<string, string> = { low: "низкой", medium: "средней", high: "высокой" };
    const isTest = params.taskType === "test";
    const jsonSchema = isTest
      ? `{"title":"...","description":"...","options":[{"text":"...","isCorrect":false},{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false}]}`
      : `{"title":"...","description":"...","correctAnswer":"..."}`;
    const prompt = `Создай задание по ${dirMap[params.direction] ?? params.direction} для ${params.grade} класса. Предмет: ${params.subject}. Тема: «${params.topic}». Сложность: ${diffMap[params.difficulty] ?? params.difficulty}. Тип: ${isTest ? "тест с 4 вариантами (один правильный)" : "открытый ответ"}.\nВерни ТОЛЬКО JSON (без markdown): ${jsonSchema}`;

    const response = await this.client.messages.create({ model: this.model, max_tokens: 1024, system: GENERATION_PROMPT, messages: [{ role: "user", content: prompt }] });

    await this.recordUsage(userCtx, "fl_task", response.usage);

    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
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
    if (!this.client) {
      return { content: `КМЖ: ${subject}, ${grade} класс, тема: «${topic}», ${duration} мин.` };
    }

    const check = await this.checkLimit(userCtx, "generate_kmzh");

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: GENERATION_PROMPT,
      messages: [{
        role: "user",
        content: `Составь краткосрочный поурочный план (КМЖ/ҚМЖ) по формату МОН РК для ${grade} класса, предмет «${subject}», тема «${topic}», продолжительность ${duration} минут.
Включи: цели урока (по таксономии Блума), ожидаемые результаты, ресурсы, этапы урока (начало/середина/конец) с временем и описанием деятельности учителя и учеников, критерии оценивания, рефлексию.`,
      }],
    });

    await this.recordUsage(userCtx, "generate_kmzh", response.usage);

    const content = response.content[0].type === "text" ? response.content[0].text : "";
    return {
      content,
      ...(check?.warning ? { warning: true, warningMessage: check.message } : {}),
    };
  }
}
