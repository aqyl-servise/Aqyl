import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { LessonStage, StageType } from './entities/lesson-stage.entity';
import { Descriptor } from './entities/descriptor.entity';
import { ToolCatalog } from './entities/tool-catalog.entity';
import { ValueLinkReference } from './entities/value-link-reference.entity';
import { AiClientService, AiResponse } from '../../services/ai-client.service';
import { CostLoggerService } from './handouts/cost-logger.service';
import {
  distributeLessonPoints,
  proposeWeights,
  stripObjectivePrefix,
  adjustDescriptorSum,
  hasEnoughAssessed,
  MIN_ASSESSED,
  StagePointsProposal,
} from './engine/points-engine';
import { findImperativeObjectives } from './engine/objective-mood';
import { findWrongTerms } from './prompts/term-glossary';
import {
  LessonContext,
  objectivesPrompt,
  valueLinkPrompt,
  stagePrompt,
  descriptorsPrompt,
} from './prompts/lesson-prompts';
import { docLabels } from './export/doc-labels';
import { planChildren } from './export/docx-kit';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Document, Packer } = require('docx') as typeof import('docx');

export interface UserCtx {
  userId: string;
  schoolId: string | null;
  role?: string;
}

export interface StageInput {
  stageType: StageType;
  toolId?: string;
  timeMinutes: number;
  isAssessed?: boolean;
  linkedToValue?: boolean;
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
    private readonly cost: CostLoggerService,
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
    const lesson = await this.own(id, ctx);
    const data = this.pickHeader(patch);
    // Ценность в шапке — только НАЗВАНИЕ и только при реальной смене месяца.
    // Раньше здесь безусловно проставлялось `v.valueRu`, и раскрытый текст,
    // полученный от ИИ, затирался одним русским словом при каждом сохранении
    // шапки — а фронт сохраняет её и на «Далее», уже после раскрытия. Отсюда
    // и бралось одно слово в готовом документе.
    if (patch.valueMonth !== undefined && patch.valueMonth !== lesson.valueMonth) {
      const v = patch.valueMonth ? await this.getValueForMonth(patch.valueMonth) : null;
      data.valueLink = v ? this.valueName(v, patch.language ?? lesson.language) : null;
    }
    await this.lessonRepo.update({ id, userId: ctx.userId }, data);
    return this.getOne(id, ctx);
  }

  /** Название ценности на языке урока. */
  private valueName(ref: ValueLinkReference, language?: string): string {
    return language === 'ru' ? ref.valueRu : language === 'en' ? ref.valueEn : ref.valueKz;
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
    // Подписи документа — на языке урока (ТЗ 1.1, дефект 5). Вёрстка плана —
    // в общем модуле docx-kit, чтобы пакет материалов (срез 2) её переиспользовал.
    const lbl = docLabels(lesson.language);
    const doc = new Document({ sections: [{ children: planChildren(lesson, lbl) }] });
    return Packer.toBuffer(doc);
  }

  // ── Objectives (Haiku) ──────────────────────────────────────────
  async generateObjectives(id: string, ctx: UserCtx): Promise<string[]> {
    const lesson = await this.own(id, ctx);
    if (!lesson.learningObjectives?.length) {
      throw new HttpException('Сначала заполните цели обучения', HttpStatus.BAD_REQUEST);
    }
    let objectives = await this.askObjectives(lesson, ctx);
    if (!objectives.length) throw new HttpException('ИИ вернул неразборчивый ответ', HttpStatus.UNPROCESSABLE_ENTITY);

    // Наклонение проверяем кодом: цель урока должна описывать действие ученика
    // («анықтайды»), а не командовать им («анықта»). Одна повторная попытка —
    // с показом модели её собственных ошибочных формулировок. Если и она не
    // помогла, оставляем лучший из двух вариантов: цели без наклонения хуже,
    // чем цели с ним, но лучше, чем упавшая генерация.
    const bad = findImperativeObjectives(objectives, lesson.language);
    if (bad.length) {
      this.logger.warn(`Урок ${id}: цели в повелительном наклонении (${bad.length}), повтор генерации`);
      try {
        const retry = await this.askObjectives(lesson, ctx, bad);
        const stillBad = findImperativeObjectives(retry, lesson.language);
        if (retry.length && stillBad.length < bad.length) objectives = retry;
        if (stillBad.length && retry.length) {
          this.logger.warn(`Урок ${id}: после повтора осталось ${stillBad.length} целей в повелительном наклонении`);
        }
      } catch (err) {
        this.logger.warn(`Урок ${id}: повтор генерации целей не удался: ${(err as Error).message}`);
      }
    }

    await this.lessonRepo.update({ id, userId: ctx.userId }, { lessonObjectives: objectives });
    return objectives;
  }

  /** Один вызов модели за целями урока + чистка префиксов. */
  private async askObjectives(lesson: Lesson, ctx: UserCtx, imperativeSamples: string[] = []): Promise<string[]> {
    const p = objectivesPrompt(this.ctxOf(lesson), imperativeSamples);
    const res = await this.ai.request({
      action: 'lesson_objectives', systemPrompt: p.system,
      messages: [{ role: 'user', content: p.user }],
      userId: ctx.userId, schoolId: ctx.schoolId,
    });
    await this.cost.log(lesson.id, 'plan', res);
    const parsed = this.parseJson<{ objectives: string[] }>(res.content);
    return (Array.isArray(parsed?.objectives) ? parsed!.objectives.filter((x) => typeof x === 'string') : [])
      .map((o) => stripObjectivePrefix(o))
      .filter((o) => o.length > 0);
  }

  /**
   * Превращает название ценности в 1–2 предложения о её реализации на уроке.
   *
   * Раньше в документ уходило одно слово, причём всегда по-русски — даже в
   * казахском плане. Для проверяющего это равнозначно отсутствию: непонятно,
   * как ценность связана с уроком.
   *
   * Сбой не должен ронять генерацию: при неудаче оставляем название на языке
   * урока — это хуже раскрытия, но лучше пустой графы.
   *
   * Вызывается на этапе генерации урока, а не при генерации целей: раскрытие
   * должно попасть в документ независимо от того, нажимал ли учитель
   * «Сгенерировать цели урока» — этот шаг необязателен.
   */
  private async expandValueLink(lesson: Lesson): Promise<void> {
    if (!lesson.valueMonth) return;
    const ref = await this.getValueForMonth(lesson.valueMonth);
    if (!ref) return;

    const name = this.valueName(ref, lesson.language);
    let text = name;
    try {
      const p = valueLinkPrompt(name, this.ctxOf(lesson));
      const res = await this.ai.request({
        action: 'lesson_value_link', systemPrompt: p.system,
        messages: [{ role: 'user', content: p.user }],
        userId: lesson.userId, schoolId: lesson.schoolId,
      });
      await this.cost.log(lesson.id, 'plan', res);
      const parsed = this.parseJson<{ valueLink: string }>(res.content);
      if (parsed?.valueLink && typeof parsed.valueLink === 'string') text = parsed.valueLink.trim();
    } catch (err) {
      this.logger.warn(`Не удалось раскрыть ценность урока ${lesson.id}: ${(err as Error).message}`);
    }
    await this.lessonRepo.update({ id: lesson.id }, { valueLink: text });
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
        // Оцениваемость выбирает учитель (срез 2). Флаг может не прийти от
        // старого фронта — тогда падаем на прежнее правило «task/quiz → да».
        isAssessed: s.isAssessed ?? ASSESSED_TYPES.includes(s.stageType),
        linkedToValue: s.linkedToValue ?? false,
      }),
    );
    await this.stageRepo.save(rows);
    await this.lessonRepo.update({ id, userId: ctx.userId }, { mode: 'constructor' });
    return this.getOne(id, ctx);
  }

  /**
   * Этапы быстрого режима: платформа выбирает всё сама.
   *
   * Квиз по умолчанию выключен (срез 2), поэтому два оцениваемых даёт этап
   * «Задание» — два задания вместо одного. Так и сумма 10 есть чему делиться
   * (нужно ≥2 оцениваемых), и правило «квиз необязателен» соблюдено.
   */
  async buildDefaultStages(id: string): Promise<void> {
    const tools = await this.toolRepo.find({ order: { stageType: 'ASC', sortOrder: 'ASC' } });
    const byType = (t: StageType) => tools.filter((x) => x.stageType === t);
    const pick = (t: StageType) => byType(t).find((x) => x.isDefault) ?? byType(t)[0];

    await this.stageRepo.delete({ lessonId: id });
    const rows: LessonStage[] = [];
    let order = 0;
    const add = (stageType: StageType, toolId: string | undefined, timeMinutes: number, isAssessed: boolean) => {
      rows.push(this.stageRepo.create({
        lessonId: id, order: order++, stageType, toolId, timeMinutes, isAssessed, linkedToValue: false,
      }));
    };

    const warm = pick('warmup'); if (warm) add('warmup', warm.toolId, 7, false);
    const expl = pick('explanation'); if (expl) add('explanation', expl.toolId, 10, false);
    // Два задания: если в каталоге больше одного инструмента — берём разные,
    // иначе тот же дважды. Оба оцениваемые, чтобы делить 10 баллов было на что.
    const taskTools = byType('task');
    const t1 = taskTools[0];
    const t2 = taskTools[1] ?? taskTools[0];
    if (t1) add('task', t1.toolId, 9, true);
    if (t2) add('task', t2.toolId, 9, true);
    const refl = pick('reflection'); if (refl) add('reflection', refl.toolId, 5, false);

    await this.stageRepo.save(rows);
  }

  // ── Generation (async) ──────────────────────────────────────────
  async startGeneration(id: string, ctx: UserCtx, mode: 'quick' | 'constructor'): Promise<{ status: string }> {
    const lesson = await this.own(id, ctx);
    if (mode === 'quick') await this.buildDefaultStages(id);
    const stageCount = await this.stageRepo.count({ where: { lessonId: id } });
    if (!stageCount) throw new HttpException('Не выбраны этапы урока', HttpStatus.BAD_REQUEST);
    // Оцениваемых должно быть минимум два — иначе делить 10 баллов не на что.
    // Проверяем синхронно, до старта фоновой генерации: учитель получает
    // понятную ошибку сразу, а не статус error через 30 секунд.
    const assessedCount = await this.stageRepo.count({ where: { lessonId: id, isAssessed: true } });
    if (assessedCount < MIN_ASSESSED) {
      throw new HttpException(
        `Нужно минимум ${MIN_ASSESSED} оцениваемых задания (сейчас ${assessedCount})`,
        HttpStatus.BAD_REQUEST,
      );
    }
    // trialCounted — урок израсходовал комплект бесплатного доступа (оферта,
    // п. 4.1). Ставим здесь, а не при создании черновика: лимит должен тратить
    // только реально сгенерированный план. Пометка идемпотентна и ставится всем
    // — для B2G она просто не используется, у них квоты нет.
    await this.lessonRepo.update(
      { id, userId: ctx.userId },
      { status: 'generating', mode, generationError: null, trialCounted: true },
    );
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

    // Оцениваемые выбирает учитель (срез 2), а не тип этапа: тренировочное
    // задание типа task в сумму баллов не входит.
    const assessed = stages.filter((s) => s.isAssessed);
    if (!hasEnoughAssessed(assessed.length)) {
      throw new Error(`Нужно минимум ${MIN_ASSESSED} оцениваемых задания`);
    }

    // 1) Points distribution (Sonnet proposes, CODE enforces sum=10)
    const proposal = this.proposePoints(assessed);
    const dist = distributeLessonPoints(proposal, 10);
    const pointsById = new Map(dist.map((d) => [d.stageId, d.points]));
    for (const s of assessed) {
      s.points = pointsById.get(s.id) ?? 1;
      s.isAssessed = true;
    }

    // 2) Per-stage content (Sonnet)
    const toolMap = new Map((await this.toolRepo.find()).map((t) => [t.toolId, t]));
    // Ценность месяца — для этапов с галочкой «привязать к ценности» (ТЗ 1.2,
    // дефект 3): тот же флаг, что у раздаток, теперь влияет и на план.
    let stageValueName: string | null = null;
    if (lesson.valueMonth) {
      const ref = await this.getValueForMonth(lesson.valueMonth);
      if (ref) stageValueName = this.valueName(ref, lesson.language);
    }
    for (const s of stages) {
      const desc = s.toolId ? toolMap.get(s.toolId)?.description ?? '' : '';
      // До двух попыток: если в казахском этапе русские термины из глоссария
      // (B.3, ТЗ 1.5.1) — перегенерируем один раз, потом принимаем лучший.
      let c: any = {};
      for (let attempt = 1; attempt <= 2; attempt++) {
        const p = stagePrompt(
          { stageType: s.stageType, toolId: s.toolId, timeMinutes: s.timeMinutes }, desc, ctx,
          { linkedToValue: s.linkedToValue, valueName: stageValueName },
        );
        const res = await this.safeRequest('lesson_stage', p.system, p.user, lesson);
        await this.cost.log(id, 'plan', res);
        const cand = this.parseJson<any>(res.content) ?? {};
        const wrong = lesson.language === 'kz'
          ? findWrongTerms(
              [cand.stageName, cand.teacherActions, cand.studentActions, cand.method, cand.assessmentCriteria, cand.resources]
                .filter(Boolean).join(' '),
              lesson.subject,
            )
          : [];
        if (!wrong.length || attempt === 2) {
          c = cand;
          if (wrong.length) this.logger.warn(`Этап ${s.stageType} урока ${id}: остались русские термины [${wrong.join(', ')}]`);
          break;
        }
        this.logger.warn(`Этап ${s.stageType} урока ${id}: русские термины [${wrong.join(', ')}], повтор`);
      }
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
      await this.generateDescriptors(s, lesson, ctx);
    }

    // 4) Раскрытие ценности программы «Адал азамат» под тему урока.
    await this.expandValueLink(lesson);

    await this.lessonRepo.update(id, { status: 'ready', totalPoints: 10, homework: lesson.homework ?? null });
  }

  /**
   * Дескрипторы одного оцениваемого этапа. Сумма приводится кодом ровно к
   * `stage.points`, сами баллы этапа не меняются — инвариант «10 за урок»
   * держится на уровне распределения между этапами, а не здесь.
   */
  private async generateDescriptors(s: LessonStage, lesson: Lesson, ctx: LessonContext): Promise<void> {
    const pts = s.points ?? 1;
    const p = descriptorsPrompt({ stageType: s.stageType, toolId: s.toolId, teacherActions: s.teacherActions }, pts, ctx);
    const res = await this.safeRequest('lesson_descriptors', p.system, p.user, lesson);
    await this.cost.log(lesson.id, 'plan', res);
    const parsed = this.parseJson<{ descriptors: { text: string; points: number }[] }>(res.content);
    const items = Array.isArray(parsed?.descriptors) && parsed!.descriptors.length
      ? parsed!.descriptors
      : this.fallbackDescriptors(lesson.language);
    const adjusted = adjustDescriptorSum(items.map((d) => d.points), pts);
    await this.descRepo.delete({ stageId: s.id });
    await this.descRepo.save(
      items.map((d, i) =>
        this.descRepo.create({
          stageId: s.id, order: i,
          text: d.text || this.fallbackDescriptors(lesson.language)[0].text,
          points: adjusted[i],
        }),
      ),
    );
  }

  /** Заглушка на случай неразборчивого ответа модели — на языке урока. */
  private fallbackDescriptors(language?: string): { text: string; points: number }[] {
    const byLang: Record<string, string[]> = {
      kz: ['Тапсырманы дұрыс орындайды', 'Өтілген материалды қолданады'],
      ru: ['Выполняет задание корректно', 'Использует изученный материал'],
      en: ['Completes the task correctly', 'Applies the studied material'],
    };
    const texts = byLang[language ?? ''] ?? byLang.kz;
    return texts.map((text) => ({ text, points: 1 }));
  }

  /**
   * Веса этапов считаются кодом, без обращения к модели.
   *
   * Прежде здесь был отдельный вызов Sonnet, который предлагал распределение
   * баллов, — но его ответ всё равно пересчитывался движком, чтобы сумма была
   * ровно 10. То есть мы платили за арифметику, результат которой сами же и
   * исправляли. Правило «сложное/групповое — больше» детерминированное и
   * живёт в points-engine; на выходе разницы нет, один платный вызов на
   * генерацию ушёл.
   */
  private proposePoints(assessed: LessonStage[]): StagePointsProposal[] {
    return proposeWeights(assessed.map((s) => ({ id: s.id, stageType: s.stageType })));
  }

  // ── Stage regenerate / swap tool ────────────────────────────────
  /**
   * Перегенерация одного этапа.
   *
   * Баллы этапа (`points`) намеренно не трогаются: они распределены по уроку
   * так, что сумма равна 10, и пересчёт одного этапа сломал бы инвариант.
   * А вот дескрипторы описывают КОНКРЕТНОЕ задание — после смены содержания
   * старые перестают ему соответствовать, поэтому для оцениваемых этапов они
   * генерируются заново под ту же сумму баллов.
   */
  async regenerateStage(id: string, sid: string, ctx: UserCtx): Promise<LessonStage> {
    const lesson = await this.own(id, ctx);
    const s = await this.stageRepo.findOne({ where: { id: sid, lessonId: id } });
    if (!s) throw new HttpException('Этап не найден', HttpStatus.NOT_FOUND);
    const ctxL = this.ctxOf(lesson);
    const tool = s.toolId ? await this.toolRepo.findOne({ where: { toolId: s.toolId } }) : null;
    let regenValueName: string | null = null;
    if (s.linkedToValue && lesson.valueMonth) {
      const ref = await this.getValueForMonth(lesson.valueMonth);
      if (ref) regenValueName = this.valueName(ref, lesson.language);
    }
    const p = stagePrompt(
      { stageType: s.stageType, toolId: s.toolId, timeMinutes: s.timeMinutes }, tool?.description ?? '', ctxL,
      { linkedToValue: s.linkedToValue, valueName: regenValueName },
    );
    const res = await this.safeRequest('lesson_stage', p.system, p.user, lesson);
    await this.cost.log(lesson.id, 'plan', res);
    const c = this.parseJson<any>(res.content) ?? {};
    Object.assign(s, {
      stageName: c.stageName ?? s.stageName,
      teacherActions: c.teacherActions ?? s.teacherActions,
      studentActions: c.studentActions ?? s.studentActions,
      method: c.method ?? s.method,
      assessmentCriteria: c.assessmentCriteria ?? s.assessmentCriteria,
      resources: c.resources ?? s.resources,
    });
    const saved = await this.stageRepo.save(s);

    if (saved.isAssessed) {
      await this.generateDescriptors(saved, lesson, ctxL);
      saved.descriptors = await this.descRepo.find({ where: { stageId: saved.id }, order: { order: 'ASC' } });
    }
    return saved;
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
      language: lesson.language ?? 'kz',
    };
  }

  private pickHeader(h: Partial<Lesson>): Partial<Lesson> {
    const keys: (keyof Lesson)[] = [
      'unit', 'teacherName', 'date', 'lessonNumber', 'grade', 'presentCount', 'absentCount',
      'subject', 'lessonTitle', 'languageFocus', 'learningObjectives', 'valueMonth', 'valueLink', 'durationMinutes',
      'language',
    ];
    const out: Partial<Lesson> = {};
    for (const k of keys) if (h[k] !== undefined) (out as any)[k] = h[k];
    return out;
  }

  /**
   * Владелец урока нужен, чтобы расход токенов попал в отчёт именно ему.
   * Возвращает полный ответ (с токенами и моделью), чтобы вызывающий мог
   * записать стоимость в разрезе урока (срез 2).
   */
  private async safeRequest(
    action: string,
    system: string,
    user: string,
    owner?: { userId: string; schoolId?: string | null },
  ): Promise<AiResponse> {
    return this.ai.request({
      action,
      systemPrompt: system,
      messages: [{ role: 'user', content: user }],
      userId: owner?.userId,
      schoolId: owner?.schoolId ?? null,
    });
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
