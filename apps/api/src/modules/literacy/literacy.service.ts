import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiteracySet, LiteracyType, LiteracyLang } from './entities/literacy-set.entity';
import { LiteracyQuestion } from './entities/literacy-question.entity';
import { LiteracyGeneratorService } from './literacy-generator.service';
import { sum } from './engine/literacy-validator';
import { PdfService } from '../lesson-plans/export/pdf.service';
import { literacyHtml } from './export/literacy-html';

export interface UserCtx { userId: string; schoolId: string | null; role?: string }

export interface CreateSetInput {
  literacyType: LiteracyType;
  subject?: string;
  grade?: number;
  language?: LiteracyLang;
  sourceMode?: 'own' | 'generated';
  sourceTopic?: string;
  sourceNotes?: string;
  questionCount?: number;
  pisaLevels?: number[];
  questionTypes?: string[];
}

@Injectable()
export class LiteracyService {
  private readonly logger = new Logger(LiteracyService.name);

  constructor(
    @InjectRepository(LiteracySet) private readonly setRepo: Repository<LiteracySet>,
    @InjectRepository(LiteracyQuestion) private readonly qRepo: Repository<LiteracyQuestion>,
    private readonly generator: LiteracyGeneratorService,
    private readonly pdf: PdfService,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────
  async createSet(ctx: UserCtx, input: CreateSetInput): Promise<LiteracySet> {
    const set = this.setRepo.create({
      userId: ctx.userId,
      schoolId: ctx.schoolId,
      lessonId: null,
      literacyType: input.literacyType,
      subject: input.subject,
      grade: input.grade,
      language: input.language ?? 'ru',
      sourceMode: input.sourceMode ?? 'generated',
      sourceTopic: input.sourceTopic ?? null,
      sourceNotes: input.sourceNotes ?? null,
      questionCount: input.questionCount ?? 6,
      pisaLevels: input.pisaLevels ?? [],
      questionTypes: input.questionTypes ?? [],
      status: 'draft',
    });
    return this.setRepo.save(set);
  }

  async list(ctx: UserCtx) {
    return this.setRepo.find({ where: { userId: ctx.userId }, order: { updatedAt: 'DESC' } });
  }

  async getOne(id: string, ctx: UserCtx): Promise<LiteracySet> {
    const set = await this.setRepo.findOne({ where: { id, userId: ctx.userId } });
    if (!set) throw new HttpException('Набор не найден', HttpStatus.NOT_FOUND);
    set.questions = await this.qRepo.find({ where: { setId: id }, order: { order: 'ASC' } });
    return set;
  }

  // ── Stimulus (mode A own / mode B generated) ────────────────────
  async setStimulus(id: string, ctx: UserCtx, body: { mode: 'own' | 'generated'; text?: string }): Promise<LiteracySet> {
    const set = await this.own(id, ctx);
    if (body.mode === 'own') {
      const text = (body.text ?? '').trim();
      if (text.length < 200) throw new HttpException('Текст слишком короткий (мин. ~200 символов)', HttpStatus.UNPROCESSABLE_ENTITY);
      if (text.length > 15000) throw new HttpException('Текст слишком длинный (макс. ~15 000 символов)', HttpStatus.UNPROCESSABLE_ENTITY);
      // Dual-call: Haiku analyses the pasted material (best-effort, informs the teacher).
      await this.generator.analyzeMaterial(text, set.language, { userId: ctx.userId, schoolId: ctx.schoolId });
      await this.setRepo.update({ id, userId: ctx.userId }, { sourceMode: 'own', stimulusText: text, stimulusData: null });
    } else {
      const { stimulusText, stimulusData } = await this.generator.generateStimulus({
        literacyType: set.literacyType, subject: set.subject, grade: set.grade,
        language: set.language, sourceTopic: set.sourceTopic, sourceNotes: set.sourceNotes,
      }, { userId: ctx.userId, schoolId: ctx.schoolId });
      await this.setRepo.update({ id, userId: ctx.userId }, { sourceMode: 'generated', stimulusText, stimulusData } as never);
    }
    return this.getOne(id, ctx);
  }

  // ── Generation (async) ──────────────────────────────────────────
  async startGeneration(id: string, ctx: UserCtx): Promise<{ status: string }> {
    const set = await this.own(id, ctx);
    if (!set.stimulusText?.trim()) throw new HttpException('Сначала задайте стимульный материал', HttpStatus.BAD_REQUEST);
    await this.setRepo.update({ id, userId: ctx.userId }, { status: 'generating', generationError: null });
    void this.runGeneration(id).catch(async (err) => {
      this.logger.error(`Literacy set ${id} failed: ${(err as Error).message}`);
      await this.setRepo.update(id, { status: 'error', generationError: (err as Error).message?.slice(0, 500) });
    });
    return { status: 'generating' };
  }

  private async runGeneration(id: string): Promise<void> {
    const set = await this.setRepo.findOne({ where: { id } });
    if (!set) return;
    const result = await this.generator.generateQuestions({
      stimulusText: set.stimulusText, stimulusData: set.stimulusData ?? undefined,
      literacyType: set.literacyType, grade: set.grade, questionCount: set.questionCount,
      pisaLevels: set.pisaLevels?.length ? set.pisaLevels : [2, 3, 4],
      questionTypes: set.questionTypes?.length ? set.questionTypes : ['single', 'short', 'open'],
      language: set.language,
    }, { userId: set.userId, schoolId: set.schoolId ?? null });
    // result.ok is guaranteed true (generator throws otherwise) — CODE owns the invariant.
    await this.qRepo.delete({ setId: id });
    await this.qRepo.save(result.questions.map((q, i) => this.qRepo.create({
      setId: id, order: i, questionText: q.questionText, questionType: q.questionType,
      pisaLevel: q.pisaLevel, points: q.points, options: q.options, correctAnswer: q.correctAnswer, answerCriteria: q.answerCriteria,
    })));
    await this.setRepo.update(id, { status: 'ready', totalPoints: result.totalPoints });
  }

  // ── Per-question actions ────────────────────────────────────────
  async regenerateQuestion(id: string, qid: string, ctx: UserCtx): Promise<LiteracySet> {
    const set = await this.own(id, ctx);
    const q = await this.qRepo.findOne({ where: { id: qid, setId: id } });
    if (!q) throw new HttpException('Вопрос не найден', HttpStatus.NOT_FOUND);
    const fresh = await this.generator.regenerateQuestion({
      stimulusText: set.stimulusText, stimulusData: set.stimulusData ?? undefined,
      literacyType: set.literacyType, grade: set.grade, questionCount: 1,
      pisaLevels: set.pisaLevels?.length ? set.pisaLevels : [q.pisaLevel],
      questionTypes: set.questionTypes?.length ? set.questionTypes : [q.questionType],
      language: set.language,
    }, { userId: ctx.userId, schoolId: ctx.schoolId });
    await this.qRepo.update(qid, {
      questionText: fresh.questionText, questionType: fresh.questionType, pisaLevel: fresh.pisaLevel,
      points: fresh.points, options: fresh.options, correctAnswer: fresh.correctAnswer, answerCriteria: fresh.answerCriteria,
    } as never);
    await this.recomputeTotal(id);
    return this.getOne(id, ctx);
  }

  async deleteQuestion(id: string, qid: string, ctx: UserCtx): Promise<LiteracySet> {
    await this.own(id, ctx);
    await this.qRepo.delete({ id: qid, setId: id });
    await this.recomputeTotal(id);
    return this.getOne(id, ctx);
  }

  private async recomputeTotal(id: string): Promise<void> {
    const qs = await this.qRepo.find({ where: { setId: id } });
    await this.setRepo.update(id, { totalPoints: sum(qs) });
  }

  private async own(id: string, ctx: UserCtx): Promise<LiteracySet> {
    const set = await this.setRepo.findOne({ where: { id, userId: ctx.userId } });
    if (!set) throw new HttpException('Набор не найден', HttpStatus.NOT_FOUND);
    return set;
  }

  // ── Export (PDF, ТЗ 2.2 A): student (no keys) / teacher (full) ──
  // Фирменный HTML→PDF, переиспользует дизайн-систему и рендер раздаток.
  async exportPdf(id: string, ctx: UserCtx, mode: 'student' | 'teacher'): Promise<Buffer> {
    const set = await this.getOne(id, ctx);
    return this.pdf.render(literacyHtml(set, mode));
  }
}
