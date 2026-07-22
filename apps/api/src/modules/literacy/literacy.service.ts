import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiteracySet, LiteracyType, LiteracyLang } from './entities/literacy-set.entity';
import { LiteracyQuestion } from './entities/literacy-question.entity';
import { LiteracyGeneratorService } from './literacy-generator.service';
import { sum } from './engine/literacy-validator';

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
      await this.generator.analyzeMaterial(text, set.language);
      await this.setRepo.update({ id, userId: ctx.userId }, { sourceMode: 'own', stimulusText: text, stimulusData: null });
    } else {
      const { stimulusText, stimulusData } = await this.generator.generateStimulus({
        literacyType: set.literacyType, subject: set.subject, grade: set.grade,
        language: set.language, sourceTopic: set.sourceTopic, sourceNotes: set.sourceNotes,
      });
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
    });
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
    });
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

  // ── Export (.docx): student (no keys) / teacher (full) ──────────
  async exportDocx(id: string, ctx: UserCtx, mode: 'student' | 'teacher'): Promise<Buffer> {
    const set = await this.getOne(id, ctx);
    const teacher = mode === 'teacher';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel } =
      require('docx') as typeof import('docx');

    const p = (text: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) =>
      new Paragraph({ children: [new TextRun({ text: text ?? '', bold: o.bold, italics: o.italics, size: o.size ?? 20 })] });

    const TYPE_LABEL: Record<string, string> = { reading: 'Читательская', math: 'Математическая', science: 'Естественно-научная' };
    const children: (import('docx').Paragraph | import('docx').Table)[] = [
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: `Функциональная грамотность — ${TYPE_LABEL[set.literacyType] ?? set.literacyType}`, bold: true })] }),
      p(`Предмет: ${set.subject ?? '—'} · Класс: ${set.grade ?? '—'}${teacher ? ` · Всего баллов: ${set.totalPoints}` : ''}`),
      p(''),
      p('Стимульный материал', { bold: true, size: 24 }),
    ];
    (set.stimulusText ?? '').split('\n').forEach((line) => children.push(p(line)));

    // Optional data tables (math/science)
    const tables = (set.stimulusData as { tables?: { title?: string; columns?: string[]; rows?: string[][] }[] } | null)?.tables;
    if (Array.isArray(tables)) {
      const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
      const borders = { top: border, bottom: border, left: border, right: border };
      for (const tbl of tables) {
        if (tbl.title) children.push(p(tbl.title, { bold: true }));
        const head = new TableRow({ children: (tbl.columns ?? []).map((c) => new TableCell({ borders, children: [p(c, { bold: true })] })) });
        const rows = (tbl.rows ?? []).map((r) => new TableRow({ children: r.map((c) => new TableCell({ borders, children: [p(String(c))] })) }));
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [head, ...rows] }));
      }
    }

    children.push(p(''));
    children.push(p('Вопросы', { bold: true, size: 24 }));
    const fmt = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v));
    (set.questions ?? []).forEach((q, i) => {
      const meta = teacher ? `  [PISA ${q.pisaLevel} · ${q.points} б.]` : '';
      children.push(p(`${i + 1}. ${q.questionText}${meta}`, { bold: true }));
      if (Array.isArray(q.options)) {
        (q.options as unknown[]).forEach((o, j) => children.push(p(`    ${String.fromCharCode(65 + j)}) ${fmt(o)}`)));
      }
      if (teacher) {
        children.push(p(`    Ключ: ${fmt(q.correctAnswer)}`, { italics: true }));
        if (q.answerCriteria) children.push(p(`    Критерий: ${q.answerCriteria}`, { italics: true }));
      } else {
        children.push(p('    Ответ: ______________________________'));
      }
    });

    const doc = new Document({ sections: [{ children }] });
    return Packer.toBuffer(doc);
  }
}
