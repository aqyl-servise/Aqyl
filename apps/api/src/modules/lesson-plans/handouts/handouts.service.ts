import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../entities/lesson.entity';
import { LessonStage } from '../entities/lesson-stage.entity';
import { Descriptor } from '../entities/descriptor.entity';
import { ToolCatalog } from '../entities/tool-catalog.entity';
import { ValueLinkReference } from '../entities/value-link-reference.entity';
import { Handout, HandoutType } from '../entities/handout.entity';
import { HandoutPackage } from '../entities/handout-package.entity';
import { AiClientService } from '../../../services/ai-client.service';
import { CostLoggerService } from './cost-logger.service';
import { handoutTypeFor, isLeveled, handoutAction, parsedHandoutHasContent } from './handout-content';
import { buildHandoutPrompt, HANDOUT_TOOL } from './handout-prompts';
import { docLabels } from '../export/doc-labels';
import { planChildren, handoutChildren, pageBreak } from '../export/docx-kit';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Document, Packer } = require('docx') as typeof import('docx');

export type ExportMode = 'student' | 'teacher';

export interface HandoutCtx {
  userId: string;
  schoolId: string | null;
}

@Injectable()
export class HandoutsService {
  private readonly logger = new Logger(HandoutsService.name);

  constructor(
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(LessonStage) private readonly stageRepo: Repository<LessonStage>,
    @InjectRepository(Descriptor) private readonly descRepo: Repository<Descriptor>,
    @InjectRepository(ToolCatalog) private readonly toolRepo: Repository<ToolCatalog>,
    @InjectRepository(ValueLinkReference) private readonly valueRepo: Repository<ValueLinkReference>,
    @InjectRepository(Handout) private readonly handoutRepo: Repository<Handout>,
    @InjectRepository(HandoutPackage) private readonly pkgRepo: Repository<HandoutPackage>,
    private readonly ai: AiClientService,
    private readonly cost: CostLoggerService,
  ) {}

  // ── Public API ──────────────────────────────────────────────────
  async generateHandouts(lessonId: string, ctx: HandoutCtx): Promise<{ status: string }> {
    const lesson = await this.ownReadyLesson(lessonId, ctx);

    // Один пакет на урок: повторная генерация заменяет предыдущий.
    let pkg = await this.pkgRepo.findOne({ where: { lessonId } });
    if (!pkg) pkg = this.pkgRepo.create({ lessonId });
    pkg.status = 'generating';
    pkg.generationError = null;
    pkg.generationCost = 0;
    await this.pkgRepo.save(pkg);
    await this.cost.clear(lessonId, 'handouts');

    // fire-and-forget; фронт поллит GET /handouts до ready (как генерация плана)
    void this.runHandouts(lesson).catch(async (err) => {
      this.logger.error(`Пакет материалов урока ${lessonId} упал: ${(err as Error).message}`);
      await this.pkgRepo.update({ lessonId }, {
        status: 'error', generationError: (err as Error).message?.slice(0, 500),
      });
    });
    return { status: 'generating' };
  }

  async getPackage(lessonId: string, ctx: HandoutCtx) {
    await this.own(lessonId, ctx);
    const pkg = await this.pkgRepo.findOne({ where: { lessonId } });
    const handouts = await this.handoutRepo.find({ where: { lessonId }, order: { order: 'ASC' } });
    return { package: pkg, handouts };
  }

  async getCost(lessonId: string, ctx: HandoutCtx) {
    await this.own(lessonId, ctx);
    return this.cost.summary(lessonId);
  }

  /** Перегенерация одного листа (кнопка «Повторить» в UI, ТЗ 1.2). */
  async regenerateHandout(lessonId: string, handoutId: string, ctx: HandoutCtx): Promise<Handout> {
    const lesson = await this.own(lessonId, ctx);
    const existing = await this.handoutRepo.findOne({ where: { id: handoutId, lessonId } });
    if (!existing) throw new HttpException('Приложение не найдено', HttpStatus.NOT_FOUND);
    const stage = await this.stageRepo.findOne({ where: { id: existing.stageId, lessonId } });
    if (!stage) throw new HttpException('Этап не найден', HttpStatus.NOT_FOUND);

    const tool = stage.toolId ? await this.toolRepo.findOne({ where: { toolId: stage.toolId } }) : null;
    const valueName = await this.resolveValueName(lesson);
    const { handout } = await this.generateOneHandout(lesson, stage, existing.order, valueName, tool?.description ?? '');
    handout.id = existing.id; // тот же ряд — save становится UPDATE
    const saved = await this.handoutRepo.save(handout);

    // Пересчитываем статус пакета: не осталось ли ошибочных листов.
    const failed = await this.handoutRepo.count({ where: { lessonId, error: true } });
    await this.pkgRepo.update({ lessonId }, {
      status: failed ? 'error' : 'ready',
      generationError: failed ? `Не сгенерировано листов: ${failed}` : null,
    });
    return saved;
  }

