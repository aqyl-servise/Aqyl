import { Injectable, Optional } from "@nestjs/common";
import { AiClientService } from "../../services/ai-client.service";
import { buildPrompt } from "../../utils/prompt-builder";
import { GenerateLessonPlanDto } from "./dto/generate-lesson-plan.dto";
import { GenerateTaskSetDto } from "./dto/generate-task-set.dto";
import { TokenService } from "../tokens/token.service";

interface UserCtx { schoolId?: string | null; userId?: string | null }

@Injectable()
export class AiService {
  constructor(
    private readonly aiClientService: AiClientService,
    @Optional() private readonly tokenService?: TokenService,
  ) {}

  async generateLessonPlan(input: GenerateLessonPlanDto, userCtx?: UserCtx) {
    if (!this.aiClientService.isConfigured) return this.buildFallbackLessonPlan(input);

    try {
      const systemPrompt = buildPrompt('kmzh', {
        subject: input.subject || '',
        class: String(input.grade || ''),
        topic: input.topic || '',
        language: input.language || 'ru',
        date: new Date().toLocaleDateString('ru-RU'),
        teacher_name: 'Учитель',
      });

      const result = await this.aiClientService.request({
        action: "kmzh_generate",
        systemPrompt,
        messages: [
          {
            role: "user",
            content: `Create a ${input.language} lesson plan for grade ${input.grade} ${input.subject} on "${input.topic}" (${input.duration} min). Objectives: ${input.objectives ?? "practical understanding"}.
Respond ONLY with valid JSON, no markdown, no extra text. Keys: title, subject, grade, duration, objectives(array), materials(array), stages(array of {name,duration,teacherActivity,studentActivity,assessment}), homework.`,
          },
        ],
      });

      this.tokenService?.deductTokens({
        schoolId: userCtx?.schoolId,
        userId: userCtx?.userId,
        inputTokens: result.tokensIn,
        outputTokens: result.tokensOut,
        actionType: "kmzh_generate",
        model: result.model,
        costUsd: this.tokenService.calculateCost({ input_tokens: result.tokensIn, output_tokens: result.tokensOut }, result.model),
      }).catch(() => {});

      return JSON.parse(result.content);
    } catch {
      return this.buildFallbackLessonPlan(input);
    }
  }

  async generateTaskSet(input: GenerateTaskSetDto, userCtx?: UserCtx) {
    if (!this.aiClientService.isConfigured) return this.buildFallbackTaskSet(input);

    try {
      const systemPrompt = buildPrompt('task_generate', {
        subject: input.subject || '',
        class: String(input.grade || ''),
        topic: input.topic || '',
        task_type: input.type === 'quiz' ? 'тест' : input.type === 'test' ? 'контрольная' : 'упражнение',
        difficulty: 'средний',
        language: input.language || 'ru',
        max_score: '10',
      });

      const result = await this.aiClientService.request({
        action: "task_generate",
        systemPrompt,
        messages: [
          {
            role: "user",
            content: `Create a ${input.language} ${input.type} for grade ${input.grade} ${input.subject} on "${input.topic}". Generate ${input.questionCount ?? 5} questions.
Respond ONLY with valid JSON, no markdown, no extra text. Keys: title, topic, type, questions(array of {prompt, answer}).`,
          },
        ],
      });

      this.tokenService?.deductTokens({
        schoolId: userCtx?.schoolId,
        userId: userCtx?.userId,
        inputTokens: result.tokensIn,
        outputTokens: result.tokensOut,
        actionType: "task_generate",
        model: result.model,
        costUsd: this.tokenService.calculateCost({ input_tokens: result.tokensIn, output_tokens: result.tokensOut }, result.model),
      }).catch(() => {});

      return JSON.parse(result.content);
    } catch {
      return this.buildFallbackTaskSet(input);
    }
  }

  private buildFallbackLessonPlan(input: GenerateLessonPlanDto) {
    return {
      title: `${input.subject}: ${input.topic}`,
      subject: input.subject,
      grade: input.grade,
      duration: input.duration,
      objectives: [
        `Объяснить основную идею темы: ${input.topic}.`,
        "Отработать навык через направляемые задачи.",
        "Проверить понимание с помощью рефлексии.",
      ],
      materials: ["Слайды", "Рабочая тетрадь", "Доска", "Карточки выхода"],
      stages: [
        {
          name: "Разминка",
          duration: "5 мин",
          teacherActivity: "Активировать предыдущие знания короткими вопросами.",
          studentActivity: "Отвечать устно, сравнивать подходы.",
          assessment: "Наблюдение",
        },
        {
          name: "Новый материал",
          duration: `${Math.max(input.duration - 20, 15)} мин`,
          teacherActivity: `Объяснить основные шаги по теме «${input.topic}» с примерами.`,
          studentActivity: "Делать заметки, задавать вопросы.",
          assessment: "Целевые вопросы",
        },
        {
          name: "Практика",
          duration: "10 мин",
          teacherActivity: "Дать дифференцированные задания в парах.",
          studentActivity: "Решать задачи, обсуждать решения.",
          assessment: "Взаимопроверка",
        },
        {
          name: "Рефлексия",
          duration: "5 мин",
          teacherActivity: "Подвести итог, выдать карточку выхода.",
          studentActivity: "Записать один вывод и одну трудность.",
          assessment: "Карточка выхода",
        },
      ],
      homework: `Выполнить 3 задачи по теме «${input.topic}».`,
    };
  }

  private buildFallbackTaskSet(input: GenerateTaskSetDto) {
    const questionCount = input.questionCount ?? 5;
    return {
      title: `${input.type}: ${input.topic}`,
      topic: input.topic,
      type: input.type,
      questions: Array.from({ length: questionCount }, (_, i) => ({
        prompt: `${i + 1}. Задача по теме «${input.topic}» (${input.subject}, ${input.grade} класс).`,
        answer: `Образец ответа ${i + 1}: объяснить метод и показать результат.`,
      })),
    };
  }
}
