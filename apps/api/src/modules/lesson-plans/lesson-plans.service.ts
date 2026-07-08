import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { LessonStage, StageType } from './entities/lesson-stage.entity';
import { Descriptor } from './entities/descriptor.entity';
import { ToolCatalog } from './entities/tool-catalog.entity';
import { ValueLinkReference } from './entities/value-link-reference.entity';
import { AiClientService } from '../../services/ai-client.service';
import {
  distributeLessonPoints,
  adjustDescriptorSum,
  hasEnoughAssessed,
  StagePointsProposal,
} from './engine/points-engine';
import {
  LessonContext,
  objectivesPrompt,
  pointsPrompt,
  stagePrompt,
  descriptorsPrompt,
} from './prompts/lesson-prompts';

export interface UserCtx {
  userId: string;
  schoolId: string | null;
  role?: string;
}

export interface StageInput {
  stageType: StageType;
  toolId?: string;
  timeMinutes: number;
}

const STAGE_ORDER: StageType[] = ['warmup', 'explanation', 'task', 'quiz', 'reflection'];
const ASSESSED_TYPES: StageType[] = ['task', 'quiz'];

@Injectable()
export class LessonPlansService {
  private readonly logger = new Logger(LessonPlansService.name);

  constructor(
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(LessonStage) private readonly stageRepo: Repository<LessonStage>,
    @InjectRepository(Descriptor) private readonly descRepo: Repository<Descriptor>,
    @InjectRepository(ToolCatalog) private readonly toolRepo: Repository<ToolCatalog>,
    @InjectRepository(ValueLinkReference) private readonly valueRepo: Repository<ValueLinkReference>,
    private readonly ai: AiClientService,
  ) {}

  // ── Reference data ──────────────────────────────────────────────
  async getTools() {
    const tools = await this.toolRepo.find({ order: { stageType: 'ASC', sortOrder: 'ASC' } });
    const byStage: Record<string, ToolCatalog[]> = {};
    for (const t of tools) (byStage[t.stageType] ??= []).push(t);
    return { stages: STAGE_ORDER, tools: byStage };
  }

  async getValueForMonth(month: string): Promise<ValueLinkReference | null> {
    return this.valueRepo.findOne({ where: { month } });
  }

  // ── CRUD ────────────────────────────────────────────────────────
  async createDraft(ctx: UserCtx, header: Partial<Lesson>): Promise<Lesson> {
    const lesson = this.lessonRepo.create({
      ...this.pickHeader(header),
      userId: ctx.userId,
      schoolId: ctx.schoolId,
      status: 'draft',
    });
    return this.lessonRepo.save(lesson);
  }

  async updateHeader(id: string, ctx: UserCtx, patch: Partial<Lesson>): Promise<Lesson> {
    await this.own(id, ctx);
    // resolve value text if a month was set
    const data = this.pickHeader(patch);
    if (patch.valueMonth) {
      const v = await this.getValueForMonth(patch.valueMonth);
      if (v) data.valueLink = v.valueRu;
    }
    await this.lessonRepo.update({ id, userId: ctx.userId }, data);
    return this.getOne(id, ctx);
  }

  async list(ctx: UserCtx) {
    return this.lessonRepo.find({
      where: { userId: ctx.userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async getOne(id: string, ctx: UserCtx): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id, userId: ctx.userId } });
    if (!lesson) throw new HttpException('Урок не найден', HttpStatus.NOT_FOUND);
    const stages = await this.stageRepo.find({ where: { lessonId: id }, order: { order: 'ASC' } });
    for (const s of stages) {
      s.descriptors = await this.descRepo.find({ where: { stageId: s.id }, order: { order: 'ASC' } });
    }
    lesson.stages = stages;
    return lesson;
  }

  // ── Export №130 (.docx) ─────────────────────────────────────────
  async exportDocx(id: string, ctx: UserCtx): Promise<Buffer> {
    const lesson = await this.getOne(id, ctx);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel } =
      require('docx') as typeof import('docx');

    const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
    const borders = { top: border, bottom: border, left: border, right: border };
    const p = (text: string, bold = false) => new Paragraph({ children: [new TextRun({ text: text ?? '', bold, size: 20 })] });
    const cell = (children: import('docx').Paragraph[], widthDxa?: number) =>
      new TableCell({ borders, ...(widthDxa ? { width: { size: widthDxa, type: WidthType.DXA } } : {}), children });

