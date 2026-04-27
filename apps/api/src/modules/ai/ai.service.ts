import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Ты ИИ-ассистент платформы Aqyl — цифровой школьной системы для казахстанских школ.
Ты помогаешь учителям и администраторам. Отвечай на казахском, русском или английском — в зависимости от языка вопроса.
Ты умеешь:
- Объяснять как пользоваться платформой
- Генерировать задания для учеников по предмету и классу
- Создавать краткосрочный поурочный план (КМЖ/ҚМЖ) по теме
- Давать советы по работе с учениками
- Анализировать данные успеваемости и давать рекомендации

Платформа Aqyl включает: журнал успеваемости, расписание, генератор заданий, открытые уроки, классные часы, протоколы, работу с одарёнными учениками.
Отвечай чётко, практично и по делу. Избегай лишних предисловий.`;

@Injectable()
export class AiChatService {
  private readonly client?: Anthropic;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("ANTHROPIC_API_KEY");
    this.model = this.configService.get<string>("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  async chat(message: string, context: string, pageContext: string): Promise<{ reply: string }> {
    if (!this.client) {
      return { reply: "ИИ-ассистент временно недоступен. Проверьте настройку ANTHROPIC_API_KEY." };
    }

    const pageHint = pageContext ? `\n[Пользователь находится на странице: ${pageContext}]` : "";
    const historyHint = context ? `\nИстория диалога:\n${context}\n` : "";

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT + pageHint + historyHint,
      messages: [{ role: "user", content: message }],
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "Не удалось получить ответ.";
    return { reply };
  }

  async generateAssignment(subject: string, grade: string, topic: string, type: string): Promise<{ content: string }> {
    if (!this.client) {
      return { content: `Задание по теме «${topic}» (${subject}, ${grade} класс):\n\n1. Ответьте на вопрос по теме.\n2. Выполните практическое задание.\n3. Сделайте вывод.` };
    }

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Создай ${type} для ${grade} класса по предмету «${subject}» на тему «${topic}». Задание должно быть чётким, конкретным и соответствовать возрасту учеников. Дай готовый текст задания.`,
      }],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";
    return { content };
  }

  async generateLessonPlan(subject: string, grade: string, topic: string, duration: number): Promise<{ content: string }> {
    if (!this.client) {
      return { content: `КМЖ: ${subject}, ${grade} класс, тема: «${topic}», ${duration} мин.` };
    }

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Составь краткосрочный поурочный план (КМЖ/ҚМЖ) по формату МОН РК для ${grade} класса, предмет «${subject}», тема «${topic}», продолжительность ${duration} минут.
Включи: цели урока (по таксономии Блума), ожидаемые результаты, ресурсы, этапы урока (начало/середина/конец) с временем и описанием деятельности учителя и учеников, критерии оценивания, рефлексию.`,
      }],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";
    return { content };
  }
}
