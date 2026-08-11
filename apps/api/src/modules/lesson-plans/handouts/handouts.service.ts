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
import { handoutTypeFor, isLeveled } from './handout-content';
import { buildHandoutPrompt } from './handout-prompts';

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

  // ── Generation pipeline ─────────────────────────────────────────
  private async runHandouts(lesson: Lesson): Promise<void> {
    const lessonId = lesson.id;
    const stages = await this.stageRepo.find({ where: { lessonId }, order: { order: 'ASC' } });
    const toolMap = new Map((await this.toolRepo.find()).map((t) => [t.toolId, t]));
    const valueName = await this.resolveValueName(lesson);

    const ctx = {
      subject: lesson.subject,
      grade: lesson.grade,
      lessonTitle: lesson.lessonTitle,
      language: lesson.language ?? 'kz',
      lessonObjectives: lesson.lessonObjectives ?? [],
    };

    // Пересобираем пакет с нуля: старые листы удаляем.
    await this.handoutRepo.delete({ lessonId });

    let total = 0;
    // Каждый этап (включая разогрев и рефлексию) → одно приложение.
    for (const [i, s] of stages.entries()) {
      const type = handoutTypeFor(s.stageType, s.toolId);
      const desc = s.toolId ? toolMap.get(s.toolId)?.description ?? '' : '';
      const p = buildHandoutPrompt({
        handoutType: type,
        toolDescription: desc,
        isAssessed: s.isAssessed,
        points: s.points,
        valueName: s.linkedToValue ? valueName : null,
        ctx,
      });
      const res = await this.ai.request({
        action: 'lesson_handout', systemPrompt: p.system,
        messages: [{ role: 'user', content: p.user }],
        userId: lesson.userId, schoolId: lesson.schoolId,
      });
      total += await this.cost.log(lessonId, 'handouts', res);

      const parsed = this.parseJson<Record<string, any>>(res.content) ?? {};
      // Дескрипторы и баллы берём готовые из плана — не просим модель заново.
      const descriptors = s.isAssessed
        ? (await this.descRepo.find({ where: { stageId: s.id }, order: { order: 'ASC' } }))
            .map((d) => ({ text: d.text, points: d.points }))
        : undefined;

      const handout = this.buildHandout(lessonId, s, i + 1, type, parsed, descriptors);
      await this.handoutRepo.save(handout);
    }

    await this.pkgRepo.update({ lessonId }, { status: 'ready', generationCost: total });
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
      lessonId, stageId: stage.id, order, handoutType: type, linkedToValue: stage.linkedToValue,
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
