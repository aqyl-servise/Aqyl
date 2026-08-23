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
import { handoutTypeFor, isLeveled, handoutAction, parsedHandoutHasContent, taskFactsFromParsed, deriveStageFromHandout, levelFacts, extractNumberedTasks } from './handout-content';
import { Presentation } from '../entities/presentation.entity';
import { buildHandoutPrompt, HANDOUT_TOOL, SCORING_FIX_TOOL, buildScoringFixPrompt } from './handout-prompts';
import { validateScoring, buildFallbackScoring, describeViolations, Scoring } from '../engine/scoring-validator';
import { descriptorsFromTaskPrompt, leveledDescriptorsPrompt } from '../prompts/lesson-prompts';
import { findDescriptorProblems, uncoveredTaskTargets, noteReferenceGaps, hasFractionalPoints } from '../engine/descriptor-validator';
import { findRewriteProblems, parseAnswerKeys, RewriteProblem } from '../engine/rewrite-validator';
import { parseRequiredElements, missingElements } from '../engine/objective-elements';
import { adjustDescriptorSum } from '../engine/points-engine';
import { findWrongTerms, flattenStrings } from '../prompts/term-glossary';
import { PdfService } from '../export/pdf.service';
import { packageHandoutsHtml, singleHandoutHtml, HandoutLessonMeta } from '../export/handout-html';