  // ── Export (.docx) ──────────────────────────────────────────────
  /**
   * Пакет одним документом: план + Приложения 1..N. Версия выбирается mode:
   * student — без ключей, teacher — с ключами/критериями/баллами.
   */
  async exportPackage(lessonId: string, ctx: HandoutCtx, mode: ExportMode): Promise<Buffer> {
    const lesson = await this.loadLessonWithStages(lessonId, ctx);
    const handouts = await this.handoutRepo.find({ where: { lessonId }, order: { order: 'ASC' } });
    if (!handouts.length) {
      throw new HttpException('Материалы ещё не сгенерированы', HttpStatus.BAD_REQUEST);
    }
    const lbl = docLabels(lesson.language);
    const appendixByStageId = new Map(handouts.map((h) => [h.stageId, h.order]));

    const children: any[] = [...planChildren(lesson, lbl, appendixByStageId)];
    for (const h of handouts) {
      children.push(pageBreak());
      children.push(...handoutChildren(h, lbl, mode));
    }
    const doc = new Document({ sections: [{ children }] });
    return Packer.toBuffer(doc);
  }

  /** Отдельный лист (одно приложение) той же версии. */
  async exportSingle(lessonId: string, handoutId: string, ctx: HandoutCtx, mode: ExportMode): Promise<Buffer> {
    const lesson = await this.own(lessonId, ctx);
    const handout = await this.handoutRepo.findOne({ where: { id: handoutId, lessonId } });
    if (!handout) throw new HttpException('Приложение не найдено', HttpStatus.NOT_FOUND);
    const lbl = docLabels(lesson.language);
    const doc = new Document({ sections: [{ children: handoutChildren(handout, lbl, mode) }] });
    return Packer.toBuffer(doc);
  }

  /** Урок со всеми этапами и их дескрипторами — для рендера плана в пакете. */
  private async loadLessonWithStages(lessonId: string, ctx: HandoutCtx): Promise<Lesson> {
    const lesson = await this.own(lessonId, ctx);
    const stages = await this.stageRepo.find({ where: { lessonId }, order: { order: 'ASC' } });
    for (const s of stages) {
      s.descriptors = await this.descRepo.find({ where: { stageId: s.id }, order: { order: 'ASC' } });
    }
    lesson.stages = stages;
    return lesson;
  }

  // ── Generation pipeline ─────────────────────────────────────────
  private async runHandouts(lesson: Lesson): Promise<void> {
    const lessonId = lesson.id;
    const stages = await this.stageRepo.find({ where: { lessonId }, order: { order: 'ASC' } });
    const toolMap = new Map((await this.toolRepo.find()).map((t) => [t.toolId, t]));
    const valueName = await this.resolveValueName(lesson);

    // Пересобираем пакет с нуля: старые листы удаляем.
    await this.handoutRepo.delete({ lessonId });

    let total = 0;
    let failed = 0;
    // Каждый этап (включая разогрев и рефлексию) → одно приложение.
    for (const [i, s] of stages.entries()) {
      const desc = s.toolId ? toolMap.get(s.toolId)?.description ?? '' : '';
      const { handout, cost } = await this.generateOneHandout(lesson, s, i + 1, valueName, desc);
      total += cost;
      if (handout.error) failed++;
      await this.handoutRepo.save(handout);
    }

    // Пакет не «ready», пока есть пустые листы (ТЗ 1.2): статус error, но сами
    // листы сохранены — учитель дожмёт проблемные кнопкой «Повторить».
    await this.pkgRepo.update({ lessonId }, {
      status: failed ? 'error' : 'ready',
      generationCost: total,
      generationError: failed ? `Не сгенерировано листов: ${failed}` : null,
    });
  }

  /**
   * Один раздаточный лист: вызов модели + проверка непустоты + повтор.
   *
   * Пустой или обрезанный по max_tokens ответ (казахский A/B/C упирался в
   * потолок — дефект 1) отсеивается и генерируется заново с увеличенным
   * лимитом. Если и повтор пуст — лист помечается ошибкой, а не молча пустой.
   */
  private async generateOneHandout(
    lesson: Lesson, stage: LessonStage, order: number, valueName: string | null, toolDescription: string,
  ): Promise<{ handout: Handout; cost: number }> {
    const type = handoutTypeFor(stage.stageType, stage.toolId);
    const action = handoutAction(type);
    const ctx = {
      subject: lesson.subject, grade: lesson.grade, lessonTitle: lesson.lessonTitle,
      language: lesson.language ?? 'kz', lessonObjectives: lesson.lessonObjectives ?? [],
    };
    const descriptors = stage.isAssessed
      ? (await this.descRepo.find({ where: { stageId: stage.id }, order: { order: 'ASC' } }))
          .map((d) => ({ text: d.text, points: d.points }))
      : undefined;

    let cost = 0;
    let parsed: Record<string, any> | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const p = buildHandoutPrompt({
        handoutType: type, toolDescription, isAssessed: stage.isAssessed,
        points: stage.points, valueName: stage.linkedToValue ? valueName : null, ctx,
      });
      // На повторе поднимаем потолок — вдруг предыдущий обрезался.
      const maxTokens = attempt === 1 ? undefined : action === 'lesson_handout' ? 6500 : 3400;
      // Структурированный вывод: API отдаёт валидный JSON по схеме, парсить
      // текст (и ловить обрывы) не нужно — это и была причина пустых листов.
      const res = await this.ai.requestTool<Record<string, any>>({
        action, systemPrompt: p.system, messages: [{ role: 'user', content: p.user }],
        userId: lesson.userId, schoolId: lesson.schoolId, maxTokens,
      }, HANDOUT_TOOL);
      cost += await this.cost.log(lesson.id, 'handouts', {
        content: '', model: res.model, tokensIn: res.tokensIn, tokensOut: res.tokensOut,
      });
      if (res.data && parsedHandoutHasContent(res.data, type)) { parsed = res.data; break; }
      this.logger.warn(`Лист «${type}» урока ${lesson.id}: пустой ответ, попытка ${attempt}/2`);
    }

