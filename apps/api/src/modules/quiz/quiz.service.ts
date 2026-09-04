import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Quiz } from "./entities/quiz.entity";
import { QuizQuestion } from "./entities/quiz-question.entity";
import { QuizGeneratorService, MAX_QUESTIONS, type GenerateInput } from "./quiz-generator.service";
import { questionProblem } from "./quiz-validation";

export interface Ctx { userId: string; schoolId?: string | null }

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz) private readonly quizRepo: Repository<Quiz>,
    @InjectRepository(QuizQuestion) private readonly questionRepo: Repository<QuizQuestion>,
    private readonly generator: QuizGeneratorService,
  ) {}

  /** Создать квиз по теме: генерация, проверка, сохранение. */
  async create(ctx: Ctx, input: GenerateInput & { title?: string }): Promise<Quiz> {
    const topic = (input.topic ?? "").trim();
    if (!topic) throw new BadRequestException("Укажите тему квиза");

    const { questions } = await this.generator.generate(
      { ...input, topic },
      { userId: ctx.userId, schoolId: ctx.schoolId },
    );

    const quiz = await this.quizRepo.save(this.quizRepo.create({
      teacherId: ctx.userId,
      title: (input.title ?? topic).trim().slice(0, 200),
      subject: input.subject?.trim() || undefined,
      grade: input.grade?.trim() || undefined,
      language: input.language || "ru",
    }));

    await this.questionRepo.save(questions.map((q, i) => this.questionRepo.create({
      quizId: quiz.id, order: i, text: q.text, options: q.options, correctIndex: q.correctIndex,
    })));

    return this.getOne(quiz.id, ctx);
  }

  async list(ctx: Ctx): Promise<Quiz[]> {
    return this.quizRepo.find({
      where: { teacherId: ctx.userId },
      order: { createdAt: "DESC" },
    });
  }

  async getOne(id: string, ctx: Ctx): Promise<Quiz> {
    const quiz = await this.quizRepo.findOne({ where: { id, teacherId: ctx.userId } });
    if (!quiz) throw new NotFoundException("Квиз не найден");
    quiz.questions = await this.questionRepo.find({ where: { quizId: id }, order: { order: "ASC" } });
    return quiz;
  }

  async rename(id: string, ctx: Ctx, title: string): Promise<Quiz> {
    await this.getOne(id, ctx);
    const clean = (title ?? "").trim();
    if (!clean) throw new BadRequestException("Название не может быть пустым");
    await this.quizRepo.update({ id }, { title: clean.slice(0, 200) });
    return this.getOne(id, ctx);
  }

  /**
   * Правка вопроса учителем. Проходит ту же проверку, что и генерация:
   * учитель тоже может оставить два одинаковых варианта или сбить номер
   * правильного ответа, удалив вариант.
   */
  async updateQuestion(
    id: string, questionId: string, ctx: Ctx,
    patch: { text?: string; options?: string[]; correctIndex?: number },
  ): Promise<Quiz> {
    await this.getOne(id, ctx);
    const q = await this.questionRepo.findOne({ where: { id: questionId, quizId: id } });
    if (!q) throw new NotFoundException("Вопрос не найден");

    const next = {
      text: patch.text ?? q.text,
      options: patch.options ?? q.options,
      correctIndex: patch.correctIndex ?? q.correctIndex,
    };
    const problem = questionProblem(next);
    if (problem) throw new BadRequestException(`Вопрос не сохранён: ${problem}`);

    await this.questionRepo.update({ id: questionId }, next);
    return this.getOne(id, ctx);
  }

  async deleteQuestion(id: string, questionId: string, ctx: Ctx): Promise<Quiz> {
    const quiz = await this.getOne(id, ctx);
    if (quiz.questions.length <= 1) {
      throw new BadRequestException("В квизе должен остаться хотя бы один вопрос");
    }
    await this.questionRepo.delete({ id: questionId, quizId: id });
    await this.renumber(id);
    return this.getOne(id, ctx);
  }

  /** Догенерировать вопросы к существующему квизу. */
  async addQuestions(id: string, ctx: Ctx, count: number): Promise<Quiz> {
    const quiz = await this.getOne(id, ctx);
    const room = MAX_QUESTIONS - quiz.questions.length;
    if (room <= 0) throw new BadRequestException(`В квизе уже ${MAX_QUESTIONS} вопросов`);

    const { questions } = await this.generator.generate(
      {
        topic: quiz.title, subject: quiz.subject, grade: quiz.grade,
        language: quiz.language, count: Math.min(count, room),
      },
      { userId: ctx.userId, schoolId: ctx.schoolId },
    );

    const from = quiz.questions.length;
    await this.questionRepo.save(questions.map((q, i) => this.questionRepo.create({
      quizId: id, order: from + i, text: q.text, options: q.options, correctIndex: q.correctIndex,
    })));
    return this.getOne(id, ctx);
  }

  async remove(id: string, ctx: Ctx): Promise<{ ok: true }> {
    await this.getOne(id, ctx);
    await this.quizRepo.delete({ id });
    return { ok: true };
  }

  /** После удаления порядок обязан остаться сплошным: по нему идёт показ. */
  private async renumber(quizId: string): Promise<void> {
    const rest = await this.questionRepo.find({ where: { quizId }, order: { order: "ASC" } });
    await Promise.all(rest.map((q, i) => (
      q.order === i ? Promise.resolve() : this.questionRepo.update({ id: q.id }, { order: i })
    )));
  }
}
