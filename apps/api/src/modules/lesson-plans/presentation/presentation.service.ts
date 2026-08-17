import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../entities/lesson.entity';
import { LessonStage } from '../entities/lesson-stage.entity';
import { Presentation } from '../entities/presentation.entity';
import { AiClientService } from '../../../services/ai-client.service';
import { CostLoggerService } from '../handouts/cost-logger.service';
import { PdfService } from '../export/pdf.service';
import { findWrongTerms, flattenStrings } from '../prompts/term-glossary';
import { buildPresentationPrompt, PRESENTATION_TOOL, PresStageInput } from './presentation-prompts';
import { presentationHtml } from './presentation-html';

export interface PresCtx {
  userId: string;
  schoolId: string | null;
}

const LABELS: Record<string, { learning: string; quiz: string; thanks: string; review: string }> = {
  kz: { learning: 'Оқу мақсаттары', quiz: 'Квиз', thanks: 'Рахмет!', review: 'Бекіту сұрақтары' },
  ru: { learning: 'Цели обучения', quiz: 'Квиз', thanks: 'Спасибо!', review: 'Вопросы для закрепления' },
  en: { learning: 'Learning objectives', quiz: 'Quiz', thanks: 'Thank you!', review: 'Review questions' },
};
const lg = (l?: string | null) => (l && LABELS[l] ? l : 'kz');

@Injectable()
export class PresentationService {
  private readonly logger = new Logger(PresentationService.name);

  constructor(
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(LessonStage) private readonly stageRepo: Repository<LessonStage>,
    @InjectRepository(Presentation) private readonly presRepo: Repository<Presentation>,
    private readonly ai: AiClientService,
    private readonly cost: CostLoggerService,
    private readonly pdf: PdfService,
  ) {}

  /** Готовая презентация → PDF (16:9), фаза 2. */
  async exportPdf(lessonId: string, ctx: PresCtx): Promise<Buffer> {
    const { lesson, pres } = await this.loadForExport(lessonId, ctx);
    return this.pdf.renderSlides(presentationHtml(pres.slides ?? [], lesson.lessonTitle ?? ''));
  }

  // ── Public API ──────────────────────────────────────────────────
  async generate(lessonId: string, ctx: PresCtx): Promise<{ status: string }> {
    const lesson = await this.ownReady(lessonId, ctx);
    let pres = await this.presRepo.findOne({ where: { lessonId } });
    if (!pres) pres = this.presRepo.create({ lessonId });
    pres.status = 'generating';
    pres.generationError = null;
    pres.generationCost = 0;
    await this.presRepo.save(pres);
    await this.cost.clear(lessonId, 'presentation');

    void this.runPresentation(lesson).catch(async (err) => {
      this.logger.error(`Презентация урока ${lessonId} упала: ${(err as Error).message}`);
      await this.presRepo.update({ lessonId }, {
        status: 'error', generationError: (err as Error).message?.slice(0, 500),
      });
    });
    return { status: 'generating' };
  }

  async getStatus(lessonId: string, ctx: PresCtx) {
    await this.own(lessonId, ctx);
    const pres = await this.presRepo.findOne({ where: { lessonId } });
    return {
      status: pres?.status ?? null,
      generationError: pres?.generationError ?? null,
      slideCount: Array.isArray(pres?.slides) ? pres!.slides!.length : 0,
      generationCost: pres?.generationCost ?? 0,
    };
  }

  // ── Generation ──────────────────────────────────────────────────
  private async runPresentation(lesson: Lesson): Promise<void> {
    const lessonId = lesson.id;
    const stages = await this.stageRepo.find({ where: { lessonId }, order: { order: 'ASC' } });
    const presStages: PresStageInput[] = stages.map((s) => ({
      stageType: s.stageType, stageName: s.stageName, teacherActions: s.teacherActions, studentActions: s.studentActions,
    }));
    const ctx = {
      subject: lesson.subject, grade: lesson.grade, lessonTitle: lesson.lessonTitle,
      language: lesson.language ?? 'kz', lessonObjectives: lesson.lessonObjectives ?? [], stages: presStages,
    };

    let cost = 0;
    let ai: Record<string, any> | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const p = buildPresentationPrompt(ctx);
      const res = await this.ai.requestTool<Record<string, any>>({
        action: 'presentation_generate', systemPrompt: p.system,
        messages: [{ role: 'user', content: p.user }],
        userId: lesson.userId, schoolId: lesson.schoolId,
        maxTokens: attempt === 1 ? undefined : 3000,
      }, PRESENTATION_TOOL);
      cost += await this.cost.log(lessonId, 'presentation', {
        content: '', model: res.model, tokensIn: res.tokensIn, tokensOut: res.tokensOut,
      });
      if (res.data && Array.isArray(res.data.slides) && res.data.slides.length) {
        const wrong = lesson.language === 'kz' ? findWrongTerms(flattenStrings(res.data), lesson.subject) : [];
        if (!wrong.length || attempt === 2) {
          ai = res.data;
          if (wrong.length) this.logger.warn(`Презентация урока ${lessonId}: остались русские термины [${wrong.join(', ')}]`);
          break;
        }
        this.logger.warn(`Презентация урока ${lessonId}: русские термины [${wrong.join(', ')}], повтор`);
        continue;
      }
      this.logger.warn(`Презентация урока ${lessonId}: пустой ответ, попытка ${attempt}/2`);
    }

