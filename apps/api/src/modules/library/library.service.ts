import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Lesson } from '../lesson-plans/entities/lesson.entity';
import { LessonPlansService, UserCtx } from '../lesson-plans/lesson-plans.service';
import { LessonExample } from './lesson-example.entity';
import { LIBRARY_PRESETS } from './library-presets';
import { exampleSlug } from './library-utils';

/** Служебный аккаунт, от имени которого генерируются примеры. Войти в него нельзя. */
const SYSTEM_EMAIL = 'library@aqyl-service.kz';
/** Генерация дольше этого — сбой: закрывает её OpsAlertService, очередь идёт дальше. */
const STUCK_MS = 25 * 60_000;

export interface PublicPlan {
  slug: string;
  lang: 'ru' | 'kz';
  subject: string;
  grade: number;
  topic: string;
  publishedAt: Date | null;
  plan: {
    durationMinutes: number | null;
    /** Цели обучения по кодам — только если коды указали при создании примера. */
    curriculum: Array<{ code: string; text: string }>;
    lessonObjectives: string[];
    valueLink: string | null;
    homework: string | null;
    stages: Array<{
      stageName: string; timeMinutes: number;
      teacherActions: string; studentActions: string;
      assessmentCriteria: string; method: string; resources: string;
      points: number | null;
      descriptors: Array<{ text: string; points: number }>;
    }>;
  } | null;
}

/**
 * Библиотека примеров планов уроков для поиска.
 *
 * 29–30.09.2026 из семи новых учителей четверо пришли из Яндекса и Google —
 * поиск уже приводит людей, а страниц, которые он мог бы показывать, у нас
 * нет: только главная. Учителя ищут конкретное — «КСП по химии 8 класс
 * кислород», — и страница с готовым планом по этой теме отвечает на запрос
 * лучше любой главной.
 *
 * Генерация — по одной за раз: сервер с 2 ГБ памяти, и тридцать параллельных
 * генераций ему не по силам. Публикация — только после вычитки человеком.
 */
@Injectable()
export class LibraryService implements OnModuleInit {
  private readonly logger = new Logger(LibraryService.name);
  private systemId: string | null = null;
  private ticking = false;

  constructor(
    @InjectRepository(LessonExample) private readonly examples: Repository<LessonExample>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    private readonly lessonPlans: LessonPlansService,
    private readonly db: DataSource,
  ) {}

  onModuleInit(): void {
    // Очередь могла остаться после перезапуска — продолжаем её сразу.
    setTimeout(() => void this.tick(), 15_000);
  }

  private async systemCtx(): Promise<UserCtx> {
    if (!this.systemId) {
      let t = await this.teachers.findOne({ where: { email: SYSTEM_EMAIL } });
      if (!t) {
        t = await this.teachers.save(this.teachers.create({
          fullName: 'Aqyl — библиотека примеров',
          email: SYSTEM_EMAIL,
          // Пароль никто не знает, статус inactive — вход закрыт вдвойне.
          passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          role: 'teacher',
          status: 'inactive',
          // Не b2c: списание уроков для него — no-op (SubscriptionService).
          registrationSource: 'system',
          isEmailVerified: false,
        }));
        this.logger.log('Создан служебный аккаунт библиотеки примеров');
      }
      this.systemId = t.id;
    }
    return { userId: this.systemId, schoolId: null };
  }

  // ── очередь генерации ───────────────────────────────────────────────────

  @Cron('*/2 * * * *', { name: 'library-queue' })
  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const ctx = await this.systemCtx();
      // Генерация, оборванная перезапуском (деплоем), — не вина темы: ставим
      // её в очередь заново сами. Настоящие сбои модели остаются «сбоем» и
      // ждут решения человека.
      await this.db.query(
        `UPDATE lesson_examples e SET "lessonId" = NULL
         FROM lessons l
         WHERE l.id = e."lessonId" AND l.status = 'error' AND l."generationError" LIKE 'Генерация прервалась%'
           AND e.status = 'draft'`,
      );
      // Идёт генерация — ждём её, одна за раз.
      const busy = await this.lessons.findOne({ where: { userId: ctx.userId, status: 'generating' } });
      if (busy && Date.now() - new Date(busy.updatedAt).getTime() < STUCK_MS) return;