    const handout = parsed
      ? this.buildHandout(lesson.id, stage, order, type, parsed, descriptors)
      : this.buildErrorHandout(lesson.id, stage, order, type);
    return { handout, cost };
  }

  /** Пустой лист-заглушка с пометкой ошибки — для UI «Повторить этот лист». */
  private buildErrorHandout(lessonId: string, stage: LessonStage, order: number, type: HandoutType): Handout {
    return this.handoutRepo.create({
      lessonId, stageId: stage.id, order, handoutType: type,
      linkedToValue: stage.linkedToValue, error: true,
      studentContent: { title: stage.stageName ?? '' }, teacherContent: { title: stage.stageName ?? '' }, levels: null,
    });
  }

  /**
   * Раскладывает ответ модели по колонкам сущности.
   * Ученик — задание без ключей; учитель — задание + ключи/критерии/баллы.
   * Для индивидуального задания три уровня A/B/C уходят в `levels`.
   */
  private buildHandout(
    lessonId: string,
    stage: LessonStage,
    order: number,
    type: HandoutType,
    parsed: Record<string, any>,
    descriptors?: { text: string; points: number }[],
  ): Handout {
    const title = typeof parsed.title === 'string' ? parsed.title : '';
    const h = this.handoutRepo.create({
      lessonId, stageId: stage.id, order, handoutType: type, linkedToValue: stage.linkedToValue, error: false,
    });
    const scoring = stage.isAssessed ? { descriptors, points: stage.points } : {};

    if (isLeveled(type) && parsed.levels) {
      const levels: Record<string, unknown> = {};
      for (const k of ['A', 'B', 'C'] as const) {
        const L = (parsed.levels[k] ?? {}) as Record<string, any>;
        const student = this.pickStudent(L);
        const extra = stage.isAssessed ? this.pickExtra(L.teacherExtra) : {};
        levels[k] = { student, teacher: { ...student, ...extra, ...scoring } };
      }
      h.levels = levels;
      h.studentContent = { title };
      h.teacherContent = { title };
    } else {
      const student = this.pickStudent(parsed.student ?? {});
      const extra = stage.isAssessed ? this.pickExtra(parsed.teacherExtra) : {};
      h.studentContent = { title, ...student };
      h.teacherContent = { title, ...student, ...extra, ...scoring };
      h.levels = null;
    }
    return h;
  }

  private pickStudent(src: Record<string, any>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (typeof src.instructions === 'string') out.instructions = src.instructions;
    if (Array.isArray(src.sections)) out.sections = src.sections;
    if (Array.isArray(src.questions)) out.questions = src.questions;
    if (typeof src.answerLines === 'number') out.answerLines = src.answerLines;
    return out;
  }

  private pickExtra(src: any): Record<string, unknown> {
    if (!src || typeof src !== 'object') return {};
    const out: Record<string, unknown> = {};
    if (typeof src.answers === 'string') out.answers = src.answers;
    if (typeof src.criteria === 'string') out.criteria = src.criteria;
    if (typeof src.notes === 'string') out.notes = src.notes;
    return out;
  }

  private async resolveValueName(lesson: Lesson): Promise<string | null> {
    if (!lesson.valueMonth) return null;
    const ref = await this.valueRepo.findOne({ where: { month: lesson.valueMonth } });
    if (!ref) return null;
    return lesson.language === 'ru' ? ref.valueRu : lesson.language === 'en' ? ref.valueEn : ref.valueKz;
  }

  // ── helpers ─────────────────────────────────────────────────────
  private async own(lessonId: string, ctx: HandoutCtx): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId, userId: ctx.userId } });
    if (!lesson) throw new HttpException('Урок не найден', HttpStatus.NOT_FOUND);
    return lesson;
  }

  private async ownReadyLesson(lessonId: string, ctx: HandoutCtx): Promise<Lesson> {
    const lesson = await this.own(lessonId, ctx);
    if (lesson.status !== 'ready') {
      throw new HttpException('Сначала сгенерируйте план урока', HttpStatus.BAD_REQUEST);
    }
    return lesson;
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