    const slides = this.assemble(lesson, ai?.slides ?? [], Array.isArray(ai?.review) ? ai!.review : []);
    // TypeORM не любит jsonb-массив в partial update — приводим тип.
    await this.presRepo.update({ lessonId }, { status: 'ready', generationCost: cost, slides: slides as never });
  }

  /** Собирает финальный набор: титул + цели обучения + этапы + закрепление + финал. */
  private assemble(lesson: Lesson, aiSlides: any[], review: unknown[]): Record<string, unknown>[] {
    const t = LABELS[lg(lesson.language)];
    const out: Record<string, unknown>[] = [];
    out.push({
      kind: 'title', title: lesson.lessonTitle ?? '', subject: lesson.subject ?? '',
      grade: lesson.grade ?? null, lessonNumber: lesson.lessonNumber ?? '',
    });
    // Слайд целей — цели ОБУЧЕНИЯ с кодами (ТЗ 2.1, #2), не цели урока.
    out.push({ kind: 'objectives', title: t.learning, bullets: lesson.learningObjectives ?? [] });

    let explanationCount = 0;
    for (const s of Array.isArray(aiSlides) ? aiSlides : []) {
      const stageType = String(s?.stageType ?? 'content');
      if (stageType === 'quiz' && Array.isArray(s?.questions) && s.questions.length) {
        for (const q of s.questions) {
          out.push({ kind: 'quiz', stageType: 'quiz', title: s.title || t.quiz, question: String(q?.q ?? ''), options: Array.isArray(q?.options) ? q.options : [] });
        }
        continue;
      }
      // Объяснение — максимум 3 слайда (ТЗ 2.0): лишние отбрасываем.
      if (stageType === 'explanation') {
        if (explanationCount >= 3) continue;
        explanationCount++;
      }
      out.push({ kind: 'content', stageType, title: String(s?.title ?? ''), bullets: Array.isArray(s?.bullets) ? s.bullets : [] });
    }

    // Предпоследний слайд — закрепление: 5-6 открытых вопросов (ТЗ 2.1, #4).
    const reviewQ = (Array.isArray(review) ? review : []).map((q) => String(q ?? '')).filter(Boolean).slice(0, 6);
    if (reviewQ.length) out.push({ kind: 'review', title: t.review, questions: reviewQ });

    out.push({ kind: 'final', title: t.thanks });
    return out;
  }

  // ── helpers ─────────────────────────────────────────────────────
  private async own(lessonId: string, ctx: PresCtx): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId, userId: ctx.userId } });
    if (!lesson) throw new HttpException('Урок не найден', HttpStatus.NOT_FOUND);
    return lesson;
  }
  private async ownReady(lessonId: string, ctx: PresCtx): Promise<Lesson> {
    const lesson = await this.own(lessonId, ctx);
    if (lesson.status !== 'ready') throw new HttpException('Сначала сгенерируйте план урока', HttpStatus.BAD_REQUEST);
    return lesson;
  }

  /** Урок + презентация — для экспорта PDF (фаза 2). */
  async loadForExport(lessonId: string, ctx: PresCtx): Promise<{ lesson: Lesson; pres: Presentation }> {
    const lesson = await this.own(lessonId, ctx);
    const pres = await this.presRepo.findOne({ where: { lessonId } });
    if (!pres || !Array.isArray(pres.slides) || !pres.slides.length) {
      throw new HttpException('Презентация ещё не сгенерирована', HttpStatus.BAD_REQUEST);
    }
    return { lesson, pres };
  }
}