      const next = await this.examples.findOne({ where: { lessonId: IsNull() }, order: { createdAt: 'ASC' } });
      if (!next) return;
      const lesson = await this.lessonPlans.createDraft(ctx, {
        language: next.lang,
        subject: next.subject,
        grade: next.grade,
        lessonTitle: next.topic,
        learningObjectives: next.objectives ?? [],
        durationMinutes: 45,
      });
      await this.examples.update({ id: next.id }, { lessonId: lesson.id });
      await this.lessonPlans.startGeneration(lesson.id, ctx, 'quick');
      this.logger.log(`Библиотека: генерация «${next.topic}» (${next.lang}, ${next.grade})`);
    } catch (err) {
      this.logger.error(`Очередь библиотеки: ${(err as Error).message}`);
    } finally {
      this.ticking = false;
    }
  }

  // ── админка ─────────────────────────────────────────────────────────────

  async adminList() {
    const rows = await this.examples.find({ order: { createdAt: 'DESC' } });
    const ids = rows.map((r) => r.lessonId).filter((x): x is string => !!x);
    const ls = ids.length ? await this.lessons.find({ where: { id: In(ids) }, select: ['id', 'status', 'generationError'] }) : [];
    const byId = new Map(ls.map((l) => [l.id, l]));
    return rows.map((r) => {
      const l = r.lessonId ? byId.get(r.lessonId) : undefined;
      return {
        id: r.id, slug: r.slug, lang: r.lang, subject: r.subject, grade: r.grade, topic: r.topic,
        objectives: r.objectives, status: r.status, views: r.views, publishedAt: r.publishedAt, createdAt: r.createdAt,
        // queued — ждёт очереди; дальше — статус самого урока.
        generation: !r.lessonId ? 'queued' : (l?.status ?? 'missing'),
        generationError: l?.generationError ?? null,
      };
    });
  }

  async create(p: { lang: 'ru' | 'kz'; subject: string; grade: number; topic: string; objectives?: string[] }) {
    let slug = exampleSlug(p);
    if (!slug) throw new BadRequestException('Не удалось составить адрес страницы');
    for (let i = 2; await this.examples.count({ where: { slug } }); i++) slug = `${exampleSlug(p)}-${i}`;
    const ex = await this.examples.save(this.examples.create({
      slug, lang: p.lang, subject: p.subject.trim(), grade: p.grade, topic: p.topic.trim(),
      objectives: (p.objectives ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 6),
      status: 'draft',
    }));
    void this.tick();
    return ex;
  }

  /** Стартовый набор: только те темы, которых ещё нет. */
  async seedPresets(): Promise<{ added: number }> {
    let added = 0;
    for (const p of LIBRARY_PRESETS) {
      if (await this.examples.count({ where: { slug: exampleSlug(p) } })) continue;
      await this.create(p);
      added++;
    }
    return { added };
  }

  /** Сбой генерации — поставить в очередь заново (новый урок; старый остаётся в истории). */
  async retry(id: string) {
    const ex = await this.examples.findOne({ where: { id } });
    if (!ex) throw new NotFoundException();
    if (ex.status === 'published') throw new BadRequestException('Сначала снимите пример с публикации');
    await this.examples.update({ id }, { lessonId: null });
    void this.tick();
    return { ok: true };
  }

  async setPublished(id: string, published: boolean) {
    const ex = await this.examples.findOne({ where: { id } });
    if (!ex) throw new NotFoundException();
    if (published) {
      const l = ex.lessonId ? await this.lessons.findOne({ where: { id: ex.lessonId } }) : null;
      if (l?.status !== 'ready') throw new BadRequestException('Опубликовать можно только готовый план');
    }
    await this.examples.update({ id }, {
      status: published ? 'published' : 'draft',
      publishedAt: published ? (ex.publishedAt ?? new Date()) : ex.publishedAt,
    });
    return { ok: true };
  }

  async remove(id: string) {
    await this.examples.delete({ id });
    return { ok: true };
  }

  async adminContent(id: string): Promise<PublicPlan> {
    const ex = await this.examples.findOne({ where: { id } });
    if (!ex) throw new NotFoundException();
    return this.toPublic(ex);
  }

  // ── публичное ───────────────────────────────────────────────────────────

  async publicList() {
    const rows = await this.examples.find({ where: { status: 'published' }, order: { subject: 'ASC', grade: 'ASC' } });
    return rows.map((r) => ({ slug: r.slug, lang: r.lang, subject: r.subject, grade: r.grade, topic: r.topic, publishedAt: r.publishedAt }));
  }

  async publicGet(slug: string): Promise<PublicPlan> {
    const ex = await this.examples.findOne({ where: { slug, status: 'published' } });
    if (!ex) throw new NotFoundException();
    await this.db.query(`UPDATE lesson_examples SET views = views + 1 WHERE id = $1`, [ex.id]);
    return this.toPublic(ex);
  }

  private async toPublic(ex: LessonExample): Promise<PublicPlan> {
    const base = { slug: ex.slug, lang: ex.lang, subject: ex.subject, grade: ex.grade, topic: ex.topic, publishedAt: ex.publishedAt ?? null };
    if (!ex.lessonId) return { ...base, plan: null };
    const ctx = await this.systemCtx();
    let l: Lesson;
    try {
      l = await this.lessonPlans.getOne(ex.lessonId, ctx);
    } catch {
      return { ...base, plan: null };
    }
    if (l.status !== 'ready') return { ...base, plan: null };
    const given = new Set((ex.objectives ?? []).map((c) => c.trim()));
    const curriculum = given.size
      ? (l.core?.objectives?.curriculum ?? []).filter((c) => given.has(String(c.code).trim()))
      : [];
    return {
      ...base,
      plan: {
        durationMinutes: l.durationMinutes ?? null,
        curriculum,
        lessonObjectives: l.core?.objectives?.lesson?.length ? l.core.objectives.lesson : (l.lessonObjectives ?? []),
        valueLink: l.valueLink ?? null,
        homework: l.homework ?? null,
        stages: (l.stages ?? []).map((s) => ({
          stageName: s.stageName ?? '', timeMinutes: s.timeMinutes ?? 0,
          teacherActions: s.teacherActions ?? '', studentActions: s.studentActions ?? '',
          assessmentCriteria: s.assessmentCriteria ?? '', method: s.method ?? '', resources: s.resources ?? '',
          points: s.isAssessed ? (s.points ?? null) : null,
          descriptors: (s.descriptors ?? []).map((d) => ({ text: d.text, points: d.points })),
        })),
      },
    };
  }
}
