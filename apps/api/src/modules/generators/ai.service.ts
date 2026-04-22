import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { GenerateLessonPlanDto } from "./dto/generate-lesson-plan.dto";
import { GenerateTaskSetDto } from "./dto/generate-task-set.dto";

@Injectable()
export class AiService {
  private readonly client?: Anthropic;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("ANTHROPIC_API_KEY");
    this.model = this.configService.get<string>("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  async generateLessonPlan(input: GenerateLessonPlanDto) {
    if (!this.client) return this.buildFallbackLessonPlan(input);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: "You are a school teacher assistant. Respond ONLY with valid JSON, no markdown, no extra text.",
        messages: [
          {
            role: "user",
            content: `Create a ${input.language} lesson plan for grade ${input.grade} ${input.subject} on "${input.topic}" (${input.duration} min). Objectives: ${input.objectives ?? "practical understanding"}.
Return JSON with keys: title, subject, grade, duration, objectives(array), materials(array), stages(array of {name,duration,teacherActivity,studentActivity,assessment}), homework.`,
          },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      return JSON.parse(text);
    } catch {
      return this.buildFallbackLessonPlan(input);
    }
  }

  async generateTaskSet(input: GenerateTaskSetDto) {
    if (!this.client) return this.buildFallbackTaskSet(input);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: "You are a school teacher assistant. Respond ONLY with valid JSON, no markdown, no extra text.",
        messages: [
          {
            role: "user",
            content: `Create a ${input.language} ${input.type} for grade ${input.grade} ${input.subject} on "${input.topic}". Generate ${input.questionCount ?? 5} questions.
Return JSON with keys: title, topic, type, questions(array of {prompt, answer}).`,
          },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      return JSON.parse(text);
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
