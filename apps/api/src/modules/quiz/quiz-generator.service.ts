import { Injectable, Logger } from "@nestjs/common";
import { AiClientService } from "../../services/ai-client.service";
import { checkKazakhStructure, hardViolations, describeGateViolations } from "../lesson-plans/engine/language-gate";
import { siftQuestions, type CleanQuestion, MIN_OPTIONS, MAX_OPTIONS } from "./quiz-validation";

export interface GenerateInput {
  topic: string;
  subject?: string;
  grade?: string;
  language: string;
  count: number;
}

/** Максимум вопросов за один заход — дальше растёт риск обрыва ответа. */
export const MAX_QUESTIONS = 15;

/**
 * Структурированный вывод, а не JSON в тексте. На текстовом разборе мы уже
 * теряли целые генерации: ответ обрывался по лимиту токенов, и разбор молча
 * возвращал пусто, хотя деньги за вызов списывались.
 */
const QUIZ_TOOL = {
  name: "quiz_questions",
  description: "Вернуть вопросы квиза с вариантами ответов",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "Текст вопроса" },
            options: {
              type: "array",
              items: { type: "string" },
              minItems: MIN_OPTIONS,
              maxItems: MAX_OPTIONS,
              description: "Варианты ответа, все разные",
            },
            correctIndex: {
              type: "integer",
              description: "Номер правильного варианта в options, начиная с нуля",
            },
          },
          required: ["text", "options", "correctIndex"],
        },
      },
    },
    required: ["questions"],
  },
} as const;

const LANG_NAME: Record<string, string> = { ru: "русском", kz: "казахском", en: "английском" };

function systemPrompt(input: GenerateInput): string {
  const lang = LANG_NAME[input.language] ?? "русском";
  return [
    `Ты составляешь вопросы школьного квиза на ${lang} языке.`,
    input.subject ? `Предмет: ${input.subject}.` : "",
    input.grade ? `Класс: ${input.grade}.` : "",
    "",
    "Требования к каждому вопросу:",
    `— один правильный ответ и ${MIN_OPTIONS}–${MAX_OPTIONS} варианта;`,
    "— неправильные варианты правдоподобны, но однозначно неверны;",
    "— варианты не повторяют друг друга и не пересекаются по смыслу;",
    "— вопрос понятен без дополнительных материалов: ученик видит его на телефоне;",
    "— короткие формулировки: вопрос до 20 слов, вариант до 8 слов.",
    input.language === "kz"
      ? "\nКазахский язык: только устоявшаяся казахская терминология, без калек с русского."
      : "",
  ].filter(Boolean).join("\n");
}

@Injectable()
export class QuizGeneratorService {
  private readonly logger = new Logger(QuizGeneratorService.name);

  constructor(private readonly ai: AiClientService) {}

  /**
   * Сгенерировать вопросы. Возвращает только прошедшие проверку: показать
   * классу вопрос с двумя одинаковыми вариантами хуже, чем показать на один
   * вопрос меньше.
   */
  async generate(
    input: GenerateInput,
    ctx: { userId?: string | null; schoolId?: string | null } = {},
  ): Promise<{ questions: CleanQuestion[]; rejected: number }> {
    const count = Math.min(Math.max(1, Math.trunc(input.count)), MAX_QUESTIONS);

    const res = await this.ai.requestTool<{ questions: unknown[] }>(
      {
        action: "quiz_generate",
        systemPrompt: systemPrompt(input),
        messages: [{
          role: "user",
          content: `Тема: ${input.topic}\nСоставь ${count} вопросов.`,
        }],
        userId: ctx.userId ?? null,
        schoolId: ctx.schoolId ?? null,
      },
      QUIZ_TOOL as unknown as { name: string; description: string; input_schema: Record<string, unknown> },
    );

    const { ok, rejected } = siftQuestions(res.data?.questions);
    if (rejected.length) {
      this.logger.warn(
        `Квиз «${input.topic}»: отброшено ${rejected.length} из ${rejected.length + ok.length} — ` +
        rejected.map((r) => `#${r.index}: ${r.reason}`).join("; "),
      );
    }

    // Казахские тексты проходят тот же шлюз, что и материалы урока: вопрос с
    // калькой попадёт на проектор перед классом.
    const clean = input.language === "kz" ? this.dropRussianCalques(ok) : ok;

    if (!clean.length) {
      throw new Error("Модель не вернула ни одного пригодного вопроса");
    }
    return { questions: clean, rejected: ok.length - clean.length + rejected.length };
  }

  /** Убрать вопросы с русскими корнями и семантическими ловушками. */
  private dropRussianCalques(questions: CleanQuestion[]): CleanQuestion[] {
    return questions.filter((q) => {
      const violations = hardViolations(checkKazakhStructure([q.text, ...q.options]));
      if (!violations.length) return true;
      this.logger.warn(`Квиз: вопрос отброшен языковым шлюзом — ${describeGateViolations(violations)}`);
      return false;
    });
  }
}