    // Header rows (label | value)
    const hRow = (label: string, value: string) =>
      new TableRow({ children: [cell([p(label, true)], 3200), cell([p(value)], 6800)] });

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        hRow('Short term plan', lesson.unit ? `Unit: ${lesson.unit}` : ''),
        hRow('Lesson №', lesson.lessonNumber ?? ''),
        hRow('Teacher name', lesson.teacherName ?? ''),
        hRow('Date', lesson.date ?? ''),
        hRow('Grade', String(lesson.grade ?? '')),
        hRow('Number present / absent', `${lesson.presentCount ?? ''} / ${lesson.absentCount ?? ''}`),
        hRow('Lesson title', lesson.lessonTitle ?? ''),
        hRow('Language focus', lesson.languageFocus ?? ''),
        hRow('Learning objectives', (lesson.learningObjectives ?? []).join('\n')),
        hRow('Lesson objectives', (lesson.lessonObjectives ?? []).join('\n')),
        hRow('Value links', lesson.valueLink ?? ''),
      ],
    });

    // Plan table (5 columns)
    const th = (t: string) => cell([p(t, true)]);
    const planHeader = new TableRow({
      children: [th('Stages / Time'), th("Teachers' actions"), th("Students' actions"), th('Assessment criteria'), th('Resources')],
    });
    const planRows = (lesson.stages ?? []).map((s) => {
      const studentChildren: import('docx').Paragraph[] = [p(s.studentActions ?? '')];
      if (s.descriptors?.length) {
        studentChildren.push(p('Descriptor:', true));
        s.descriptors.forEach((d, i) => studentChildren.push(p(`${i + 1}. ${d.text}`)));
        studentChildren.push(p(`Total: ${s.points ?? 0} points`, true));
      }
      const critChildren: import('docx').Paragraph[] = [p(s.assessmentCriteria ?? '')];
      if (s.method) critChildren.push(p(`Method: ${s.method}`));
      return new TableRow({
        children: [
          cell([p(`${s.stageName || s.stageType}`, true), p(`(${s.timeMinutes} min)`)]),
          cell([p(s.teacherActions ?? '')]),
          cell(studentChildren),
          cell(critChildren),
          cell([p(s.resources ?? '')]),
        ],
      });
    });
    const planTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [planHeader, ...planRows] });

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Краткосрочный план урока (КСП)', bold: true })] }),
          headerTable,
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Plan', bold: true, size: 22 })] }),
          planTable,
        ],
      }],
    });
    return Packer.toBuffer(doc);
  }

  // ── Objectives (Haiku) ──────────────────────────────────────────
  async generateObjectives(id: string, ctx: UserCtx): Promise<string[]> {
    const lesson = await this.own(id, ctx);
    if (!lesson.learningObjectives?.length) {
      throw new HttpException('Сначала заполните цели обучения', HttpStatus.BAD_REQUEST);
    }
    const p = objectivesPrompt(this.ctxOf(lesson));
    const res = await this.ai.request({ action: 'lesson_objectives', systemPrompt: p.system, messages: [{ role: 'user', content: p.user }] });
    const parsed = this.parseJson<{ objectives: string[] }>(res.content);
    const objectives = Array.isArray(parsed?.objectives) ? parsed!.objectives.filter((x) => typeof x === 'string') : [];
    if (!objectives.length) throw new HttpException('ИИ вернул неразборчивый ответ', HttpStatus.UNPROCESSABLE_ENTITY);
    await this.lessonRepo.update({ id, userId: ctx.userId }, { lessonObjectives: objectives });
    return objectives;
  }

  // ── Stages (constructor) ────────────────────────────────────────
  async setStages(id: string, ctx: UserCtx, stages: StageInput[]): Promise<Lesson> {
    await this.own(id, ctx);
    await this.stageRepo.delete({ lessonId: id }); // cascades to descriptors
    const rows = stages.map((s, i) =>
      this.stageRepo.create({
        lessonId: id,
        order: i,
        stageType: s.stageType,
        toolId: s.toolId,
        timeMinutes: s.timeMinutes ?? 0,
        isAssessed: ASSESSED_TYPES.includes(s.stageType),
      }),
    );
    await this.stageRepo.save(rows);
    await this.lessonRepo.update({ id, userId: ctx.userId }, { mode: 'constructor' });
    return this.getOne(id, ctx);
  }

  /** Default stages for quick mode (all isDefault tools; 3 task defaults). */
  async buildDefaultStages(id: string): Promise<void> {
    const defaults = await this.toolRepo.find({ where: { isDefault: true }, order: { stageType: 'ASC', sortOrder: 'ASC' } });
    const ordered = defaults.sort(
      (a, b) => STAGE_ORDER.indexOf(a.stageType) - STAGE_ORDER.indexOf(b.stageType) || a.sortOrder - b.sortOrder,
    );
    const timeByType: Record<string, number> = { warmup: 7, explanation: 10, task: 8, quiz: 5, reflection: 5 };
    await this.stageRepo.delete({ lessonId: id });
    const rows = ordered.map((t, i) =>
      this.stageRepo.create({
        lessonId: id,
        order: i,
        stageType: t.stageType,
        toolId: t.toolId,
        timeMinutes: timeByType[t.stageType] ?? 5,
        isAssessed: ASSESSED_TYPES.includes(t.stageType),
      }),
    );
    await this.stageRepo.save(rows);
  }

  // ── Generation (async) ──────────────────────────────────────────
  async startGeneration(id: string, ctx: UserCtx, mode: 'quick' | 'constructor'): Promise<{ status: string }> {
    const lesson = await this.own(id, ctx);
    if (mode === 'quick') await this.buildDefaultStages(id);
    const stageCount = await this.stageRepo.count({ where: { lessonId: id } });
    if (!stageCount) throw new HttpException('Не выбраны этапы урока', HttpStatus.BAD_REQUEST);
    await this.lessonRepo.update({ id, userId: ctx.userId }, { status: 'generating', mode, generationError: null });
    // fire-and-forget; frontend polls GET /lessons/:id
    void this.runGeneration(id).catch(async (err) => {
      this.logger.error(`Lesson ${id} generation failed: ${(err as Error).message}`);
      await this.lessonRepo.update(id, { status: 'error', generationError: (err as Error).message?.slice(0, 500) });
    });
    return { status: 'generating' };
  }

  private async runGeneration(id: string): Promise<void> {
    const lesson = await this.lessonRepo.findOne({ where: { id } });
    if (!lesson) return;
    const stages = await this.stageRepo.find({ where: { lessonId: id }, order: { order: 'ASC' } });
    const ctx = this.ctxOf(lesson);

    const assessed = stages.filter((s) => ASSESSED_TYPES.includes(s.stageType));
    if (!hasEnoughAssessed(assessed.length)) {
      throw new Error('Нужно минимум 2 оцениваемых задания (task/quiz)');
    }

    // 1) Points distribution (Sonnet proposes, CODE enforces sum=10)
    const proposal = await this.proposePoints(assessed);
    const dist = distributeLessonPoints(proposal, 10);
    const pointsById = new Map(dist.map((d) => [d.stageId, d.points]));
    for (const s of assessed) {
      s.points = pointsById.get(s.id) ?? 1;
      s.isAssessed = true;
    }

    // 2) Per-stage content (Sonnet)
    const toolMap = new Map((await this.toolRepo.find()).map((t) => [t.toolId, t]));
    for (const s of stages) {
      const desc = s.toolId ? toolMap.get(s.toolId)?.description ?? '' : '';
      const p = stagePrompt({ stageType: s.stageType, toolId: s.toolId, timeMinutes: s.timeMinutes }, desc, ctx);
      const res = await this.safeRequest('lesson_stage', p.system, p.user);
      const c = this.parseJson<any>(res) ?? {};
      s.stageName = c.stageName ?? s.stageName ?? s.stageType;
      s.teacherActions = c.teacherActions ?? '';
      s.studentActions = c.studentActions ?? '';
      s.method = c.method ?? '';
      s.assessmentCriteria = c.assessmentCriteria ?? '';
      s.resources = c.resources ?? '';
      await this.stageRepo.save(s);
    }

    // 3) Descriptors for assessed stages (Sonnet), CODE enforces sum = stage.points
    for (const s of assessed) {
      const pts = s.points ?? 1;
      const p = descriptorsPrompt({ stageType: s.stageType, toolId: s.toolId, teacherActions: s.teacherActions }, pts, ctx);
      const res = await this.safeRequest('lesson_descriptors', p.system, p.user);
      const parsed = this.parseJson<{ descriptors: { text: string; points: number }[] }>(res);
      let items = Array.isArray(parsed?.descriptors) && parsed!.descriptors.length
        ? parsed!.descriptors
        : [{ text: 'Выполняет задание корректно', points: 1 }, { text: 'Использует изученный материал', points: 1 }];
      const adjusted = adjustDescriptorSum(items.map((d) => d.points), pts);
      await this.descRepo.delete({ stageId: s.id });
      await this.descRepo.save(
        items.map((d, i) => this.descRepo.create({ stageId: s.id, order: i, text: d.text || 'Дескриптор', points: adjusted[i] })),
      );
    }

    await this.lessonRepo.update(id, { status: 'ready', totalPoints: 10, homework: lesson.homework ?? null });
  }

  private async proposePoints(assessed: LessonStage[]): Promise<StagePointsProposal[]> {
    try {
      const p = pointsPrompt(assessed.map((s) => ({ stageId: s.id, stageType: s.stageType, toolId: s.toolId })), 10);
      const res = await this.ai.request({ action: 'lesson_points', systemPrompt: p.system, messages: [{ role: 'user', content: p.user }] });
      const parsed = this.parseJson<{ points: { stageId: string; points: number }[] }>(res.content);
      if (Array.isArray(parsed?.points) && parsed!.points.length === assessed.length) {
        return assessed.map((s) => ({ stageId: s.id, points: parsed!.points.find((x) => x.stageId === s.id)?.points ?? 1 }));
      }
    } catch (e) {
      this.logger.warn(`points proposal fell back to equal weights: ${(e as Error).message}`);
    }
    // fallback: equal weights (engine still enforces sum=10)
    return assessed.map((s) => ({ stageId: s.id, points: 1 }));
  }

  // ── Stage regenerate / swap tool ────────────────────────────────
  async regenerateStage(id: string, sid: string, ctx: UserCtx): Promise<LessonStage> {
    await this.own(id, ctx);
    const s = await this.stageRepo.findOne({ where: { id: sid, lessonId: id } });
    if (!s) throw new HttpException('Этап не найден', HttpStatus.NOT_FOUND);
    const lesson = await this.lessonRepo.findOne({ where: { id } });
    const ctxL = this.ctxOf(lesson!);
    const tool = s.toolId ? await this.toolRepo.findOne({ where: { toolId: s.toolId } }) : null;
    const p = stagePrompt({ stageType: s.stageType, toolId: s.toolId, timeMinutes: s.timeMinutes }, tool?.description ?? '', ctxL);
    const res = await this.safeRequest('lesson_stage', p.system, p.user);
    const c = this.parseJson<any>(res) ?? {};
    Object.assign(s, {
      stageName: c.stageName ?? s.stageName,
      teacherActions: c.teacherActions ?? s.teacherActions,
      studentActions: c.studentActions ?? s.studentActions,
      method: c.method ?? s.method,
      assessmentCriteria: c.assessmentCriteria ?? s.assessmentCriteria,
      resources: c.resources ?? s.resources,
    });
    return this.stageRepo.save(s);
  }

  async swapTool(id: string, sid: string, ctx: UserCtx, toolId: string): Promise<LessonStage> {
    await this.own(id, ctx);
    const s = await this.stageRepo.findOne({ where: { id: sid, lessonId: id } });
    if (!s) throw new HttpException('Этап не найден', HttpStatus.NOT_FOUND);
    const tool = await this.toolRepo.findOne({ where: { toolId } });
    if (!tool || tool.stageType !== s.stageType) {
      throw new HttpException('Инструмент не подходит для этого этапа', HttpStatus.BAD_REQUEST);
    }
    s.toolId = toolId;
    return this.stageRepo.save(s);
  }

  // ── helpers ─────────────────────────────────────────────────────
  private async own(id: string, ctx: UserCtx): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id, userId: ctx.userId } });
    if (!lesson) throw new HttpException('Урок не найден', HttpStatus.NOT_FOUND);
    return lesson;
  }

  private ctxOf(lesson: Lesson): LessonContext {
    return {
      subject: lesson.subject,
      grade: lesson.grade,
      lessonTitle: lesson.lessonTitle,
      languageFocus: lesson.languageFocus,
      learningObjectives: lesson.learningObjectives ?? [],
      lessonObjectives: lesson.lessonObjectives ?? [],
    };
  }

  private pickHeader(h: Partial<Lesson>): Partial<Lesson> {
    const keys: (keyof Lesson)[] = [
      'unit', 'teacherName', 'date', 'lessonNumber', 'grade', 'presentCount', 'absentCount',
      'subject', 'lessonTitle', 'languageFocus', 'learningObjectives', 'valueMonth', 'valueLink', 'durationMinutes',
    ];
    const out: Partial<Lesson> = {};
    for (const k of keys) if (h[k] !== undefined) (out as any)[k] = h[k];
    return out;
  }

  private async safeRequest(action: string, system: string, user: string): Promise<string> {
    const res = await this.ai.request({ action, systemPrompt: system, messages: [{ role: 'user', content: user }] });
    return res.content;
  }

  private parseJson<T>(text: string): T | null {
    if (!text) return null;
    let s = text.trim().replace(/^```json?\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const start = s.search(/[[{]/);
    if (start === -1) return null;
    s = s.slice(start);
    try {
      return JSON.parse(s) as T;
    } catch {
      for (let i = s.length; i > 0; i--) {
        try { return JSON.parse(s.slice(0, i)) as T; } catch { /* keep trimming */ }
      }
      return null;
    }
  }
}
