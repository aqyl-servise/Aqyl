import { kazakhTermsBlock } from '../prompts/term-glossary';

/**
 * Промпт генерации слайдов презентации по плану урока (ТЗ 2.0).
 *
 * ОДИН структурный вызов (tool use) на всю презентацию — по духу §169
 * (дешевле, переиспользуем содержание плана). Титул/цели/финал собирает код;
 * модель даёт тезисы по этапам: объяснение — до 3 слайдов, остальное — по 1.
 */

const SYSTEM =
  'Ты — методист. Ты делаешь СЛАЙДЫ презентации по готовому плану урока для показа ' +
  'на проекторе. Слайд — это ТЕЗИСЫ (заголовок + 3-6 коротких пунктов), а НЕ копия ячейки ' +
  'плана. Крупно, кратко, читаемо с задних парт. Дескрипторы и критерии на слайды НЕ выноси.';

export interface PresStageInput {
  stageType: string;
  stageName?: string | null;
  teacherActions?: string | null;
  studentActions?: string | null;
}
export interface PresPromptCtx {
  subject?: string | null;
  grade?: number | null;
  lessonTitle?: string | null;
  language?: string | null;
  lessonObjectives: string[];
  stages: PresStageInput[];
}

export const PRESENTATION_TOOL = {
  name: 'emit_slides',
  description: 'Вернуть слайды презентации тезисами по этапам урока.',
  input_schema: {
    type: 'object',
    properties: {
      slides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            stageType: { type: 'string' }, // warmup | explanation | task | quiz | reflection
            title: { type: 'string' },
            bullets: { type: 'array', items: { type: 'string' } },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: { q: { type: 'string' }, options: { type: 'array', items: { type: 'string' } } },
              },
            },
          },
        },
      },
      // Вопросы закрепления (ТЗ 2.1): 5-6 открытых вопросов по теме, без вариантов.
      review: { type: 'array', items: { type: 'string' } },
    },
    required: ['slides'],
  },
};

export function buildPresentationPrompt(ctx: PresPromptCtx): { system: string; user: string } {
  const stagesText = ctx.stages
    .map((s, i) => `${i + 1}) [${s.stageType}] ${s.stageName ?? ''} — учитель: ${s.teacherActions ?? '—'}; ученик: ${s.studentActions ?? '—'}`)
    .join('\n');

  const langLine =
    ctx.language === 'kz' ? 'казахском' : ctx.language === 'en' ? 'английском' : 'русском';

  return {
    system: SYSTEM,
    user:
      `Сделай слайды по этапам урока (тезисы для показа).\n` +
      `Предмет: ${ctx.subject ?? '—'}, класс: ${ctx.grade ?? '—'}, тема: ${ctx.lessonTitle ?? '—'}.\n` +
      `Этапы плана:\n${stagesText}\n\n` +
      `ПРАВИЛА КОЛИЧЕСТВА:\n` +
      `- Этап объяснения (explanation) — АКЦЕНТ: до 3 слайдов тезисов нового материала ` +
      `(ключевые правила, определения, формулы). НЕ больше 3.\n` +
      `- Разминка, каждое задание (task), рефлексия — по 1 слайду.\n` +
      `- Квиз (quiz), если есть — заполни questions (каждый: q + options), БЕЗ указания правильного.\n` +
      `- НЕ делай слайды титула, целей и финала — их соберёт система.\n` +
      `СОДЕРЖАНИЕ: каждый слайд — заголовок + 3-6 коротких пунктов (bullets). Тезисы, не полотно. ` +
      `Не копируй текст плана дословно, ужимай в тезисы. Дескрипторы/критерии не включай.\n` +
      `ЗАКРЕПЛЕНИЕ: также верни review — 5-6 ОТКРЫТЫХ вопросов по теме урока для устного ` +
      `закрепления в конце (БЕЗ вариантов ответа), пронумерованно по смыслу.\n` +
      `ЯЗЫК: пиши на ${langLine} языке. ${kazakhTermsBlock(ctx.language ?? undefined, ctx.subject)}\n` +
      `Верни результат вызовом инструмента emit_slides. slides — в порядке этапов.`,
  };
}