/** Дескрипторы по уровням дифференцированного задания (ТЗ №2, задача 2). */
type Descr = { text: string; points: number };
type LevelDescriptors = { A: Descr[]; B: Descr[]; C: Descr[] };

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
    @InjectRepository(Presentation) private readonly presRepo: Repository<Presentation>,
    private readonly ai: AiClientService,
    private readonly cost: CostLoggerService,
    private readonly pdf: PdfService,
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

  // ── Export (.pdf) ───────────────────────────────────────────────
  // Раздатки отдаются PDF с фирменным дизайном (ТЗ 1.4). План (КСП) — по-прежнему
  // отдельным docx (эндпоинт /export). Версия mode: student без ключей, teacher
  // с ключами/критериями/дескрипторами.
  private meta(lesson: Lesson): HandoutLessonMeta {
    return { lessonTitle: lesson.lessonTitle, subject: lesson.subject, grade: lesson.grade, language: lesson.language };
  }

  /** Пакет: все приложения одним PDF, каждое с новой страницы. */
  async exportPackage(lessonId: string, ctx: HandoutCtx, mode: ExportMode): Promise<Buffer> {
    const lesson = await this.own(lessonId, ctx);
    const handouts = await this.handoutRepo.find({ where: { lessonId }, order: { order: 'ASC' } });
    if (!handouts.length) {
      throw new HttpException('Материалы ещё не сгенерированы', HttpStatus.BAD_REQUEST);
    }
    return this.pdf.render(packageHandoutsHtml(handouts, this.meta(lesson), mode));
  }

  /** Отдельный лист (одно приложение) той же версии, PDF. */
  async exportSingle(lessonId: string, handoutId: string, ctx: HandoutCtx, mode: ExportMode): Promise<Buffer> {
    const lesson = await this.own(lessonId, ctx);
    const handout = await this.handoutRepo.findOne({ where: { id: handoutId, lessonId } });
    if (!handout) throw new HttpException('Приложение не найдено', HttpStatus.NOT_FOUND);
    return this.pdf.render(singleHandoutHtml(handout, this.meta(lesson), mode));
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

    // Покрытие целевых конструкций (ТЗ, задача 3): «unless» и «if only» из
    // цели 8.6.17.1 терялись и не попадали ни в одно задание.
    await this.ensureObjectiveCoverage(lesson);

    // Проверка синхронизации КМЖ↔приложение (ТЗ №2, задача 1): дескрипторы в
    // таблице (их читает КМЖ) должны посимвольно совпадать со снапшотом в
    // раздатке. Совпадают по построению — общий источник; проверка ловит регресс.
    await this.verifyDescriptorSync(lessonId);

    // Инвалидация презентации (ТЗ №2, задача 1): если её сгенерировали РАНЬШЕ
    // раздаток, слайды держат плановые дескрипторы. Сбрасываем — при повторной
    // генерации презентация прочитает уже синхронную таблицу.
    await this.invalidateStalePresentation(lessonId);

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
      // cachePrefix: листы урока генерируются подряд с одним и тем же
      // префиксом (схема emit_handout + константный системный промпт), поэтому
      // со второго листа он читается из кэша по 0.1 тарифа.
      const res = await this.ai.requestTool<Record<string, any>>({
        action, systemPrompt: p.system, messages: [{ role: 'user', content: p.user }],
        userId: lesson.userId, schoolId: lesson.schoolId, maxTokens, cachePrefix: true,
      }, HANDOUT_TOOL);
      cost += await this.cost.log(lesson.id, 'handouts', {
        content: '', model: res.model, tokensIn: res.tokensIn, tokensOut: res.tokensOut,
        cacheWriteTokens: res.cacheWriteTokens, cacheReadTokens: res.cacheReadTokens,
      });
      if (res.data && parsedHandoutHasContent(res.data, type)) {
        // B.3 (ТЗ 1.5.1): русские термины из глоссария в казахском листе → повтор.
        const wrong = lesson.language === 'kz' ? findWrongTerms(flattenStrings(res.data), lesson.subject) : [];
        // Задания rewrite/transform: конструкция уже в условии / ключ = условию (ТЗ №2, задача 4).
        const rewrite = this.rewriteProblemsInParsed(res.data, type);
        // Подсказка учителю называет формы, которых нет в задании/ключе (ТЗ №2, задача 5).
        const notes = this.noteProblemsInParsed(res.data, type);
        // Дробные баллы в критериях (ТЗ №2, задача 6): «0,5 балла», «0.4 per».
        const fractional = this.fractionalPointsInParsed(res.data, type);
        if ((!wrong.length && !rewrite.length && !notes.length && !fractional) || attempt === 2) {
          parsed = res.data;
          if (wrong.length) this.logger.warn(`Лист «${type}» урока ${lesson.id}: остались русские термины [${wrong.join(', ')}]`);
          if (rewrite.length) this.logger.warn(`Лист «${type}» урока ${lesson.id}: невалидные трансформации — ${rewrite.map((r) => r.detail).join('; ')}`);
          if (notes.length) this.logger.warn(`Лист «${type}» урока ${lesson.id}: подсказка не по заданию — ${notes.join('; ')}`);
          if (fractional) this.logger.warn(`Лист «${type}» урока ${lesson.id}: в критериях остались дробные баллы`);
          break;
        }
        const reasons = [
          wrong.length ? `русские термины [${wrong.join(', ')}]` : '',
          rewrite.length ? `трансформации: ${rewrite.map((r) => r.detail).join('; ')}` : '',
          notes.length ? `подсказка: ${notes.join('; ')}` : '',
          fractional ? 'дробные баллы в критериях' : '',
        ].filter(Boolean).join('; ');
        this.logger.warn(`Лист «${type}» урока ${lesson.id}: ${reasons}, повтор`);
        continue;
      }
      this.logger.warn(`Лист «${type}» урока ${lesson.id}: пустой ответ, попытка ${attempt}/2`);
    }

    // Валидатор баллов (ТЗ 1.5.2): арифметика шкалы/критериев/дескрипторов
    // сверяется и чинится ДО сохранения листа — дальше только БД и PDF.
    let scoringFallback = false;
    if (parsed) {
      const sv = await this.validateAndFixScoring(lesson, stage, type, order, parsed);
      cost += sv.cost;
      scoringFallback = sv.fallback;
    }

    // Дескрипторы — ПОСЛЕ задания и по его тексту (ТЗ, задача 2). В плане они
    // уже сгенерированы по описанию этапа (чтобы КМЖ был полным и без
    // раздаток), здесь уточняются по факту: правка идёт в ту же таблицу, из
    // которой читают КМЖ, презентация и сам лист.
    let descriptors: { text: string; points: number }[] | undefined;
    let perLevel: LevelDescriptors | undefined;
    if (stage.isAssessed) {
      if (parsed) {
        const r = await this.refreshDescriptors(lesson, stage, parsed, type);
        descriptors = r.descriptors;
        perLevel = r.perLevel;
        cost += r.cost;
      } else {
        descriptors = (await this.descRepo.find({ where: { stageId: stage.id }, order: { order: 'ASC' } }))
          .map((d) => ({ text: d.text, points: d.points }));
      }
    }

    // Обратная запись в КМЖ (ТЗ №2, задача 1): фактические ресурсы и действия
    // ученика из готового листа. Источник истины — приложение; КМЖ читает эти
    // поля живьём, поэтому правка расходится в план сама. Только при успешном
    // листе — по пустышке структуру не выведешь.
    if (parsed) {
      const derived = deriveStageFromHandout(parsed, type, lesson.language);
      await this.stageRepo.update(stage.id, { resources: derived.resources, studentActions: derived.studentActions });
    }

    const handout = parsed
      ? this.buildHandout(lesson.id, stage, order, type, parsed, descriptors, perLevel)
      : this.buildErrorHandout(lesson.id, stage, order, type);
    handout.scoringFallback = scoringFallback;
    return { handout, cost };
  }

  /** Тело задания одного блока — для подсчёта пропусков (R6). Ключи и критерии
   *  живут в teacherExtra и сюда не попадают, как требует ТЗ 1.5.2. */
  private scoringTaskText(block: Record<string, any>): string {
    const parts: string[] = [];
    if (typeof block.instructions === 'string') parts.push(block.instructions);
    for (const s of block.sections ?? []) {
      if (s?.heading) parts.push(String(s.heading));
      if (s?.body) parts.push(String(s.body));
      for (const it of s?.items ?? []) parts.push(String(it));
    }
    for (const q of block.questions ?? []) {
      if (q?.q) parts.push(String(q.q));
      for (const o of q?.options ?? []) parts.push(String(o));
    }
    return parts.join('\n');
  }

  /**
   * Валидатор баллов (ТЗ 1.5.2): проверяет числовую согласованность блока
   * оценивания каждого оцениваемого блока листа и чинит его ДО того, как лист
   * уйдёт в БД (и дальше в PDF). Порядок из ТЗ, п. 4.4: до двух перегенераций
   * ТОЛЬКО блока оценивания, затем детерминированный запасной вариант с
   * флагом. Лист не блокируется никогда.
   *
   * Повторные вызовы инициированы системой и пользовательский лимит
   * перегенерации не расходуют: они идут напрямую через ai, мимо
   * regenerateHandout.
   */
  private async validateAndFixScoring(
    lesson: Lesson,
    stage: LessonStage,
    type: HandoutType,
    order: number,
    parsed: Record<string, any>,
  ): Promise<{ cost: number; fallback: boolean }> {
    if (!stage.isAssessed) return { cost: 0, fallback: false };

    // Блоки листа: уровни A/B/C или единственный ученический.
    const blocks: { label: string; student: Record<string, any>; extra: Record<string, any> }[] =
      isLeveled(type) && parsed.levels
        ? (['A', 'B', 'C'] as const).map((k) => {
            const L = (parsed.levels[k] ?? {}) as Record<string, any>;
            return { label: `уровень ${k}`, student: L, extra: (L.teacherExtra ?? {}) as Record<string, any> };
          })
        : [{ label: 'лист', student: (parsed.student ?? {}) as Record<string, any>, extra: (parsed.teacherExtra ?? {}) as Record<string, any> }];

    let cost = 0;
    let fallback = false;
    const logCtx = `урок ${lesson.id}, приложение ${order} (${type}), ${lesson.subject ?? '—'}, ` +
      `${lesson.grade ?? '—'} класс, ${lesson.language ?? 'kz'}`;

    for (const b of blocks) {
      const scoring = b.extra?.scoring as Scoring | undefined;
      if (!scoring || !Array.isArray(scoring.items)) continue; // модель не отдала метаданные — валидировать нечего

      const taskText = this.scoringTaskText(b.student);
      const scoringText = [
        String(b.extra.criteria ?? ''),
        ...(scoring.descriptors ?? []).map((d) => d.text),
      ].join('\n');

      let current = scoring;
      let res = validateScoring(current, taskText, scoringText);
      if (res.ok) continue;
      // Исходный список нарушений — в лог уходит именно он (ТЗ 4.5): после
      // удачной починки res.violations уже пуст.
      const firstViolations = describeViolations(res.violations);

      // До двух перегенераций только блока оценивания (п. 4.4.1–4.4.2).
      let outcome: 'fixed_on_retry_1' | 'fixed_on_retry_2' | 'fallback' = 'fallback';
      for (let attempt = 1; attempt <= 2 && !res.ok; attempt++) {
        const p = buildScoringFixPrompt({
          taskText,
          itemCount: current.items.length,
          gapCount: res.gapsInText || current.items.reduce((a, i) => a + (i.gaps ?? 0), 0),
          totalPoints: current.totalPoints,
          violations: describeViolations(res.violations),
          language: lesson.language ?? 'kz',
        });
        const fix = await this.ai.requestTool<{ criteria?: string; scoring?: Scoring }>({
          action: 'lesson_scoring_fix', systemPrompt: p.system,
          messages: [{ role: 'user', content: p.user }],
          userId: lesson.userId, schoolId: lesson.schoolId,
        }, SCORING_FIX_TOOL);
        cost += await this.cost.log(lesson.id, 'handouts', {
          content: '', model: fix.model, tokensIn: fix.tokensIn, tokensOut: fix.tokensOut,
          cacheWriteTokens: fix.cacheWriteTokens, cacheReadTokens: fix.cacheReadTokens,
        });
        const candidate = fix.data?.scoring;
        if (candidate && Array.isArray(candidate.items)) {
          const candText = [
            String(fix.data?.criteria ?? b.extra.criteria ?? ''),
            ...(candidate.descriptors ?? []).map((d) => d.text),
          ].join('\n');
          const check = validateScoring(candidate, taskText, candText);
          if (check.ok) {
            current = candidate;
            res = check;
            if (typeof fix.data?.criteria === 'string' && fix.data.criteria.trim()) {
              b.extra.criteria = fix.data.criteria;
            }
            outcome = attempt === 1 ? 'fixed_on_retry_1' : 'fixed_on_retry_2';
          }
        }
        if (!res.ok) {
          this.logger.warn(`Валидатор баллов: ${logCtx}, ${b.label} — попытка ${attempt}/2 не прошла`);
        }
      }

      // Детерминированный запасной вариант (п. 4.4.3). Лист не блокируем.
      if (!res.ok) {
        current = buildFallbackScoring(current, Math.max(res.scaleMax, res.gapsInText, 1));
        fallback = true;
      }

      b.extra.scoring = current;

      this.logger.warn(
        `Валидатор баллов: ${logCtx}, ${b.label} — [${firstViolations}] ` +
        `→ ${outcome}` + (outcome === 'fallback' ? ' (шкала построена кодом)' : ''),
      );
    }

    return { cost, fallback };
  }

  /**
   * Невалидные задания rewrite/transform в листе (ТЗ №2, задача 4): целевая
   * конструкция уже в условии либо ключ дословно повторяет условие. Обходит
   * все блоки (уровни A/B/C или ученический), пункты и ключи берёт из их
   * содержимого. Не-rewrite пункты валидатор игнорирует — ложных нет.
   */
  private rewriteProblemsInParsed(parsed: Record<string, any>, type: HandoutType): RewriteProblem[] {
    const blocks: Record<string, any>[] = isLeveled(type) && parsed.levels
      ? ['A', 'B', 'C'].map((k) => (parsed.levels[k] ?? {}) as Record<string, any>)
      : [parsed.student ?? {}];
    const out: RewriteProblem[] = [];
    for (const b of blocks) {
      const items: string[] = [];
      for (const s of b.sections ?? []) {
        for (const it of s.items ?? []) items.push(String(it));
        for (const line of String(s.body ?? '').split('\n')) if (/[→\]]/.test(line)) items.push(line);
      }
      const keys = parseAnswerKeys(String(b.teacherExtra?.answers ?? ''));
      out.push(...findRewriteProblems(items, keys));
    }
    return out;
  }

  /** Есть ли дробные баллы в любом критерии листа (ТЗ №2, задача 6). */
  private fractionalPointsInParsed(parsed: Record<string, any>, type: HandoutType): boolean {
    const blocks: Record<string, any>[] = isLeveled(type) && parsed.levels
      ? ['A', 'B', 'C'].map((k) => (parsed.levels[k] ?? {}) as Record<string, any>)
      : [{ teacherExtra: parsed.teacherExtra }];
    return blocks.some((b) => hasFractionalPoints(String(b.teacherExtra?.criteria ?? '')));
  }

  /**
   * Подсказки учителю (notes), называющие формы/конструкции, которых нет в
   * задании или ключе этой карточки (ТЗ №2, задача 5). Обходит блоки уровней
   * или ученический; текст карточки = задание + ключ (answers).
   */
  private noteProblemsInParsed(parsed: Record<string, any>, type: HandoutType): string[] {
    const blocks: Record<string, any>[] = isLeveled(type) && parsed.levels
      ? ['A', 'B', 'C'].map((k) => (parsed.levels[k] ?? {}) as Record<string, any>)
      : [{ ...(parsed.student ?? {}), teacherExtra: parsed.teacherExtra }];
    const out: string[] = [];
    for (const b of blocks) {
      const note = String(b.teacherExtra?.notes ?? '').trim();
      if (!note) continue;
      const cardText = [
        JSON.stringify({ instructions: b.instructions, sections: b.sections, questions: b.questions }),
        String(b.teacherExtra?.answers ?? ''),
      ].join(' ');
      const gaps = noteReferenceGaps(note, cardText);
      if (gaps.length) out.push(`«${note}» → [${gaps.join(', ')}] нет в задании`);
    }
    return out;
  }

  /**
   * Посимвольная сверка дескрипторов КМЖ (таблица) и приложения (jsonb).
   * Несовпадение — в лог с ID урока и этапа (ТЗ №2, задача 1, критерий приёмки).
   * Выдачу пакета не блокируем: расхождение — сигнал для разбора, а не отказ
   * учителю (лучше отдать пакет, чем оставить учителя без материалов).
   */
  private async verifyDescriptorSync(lessonId: string): Promise<void> {
    const handouts = await this.handoutRepo.find({ where: { lessonId } });
    for (const h of handouts) {
      if (h.error) continue;
      const stageId = h.stageId;
      if (!stageId) continue;
      const table = (await this.descRepo.find({ where: { stageId }, order: { order: 'ASC' } }))
        .map((d) => d.text.trim());
      if (!table.length) continue;
      const inHandout = this.descriptorsFromHandout(h);
      // Уровневый лист держит один набор дескрипторов на A/B/C — сравниваем с
      // уникальным набором, а не с утроенным (это не рассинхрон, а Задача 2).
      const uniq = [...new Set(inHandout.map((s) => s.trim()))];
      const match = table.length === uniq.length && table.every((t, i) => t === uniq[i]);
      if (!match && uniq.length) {
        this.logger.warn(
          `Урок ${lessonId}, этап ${stageId} (${h.handoutType}): дескрипторы КМЖ≠приложение — ` +
          `таблица [${table.join(' | ')}] vs лист [${uniq.join(' | ')}]`,
        );
      }
    }
  }

  /** Тексты дескрипторов из jsonb раздатки (teacherContent или levels). */
  private descriptorsFromHandout(h: Handout): string[] {
    const out: string[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') {
        const o = v as Record<string, any>;
        if (Array.isArray(o.descriptors)) for (const d of o.descriptors) if (d?.text) out.push(String(d.text));
        for (const val of Object.values(o)) walk(val);
      }
    };
    walk(h.levels ?? h.teacherContent);
    return out;
  }

  /**
   * Сбрасывает презентацию, если она была сгенерирована раньше раздаток и
   * держит устаревшие дескрипторы. Удаляем запись — при следующей генерации
   * презентация прочитает уже синхронную таблицу. Учитель увидит, что
   * презентации нет, и пересоздаст её — это честнее, чем показывать слайды с
   * дескрипторами, которых нет в КМЖ.
   */
  private async invalidateStalePresentation(lessonId: string): Promise<void> {
    const pres = await this.presRepo.findOne({ where: { lessonId } });
    if (pres && pres.status === 'ready') {
      await this.presRepo.delete({ lessonId });
      this.logger.log(`Урок ${lessonId}: презентация сброшена после перегенерации раздаток (синхронизация дескрипторов)`);
    }
  }

  /**
   * Проверка покрытия целевых конструкций и точечная досылка (ТЗ, задача 3).
   *
   * Цель 8.6.17.1 требует «use if / unless / if only», но `unless` и `if only`
   * терялись при разворачивании цели обучения в цели урока и дальше не
   * попадали ни в одно задание. Корневая правка — в промпте целей; здесь
   * страховка на случай, когда конструкция всё же не дошла до материалов.
   *
   * Досылаем ТОЧЕЧНО, отдельным пунктом, не перегенерируя пакет: перегенерация
   * стоит денег и может испортить то, что уже вышло удачно.
   */
  private async ensureObjectiveCoverage(lesson: Lesson): Promise<void> {
    const required = parseRequiredElements(lesson.learningObjectives);
    if (!required.length) return;

    const handouts = await this.handoutRepo.find({ where: { lessonId: lesson.id }, order: { order: 'ASC' } });
    const usable = handouts.filter((h) => !h.error);
    if (!usable.length) return;

    const materials = usable.map((h) => JSON.stringify([h.studentContent, h.levels])).join(' ');
    const missing = missingElements(required, materials);
    if (!missing.length) return;

    // Приоритет из ТЗ: уровневое задание (там место для доп. пункта), затем
    // групповая работа, затем любое другое задание.
    const target =
      usable.find((h) => h.handoutType === 'individual' && h.levels) ??
      usable.find((h) => h.handoutType === 'group') ??
      usable.find((h) => h.handoutType === 'pair' || h.handoutType === 'text');
    if (!target) {
      this.logger.warn(`Урок ${lesson.id}: не покрыты [${missing.join(', ')}], но подходящего листа для досылки нет`);
      return;
    }

    for (const el of missing) this.appendCoverageItem(target, el, lesson.language ?? 'kz');
    await this.handoutRepo.save(target);
    this.logger.warn(
      `Урок ${lesson.id}: элементы цели [${missing.join(', ')}] не попали в материалы, ` +
      `дописаны точечно в лист «${target.handoutType}» (приложение ${target.order})`,
    );
  }

  /** Формулировка досылаемого пункта на языке урока. */
  private coverageItemText(element: string, language: string): { heading: string; body: string } {
    const q = `«${element}»`;
    if (language === 'en') {
      return { heading: 'Additional task', body: `Write one sentence of your own using ${q}.` };
    }
    if (language === 'ru') {
      return { heading: 'Дополнительное задание', body: `Составь одно своё предложение с ${q}.` };
    }
    return { heading: 'Қосымша тапсырма', body: `${q} қолданып өз сөйлеміңді жаз.` };
  }

  /**
   * Дописывает пункт в лист. Для уровневого — в уровень B (по ТЗ приоритетный
   * кандидат: базовый уровень A трогать не стоит, C и так самый нагруженный).
   * Пункт добавляется и в ученическую, и в учительскую версию, иначе учитель
   * не увидит того, что раздал ученику.
   */
  private appendCoverageItem(handout: Handout, element: string, language: string): void {
    const item = this.coverageItemText(element, language);
    const pushTo = (block: Record<string, any> | null | undefined) => {
      if (!block || typeof block !== 'object') return;
      if (!Array.isArray(block.sections)) block.sections = [];
      block.sections.push({ heading: item.heading, body: item.body });
    };

    const levels = handout.levels as Record<string, any> | null;
    if (levels) {
      const key = levels.B ? 'B' : levels.C ? 'C' : 'A';
      pushTo(levels[key]?.student);
      pushTo(levels[key]?.teacher);
      handout.levels = { ...levels };
      return;
    }
    pushTo(handout.studentContent as Record<string, any>);
    pushTo(handout.teacherContent as Record<string, any>);
    handout.studentContent = { ...(handout.studentContent as Record<string, any>) };
    handout.teacherContent = { ...(handout.teacherContent as Record<string, any>) };
  }

  /**
   * Перегенерация дескрипторов по фактическому тексту задания с кодовой
   * проверкой (ТЗ, задача 2).
   *
   * Максимум две регенерации: после второго провала пишем в лог с ID урока и
   * этапа и отдаём последний вариант — выдача пакета учителю не блокируется.
   * Если модель не вернула ничего, оставляем то, что уже есть в БД: пустые
   * дескрипторы хуже неточных.
   */
  private async refreshDescriptors(
    lesson: Lesson,
    stage: LessonStage,
    parsed: Record<string, any>,
    type: HandoutType,
  ): Promise<{ descriptors: { text: string; points: number }[]; cost: number; perLevel?: LevelDescriptors }> {
    const pts = stage.points ?? 1;
    // Уровневое задание (ТЗ №2, задача 2): отдельный дескриптор на A/B/C для
    // карточек + обобщённый для таблицы (его читают КМЖ и презентация).
    if (isLeveled(type) && parsed.levels) {
      return this.refreshLeveledDescriptors(lesson, stage, parsed, pts);
    }
    const facts = taskFactsFromParsed(parsed, type);
    const ctx = {
      subject: lesson.subject, grade: lesson.grade, lessonTitle: lesson.lessonTitle,
      languageFocus: lesson.languageFocus ?? null, language: lesson.language ?? 'kz',
      learningObjectives: lesson.learningObjectives ?? [],
      lessonObjectives: lesson.lessonObjectives ?? [],
    };
    // Контекст для проверки «чужой конструкции»: тема, обе группы целей и сам
    // текст задания. Названное в дескрипторе должно встречаться хоть где-то.
    const context = [
      lesson.lessonTitle, lesson.languageFocus,
      ...(lesson.learningObjectives ?? []), ...(lesson.lessonObjectives ?? []),
      facts.taskText,
    ].filter(Boolean).join(' ');

    // Пронумерованные задания приложения (ТЗ №2, задача 3): каждое обязано быть
    // отражено в дескрипторе. Групповая работа с 4 заданиями теряла балл за 4-е.
    const tasks = extractNumberedTasks(parsed, type);

    let cost = 0;
    let items: { text: string; points: number }[] = [];
    let problems: string[] = [];

    for (let attempt = 1; attempt <= 3; attempt++) {
      const p = descriptorsFromTaskPrompt(
        { stageType: stage.stageType, toolId: stage.toolId }, pts, facts.taskText, ctx, problems, tasks.length,
      );
      const res = await this.ai.request({
        action: 'lesson_descriptors', systemPrompt: p.system,
        messages: [{ role: 'user', content: p.user }],
        userId: lesson.userId, schoolId: lesson.schoolId,
      });
      cost += await this.cost.log(lesson.id, 'handouts', res);

      const got = this.parseJson<{ descriptors: { text: string; points: number }[] }>(res.content);
      const cand = Array.isArray(got?.descriptors) ? got!.descriptors.filter((d) => d?.text?.trim()) : [];
      if (!cand.length) {
        problems = ['ответ не содержал дескрипторов'];
        continue;
      }
      items = cand;

      const found = findDescriptorProblems(cand, {
        hasText: facts.hasText, partCount: facts.partCount, context,
      });
      // Непокрытые целевые метки заданий — тоже расхождение (ТЗ №2, задача 3).
      const uncovered = uncoveredTaskTargets(tasks, cand.map((d) => d.text).join(' '));
      const problemDetails = [
        ...found.map((f) => f.detail),
        ...uncovered.map((u) => `задание с «${u}» не отражено в дескрипторе`),
      ];
      if (!problemDetails.length) break;

      problems = problemDetails;
      if (attempt === 3) {
        this.logger.warn(
          `Дескрипторы урока ${lesson.id}, этап ${stage.id} (${stage.stageType}): ` +
          `после 2 регенераций остались расхождения — ${problems.join('; ')}`,
        );
      }
    }

    if (!items.length) {
      const kept = (await this.descRepo.find({ where: { stageId: stage.id }, order: { order: 'ASC' } }))
        .map((d) => ({ text: d.text, points: d.points }));
      this.logger.warn(`Дескрипторы урока ${lesson.id}, этап ${stage.id}: модель ничего не вернула, оставлены прежние`);
      return { descriptors: kept, cost };
    }

    // Сумма приводится кодом ровно к баллам этапа — инвариант тот же, что и в
    // плане; проверять его моделью не нужно.
    const adjusted = adjustDescriptorSum(items.map((d) => Number(d.points) || 0), pts);
    const finalItems = items.map((d, i) => ({ text: String(d.text).trim(), points: adjusted[i] }));

    await this.descRepo.delete({ stageId: stage.id });
    await this.descRepo.save(finalItems.map((d, i) =>
      this.descRepo.create({ stageId: stage.id, order: i, text: d.text, points: d.points }),
    ));
    return { descriptors: finalItems, cost };
  }

  /**
   * Уровневые дескрипторы (ТЗ №2, задача 2): по одному набору на карточку
   * A/B/C + обобщённый для таблицы. Один AI-вызов на все уровни, до 2 повторов
   * при расхождениях кодовой проверки (пункт ссылается на чужой уровень / на
   * текст, которого нет). Обобщённый идёт в lesson_descriptors — его читают
   * КМЖ и презентация (решение: показывать один обобщённый). Наборы уровней
   * возвращаются для карточек в jsonb раздатки.
   */
  private async refreshLeveledDescriptors(
    lesson: Lesson,
    stage: LessonStage,
    parsed: Record<string, any>,
    pts: number,
  ): Promise<{ descriptors: { text: string; points: number }[]; cost: number; perLevel: LevelDescriptors }> {
    const ctx = {
      subject: lesson.subject, grade: lesson.grade, lessonTitle: lesson.lessonTitle,
      languageFocus: lesson.languageFocus ?? null, language: lesson.language ?? 'kz',
      learningObjectives: lesson.learningObjectives ?? [], lessonObjectives: lesson.lessonObjectives ?? [],
    };
    const facts = { A: levelFacts(parsed, 'A'), B: levelFacts(parsed, 'B'), C: levelFacts(parsed, 'C') };
    const themeCtx = [lesson.lessonTitle, lesson.languageFocus, ...(lesson.learningObjectives ?? []), ...(lesson.lessonObjectives ?? [])]
      .filter(Boolean).join(' ');

    type Sets = { A: any[]; B: any[]; C: any[]; general: any[] };
    let cost = 0;
    let got: Sets | null = null;
    let problems: string[] = [];

    for (let attempt = 1; attempt <= 3; attempt++) {
      const p = leveledDescriptorsPrompt(
        { A: facts.A.taskText, B: facts.B.taskText, C: facts.C.taskText }, pts, ctx, problems,
      );
      const res = await this.ai.request({
        action: 'lesson_descriptors', systemPrompt: p.system, messages: [{ role: 'user', content: p.user }],
        userId: lesson.userId, schoolId: lesson.schoolId,
      });
      cost += await this.cost.log(lesson.id, 'handouts', res);
      const parsedSets = this.parseJson<Sets>(res.content);
      const ok = parsedSets && (['A', 'B', 'C', 'general'] as const).every((k) => Array.isArray(parsedSets[k]) && parsedSets[k].some((d) => d?.text?.trim()));
      if (!ok) { problems = ['ответ не содержал все четыре набора дескрипторов']; continue; }
      got = parsedSets!;

      // Каждый уровень проверяем ПРОТИВ СВОЕЙ карточки: пункт про другой уровень
      // или про несуществующий текст — расхождение (ТЗ №2, задача 2).
      const found: string[] = [];
      for (const k of ['A', 'B', 'C'] as const) {
        const f = facts[k];
        const probs = findDescriptorProblems(got[k], { hasText: f.hasText, partCount: f.partCount, context: `${themeCtx} ${f.taskText}` });
        found.push(...probs.map((x) => `[уровень ${k}] ${x.detail}`));
      }
      if (!found.length) break;
      problems = found;
      if (attempt === 3) {
        this.logger.warn(`Уровневые дескрипторы урока ${lesson.id}, этап ${stage.id}: после 2 регенераций расхождения — ${found.join('; ')}`);
      }
    }

    if (!got) {
      const kept = (await this.descRepo.find({ where: { stageId: stage.id }, order: { order: 'ASC' } })).map((d) => ({ text: d.text, points: d.points }));
      this.logger.warn(`Уровневые дескрипторы урока ${lesson.id}, этап ${stage.id}: модель ничего не вернула, оставлены прежние`);
      return { descriptors: kept, cost, perLevel: { A: kept, B: kept, C: kept } };
    }

    // Каждый набор приводим суммой ровно к баллам этапа — и уровни, и обобщённый.
    const norm = (arr: any[]) => {
      const clean = arr.filter((d) => d?.text?.trim());
      const adj = adjustDescriptorSum(clean.map((d) => Number(d.points) || 0), pts);
      return clean.map((d, i) => ({ text: String(d.text).trim(), points: adj[i] }));
    };
    const perLevel: LevelDescriptors = { A: norm(got.A), B: norm(got.B), C: norm(got.C) };
    const general = norm(got.general);

    // Обобщённый — в таблицу (КМЖ + презентация читают её).
    await this.descRepo.delete({ stageId: stage.id });
    await this.descRepo.save(general.map((d, i) => this.descRepo.create({ stageId: stage.id, order: i, text: d.text, points: d.points })));
    return { descriptors: general, cost, perLevel };
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
    perLevel?: LevelDescriptors,
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
        // Дескриптор КАРТОЧКИ — свой на каждый уровень (ТЗ №2, задача 2).
        // Обобщённый (scoring.descriptors) на карточку не идёт — он для КМЖ.
        const levelScoring = stage.isAssessed
          ? { descriptors: perLevel?.[k] ?? descriptors, points: stage.points }
          : {};
        levels[k] = { student, teacher: { ...student, ...extra, ...levelScoring } };
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
