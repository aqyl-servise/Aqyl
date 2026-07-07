import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Questionnaire } from "../schools/entities/questionnaire.entity";
import { QuestionnaireResponse } from "../schools/entities/questionnaire-response.entity";
import { AiClientService } from "../../services/ai-client.service";

@Injectable()
export class QuestionnairesService {
  constructor(
    @InjectRepository(Questionnaire) private readonly questionnaireRepo: Repository<Questionnaire>,
    @InjectRepository(QuestionnaireResponse) private readonly responseRepo: Repository<QuestionnaireResponse>,
    private readonly ai: AiClientService,
  ) {}

  async getAll(schoolId: string) {
    return this.questionnaireRepo.find({
      where: { schoolId },
      order: { createdAt: "DESC" },
    });
  }

  async getOne(id: string, schoolId?: string | null) {
    const q = await this.questionnaireRepo.findOne({ where: schoolId ? { id, schoolId } : { id } });
    if (!q) throw new NotFoundException("Questionnaire not found");
    return q;
  }

  async create(data: Partial<Questionnaire>) {
    return this.questionnaireRepo.save(this.questionnaireRepo.create(data));
  }

  async update(id: string, data: Partial<Questionnaire>, schoolId?: string | null) {
    const res = await this.questionnaireRepo.update(schoolId ? { id, schoolId } : { id }, data);
    if (!res.affected) throw new NotFoundException("Questionnaire not found");
    return this.getOne(id, schoolId);
  }

  async remove(id: string, schoolId?: string | null) {
    const res = await this.questionnaireRepo.delete(schoolId ? { id, schoolId } : { id });
    if (!res.affected) throw new NotFoundException("Questionnaire not found");
  }

  async assign(id: string, classroomIds: string[], schoolId?: string | null) {
    const res = await this.questionnaireRepo.update(schoolId ? { id, schoolId } : { id }, {
      assignedClassroomIds: classroomIds,
      status: "assigned",
    });
    if (!res.affected) throw new NotFoundException("Questionnaire not found");
    return this.getOne(id, schoolId);
  }

  async getResponses(questionnaireId: string, schoolId?: string | null) {
    // Verify the questionnaire belongs to the caller's school before exposing responses.
    await this.getOne(questionnaireId, schoolId);
    return this.responseRepo.find({ where: { questionnaireId }, order: { createdAt: "DESC" } });
  }

  async submitResponse(questionnaireId: string, studentId: string, answers: unknown) {
    const existing = await this.responseRepo.findOne({ where: { questionnaireId, studentId } });
    if (existing) {
      await this.responseRepo.update(existing.id, { answers: answers as never, submittedAt: new Date() });
      return this.responseRepo.findOne({ where: { id: existing.id } });
    }
    return this.responseRepo.save(this.responseRepo.create({
      questionnaireId,
      studentId,
      answers: answers as never,
      submittedAt: new Date(),
    }));
  }

  async getStudentQuestionnaires(classroomId: string) {
    return this.questionnaireRepo
      .createQueryBuilder("q")
      .where("q.status IN (:...statuses)", { statuses: ["assigned", "completed"] })
      .andWhere(`:cid = ANY(q."assignedClassroomIds")`, { cid: classroomId })
      .orderBy("q.createdAt", "DESC")
      .getMany();
  }

  async generateAi(schoolId: string, createdBy: string, params: {
    topic: string; grade: number; questionCount: number; questionType: string;
  }) {
    const prompt = `Создай анкету/опросник для ${params.grade}-го класса по теме "${params.topic}".
Количество вопросов: ${params.questionCount}.
Тип вопросов: ${params.questionType}.
Верни JSON формата:
{
  "title": "название анкеты",
  "description": "краткое описание",
  "questions": [
    { "id": 1, "text": "текст вопроса", "type": "multiple_choice|text|scale", "options": ["вариант1","вариант2"] }
  ]
}
Только JSON, без пояснений.`;

    const result = await this.ai.request({
      action: "assistant_chat",
      systemPrompt: "Ты педагогический психолог, создаёшь анкеты и опросники для школьников.",
      messages: [{ role: "user", content: prompt }],
      maxTokens: 2000,
    });

    let parsed: { title: string; description: string; questions: unknown[] };
    try {
      const match = result.content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : result.content);
    } catch {
      parsed = { title: `Анкета: ${params.topic}`, description: "", questions: [] };
    }

    return this.questionnaireRepo.save(this.questionnaireRepo.create({
      schoolId,
      createdBy,
      title: parsed.title,
      description: parsed.description,
      content: JSON.stringify(parsed.questions),
      type: "ai_generated",
      status: "draft",
    }));
  }

  async analyzeResponses(id: string, schoolId?: string | null) {
    const [questionnaire, responses] = await Promise.all([
      this.getOne(id, schoolId),
      this.getResponses(id, schoolId),
    ]);

    if (responses.length === 0) {
      return { analysis: "Нет ответов для анализа." };
    }

    const prompt = `Анкета: "${questionnaire.title}"
Вопросы: ${questionnaire.content}
Количество респондентов: ${responses.length}
Ответы: ${JSON.stringify(responses.map(r => r.answers))}

Проведи краткий анализ результатов анкетирования. Выдели основные тенденции, проблемные зоны и рекомендации. Ответ на русском языке, 3-5 абзацев.`;

    const result = await this.ai.request({
      action: "assistant_chat",
      systemPrompt: "Ты педагогический психолог-аналитик.",
      messages: [{ role: "user", content: prompt }],
      maxTokens: 1500,
    });

    await this.questionnaireRepo.update(id, { aiAnalysisResult: result.content });
    return { analysis: result.content };
  }
}
