import { HandoutType } from '../entities/handout.entity';
import { isLeveled } from './handout-content';

const SYSTEM =
  'Ты — опытный методист системы образования Республики Казахстан. ' +
  'Ты готовишь ГОТОВЫЕ раздаточные материалы к уроку — то, что учитель раздаст ученикам, ' +
  'а не описание в плане. Пиши конкретное содержание: тексты, вопросы, задания, реплики. ' +
  'Отвечай СТРОГО валидным JSON без преамбулы и без markdown-ограждений (```).';

const LANG_NAME: Record<string, string> = { kz: 'казахском', ru: 'русском', en: 'английском' };

function langRule(language?: string): string {
  const name = LANG_NAME[language ?? ''] ?? 'казахском';
  return (
    `ЯЗЫК: пиши ВЕСЬ материал ИСКЛЮЧИТЕЛЬНО на ${name} языке — задания, тексты, вопросы, ключи, ` +
    'критерии. Не вставляй слова на других языках, кроме формул, химических символов и общепринятых сокращений.'
  );
}

// Что генерировать по типу материала.
const TYPE_GUIDE: Record<HandoutType, string> = {
  warmup: 'Карточка разогрева: 3–5 коротких вопросов или мини-задание на актуализацию перед темой.',
  explanation: 'Опорный материал к объяснению: краткая схема/структура темы. Если это диаграмма — дай текстовое описание того, что на ней изображено, чтобы учитель мог начертить.',
  individual: 'Индивидуальный лист. Дай ТРИ уровня сложности: A — базовый, B — средний, C — продвинутый. На каждом уровне своё задание по теме.',
  pair: 'Карточки для работы в паре: роли двух участников и их реплики/задания, чтобы получился диалог или взаимопроверка.',
  group: 'Материал для группы: описание кейса/ситуации и задание группе, роли участников, что должны получить на выходе.',
  text: 'Адаптированный под уровень класса текст (150–250 слов) и 3–5 вопросов к нему.',
  quiz: 'Квиз: 5–8 вопросов с вариантами ответов (по 3–4 варианта). В ключе учителя — правильные варианты.',
  reflection: 'Лист рефлексии: вопросы/шаблон для заполнения учеником по итогам урока.',
};

export interface HandoutPromptCtx {
  subject?: string;
  grade?: number;
  lessonTitle?: string;
  language?: string;
  lessonObjectives: string[];
}

export interface HandoutPromptOpts {
  handoutType: HandoutType;
  toolDescription: string;
  isAssessed: boolean;
  points?: number | null;
  valueName?: string | null; // название ценности, если задание к ней привязано
  ctx: HandoutPromptCtx;
}

export function buildHandoutPrompt(opts: HandoutPromptOpts): { system: string; user: string } {
  const { handoutType, toolDescription, isAssessed, points, valueName, ctx } = opts;

  const valueRule = valueName
    ? `ЦЕННОСТЬ: задание привязано к ценности «${valueName}». Органично вплети её в содержание — ` +
      `через сюжет текста, пример или формулировку, а не отдельным лозунгом. Это должно быть видно в материале.\n`
    : '';

  // Ключи/критерии нужны только для оцениваемого задания. Тренировочное —
  // без ответов и баллов (teacherExtra оставляем пустым).
  const teacherRule = isAssessed
    ? `Это ОЦЕНИВАЕМОЕ задание на ${points ?? '—'} балл(ов). В teacherExtra дай ключи/ответы (answers) ` +
      `и критерии оценивания (criteria) на языке материала.`
    : 'Это ТРЕНИРОВОЧНОЕ задание без баллов. teacherExtra оставь пустым объектом {}.';

  const shape = isLeveled(handoutType)
    ? `Верни JSON:\n` +
      `{"title":"...","levels":{` +
      `"A":{"instructions":"...","sections":[{"heading":"...","body":"...","items":["..."]}],"teacherExtra":{"answers":"...","criteria":"..."}},` +
      `"B":{...},"C":{...}}}\n` +
      `Каждый уровень — самостоятельное задание по теме, A проще C.`
    : handoutType === 'quiz'
    ? `Верни JSON:\n` +
      `{"title":"...","student":{"instructions":"...","questions":[{"q":"...","options":["A) ...","B) ...","C) ..."]}]},` +
      `"teacherExtra":{"answers":"...","criteria":"..."}}`
    : `Верни JSON:\n` +
      `{"title":"...","student":{"instructions":"...","sections":[{"heading":"...","body":"...","items":["..."]}]},` +
      `"teacherExtra":{"answers":"...","criteria":"..."}}`;

  return {
    system: SYSTEM,
    user:
      `Сделай готовый раздаточный материал. ТИП: ${TYPE_GUIDE[handoutType]}\n` +
      `Инструмент: ${toolDescription || '—'}.\n` +
      `Предмет: ${ctx.subject ?? '—'}, класс: ${ctx.grade ?? '—'}, тема: ${ctx.lessonTitle ?? '—'}.\n` +
      `Цели урока: ${ctx.lessonObjectives.join('; ') || '—'}.\n` +
      valueRule +
      `${teacherRule}\n` +
      `${langRule(ctx.language)}\n` +
      `Материал должен быть готов к печати: конкретные формулировки, без «вставьте сюда» и плейсхолдеров.\n` +
      `${shape}\n` +
      `Без markdown и пояснений вне JSON.`,
  };
}
