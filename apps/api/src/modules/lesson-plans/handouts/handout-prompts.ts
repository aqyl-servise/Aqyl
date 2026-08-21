import { HandoutType } from '../entities/handout.entity';
import { isLeveled } from './handout-content';
import { kazakhTermsBlock } from '../prompts/term-glossary';

const SYSTEM =
  'Ты — опытный методист системы образования Республики Казахстан. ' +
  'Ты готовишь ГОТОВЫЕ раздаточные материалы к уроку — то, что учитель раздаст ученикам, ' +
  'а не описание в плане. Пиши конкретное содержание: тексты, вопросы, задания, реплики. ' +
  'Отвечай СТРОГО валидным JSON без преамбулы и без markdown-ограждений (```).';

const LANG_NAME: Record<string, string> = { kz: 'казахском', ru: 'русском', en: 'английском' };

// Ряд букв вариантов — должен совпадать с OPTION_LETTERS в export/handout-html.ts,
// иначе ключ учителя будет ссылаться на буквы, которых нет на листе ученика.
const OPTION_LETTERS_HINT: Record<string, string> = {
  kz: 'А, Ә, Б, В',
  ru: 'А, Б, В, Г',
  en: 'A, B, C, D',
};
function optionLettersHint(language?: string): string {
  return OPTION_LETTERS_HINT[language ?? ''] ?? OPTION_LETTERS_HINT.kz;
}

function langRule(language?: string, subject?: string | null): string {
  const name = LANG_NAME[language ?? ''] ?? 'казахском';
  const base =
    `ЯЗЫК: пиши ВЕСЬ материал ИСКЛЮЧИТЕЛЬНО на ${name} языке — задания, тексты, вопросы, ключи, ` +
    'критерии. Не вставляй слова на других языках, кроме формул, химических символов и общепринятых сокращений.';
  // Чистка казахской терминологии (ТЗ 1.5.1, B.1 + глоссарий B.2).
  const terms = kazakhTermsBlock(language, subject);
  return terms ? `${base}\n${terms}` : base;
}

// Ограничения объёма по типу листа (ТЗ 1.2, оптимизация трат). Платим за
// выходные токены — короткий, но полный лист дешевле и не упирается в потолок.
const LENGTH_CAP: Record<HandoutType, string> = {
  warmup: 'Объём: до 120 слов всего.',
  explanation: 'Объём: до 200 слов всего.',
  individual: 'Объём: каждый уровень A/B/C — до 120 слов.',
  pair: 'Объём: до 200 слов всего.',
  group: 'Объём: до 220 слов всего.',
  text: 'Объём: текст 150–200 слов + 3–5 вопросов.',
  quiz: 'Объём: 5–8 вопросов, кратко.',
  reflection: 'Объём: до 120 слов всего.',
};

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

// Схема структурированного вывода (tool use). API гарантирует валидный JSON по
// ней — поэтому текстовый JSON модели, который рвался и давал пустые листы,
// больше не парсим. Схема нарочно допускающая: модель заполняет нужные под тип
// поля (student/teacherExtra для обычных листов, levels — для A/B/C).
const blockSchema = {
  type: 'object',
  properties: {
    instructions: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string' },
          body: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { q: { type: 'string' }, options: { type: 'array', items: { type: 'string' } } },
      },
    },
    answerLines: { type: 'number' },
  },
};
const teacherExtraSchema = {
  type: 'object',
  properties: { answers: { type: 'string' }, criteria: { type: 'string' }, notes: { type: 'string' } },
};
const levelSchema = {
  type: 'object',
  properties: { ...blockSchema.properties, teacherExtra: teacherExtraSchema },
};

export const HANDOUT_TOOL = {
  name: 'emit_handout',
  description: 'Вернуть готовый раздаточный лист урока структурированными полями.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      student: blockSchema,
      teacherExtra: teacherExtraSchema,
      levels: {
        type: 'object',
        properties: { A: levelSchema, B: levelSchema, C: levelSchema },
      },
    },
    required: ['title'],
  },
};

export function buildHandoutPrompt(opts: HandoutPromptOpts): { system: string; user: string } {
  const { handoutType, toolDescription, isAssessed, points, valueName, ctx } = opts;

  const valueRule = valueName
    ? `ЦЕННОСТЬ: задание привязано к ценности «${valueName}». Органично вплети её в содержание — ` +
      `через сюжет текста, пример или формулировку, а не отдельным лозунгом. Это должно быть видно в материале.\n`
    : '';

  // Ключи/критерии нужны только для оцениваемого задания. Тренировочное —
  // без ответов и баллов (teacherExtra оставляем пустым).
  // Ключ учителя — самая объёмная часть ответа (замер на проде: 226–393 слова
  // против 234–404 слов самих заданий), потому что раньше не был ограничен
  // ничем: LENGTH_CAP описывает только задания. Учителю нужен ответ, а не
  // разбор — ограничиваем явно, содержание для ученика не трогаем.
  const teacherRule = isAssessed
    ? `Это ОЦЕНИВАЕМОЕ задание на ${points ?? '—'} балл(ов). В teacherExtra дай ключи/ответы (answers) ` +
      `и критерии оценивания (criteria) на языке материала.\n` +
      `ОБЪЁМ КЛЮЧА: answers — ТОЛЬКО готовые ответы (число, буква, краткая формулировка), ` +
      `перечислением через «|», без хода решения и без пояснений. criteria — до 25 слов: за что даётся балл. ` +
      // Дробные баллы неудобно считать для БЖБ (ТЗ №2, задача 6).
      `БАЛЛЫ В КРИТЕРИИ — ТОЛЬКО ЦЕЛЫЕ: не пиши «0,5 балла», «0.4 per», «1/2 балл». ` +
      `Распределяй целые баллы по числу заданий или диапазонам верных ответов. ` +
      `notes — до 15 слов и только если есть о чём предупредить. Подсказка про ошибку, ` +
      `возможную ИМЕННО в ЭТОМ задании: формы и конструкции, которые называешь в подсказке, ` +
      `должны реально встречаться в задании или ключе этой карточки. Не давай общих ` +
      `подсказок по теме урока, если их не к чему привязать в самом задании (ТЗ №2, задача 5).`
    : 'Это ТРЕНИРОВОЧНОЕ задание без баллов. teacherExtra оставь пустым объектом {}.';

  // Какие поля инструмента заполнять (структуру задаёт схема HANDOUT_TOOL).
  // Второе задание уровня C (ТЗ, задача 4). После оптимизации уровень C
  // сократился вдвое и из него ушло продуктивное письмо связным текстом — при
  // том что вторая цель урока (8.5.3.1 write with moderate grammatical
  // accuracy) именно про письмо, а сильному ученику 3 пункта на 8 минут мало.
  // Замер прироста: +299 выходных токенов на лист ≈ +2,35 ₸ на урок.
  const levelCWriting =
    `\nУРОВЕНЬ C — ВТОРОЕ ЗАДАНИЕ: после основного добавь короткое продуктивное письмо: ` +
    `связный текст 3-4 предложения по теме, в котором ученик применяет минимум ДВЕ целевые ` +
    `конструкции урока. Это отдельная секция уровня C, до 40 слов инструкции.`;

  const fields = isLeveled(handoutType)
    ? `Заполни levels.A, levels.B, levels.C — три самостоятельных задания по теме (A проще C), ` +
      `в каждом instructions и sections` + (isAssessed ? `, а ключи/критерии в его teacherExtra.` : `.`) +
      levelCWriting
    : handoutType === 'quiz'
    ? `Заполни student.questions (каждый: q + options)` +
      (isAssessed ? ` и teacherExtra (answers — правильные варианты, criteria).` : `.`) +
      // Буквы вариантов проставляет вёрстка листа, поэтому в самом тексте
      // варианта их быть не должно, а ключ обязан ссылаться на тот же ряд.
      ` БУКВЫ ВАРИАНТОВ: в options НЕ вставляй буквы и номера — только текст варианта. ` +
      `В ключе нумеруй ответы по ряду ${optionLettersHint(ctx.language)} в порядке вариантов ` +
      `(формат «1-${optionLettersHint(ctx.language).split(', ')[0]} | 2-…»).`
    : `Заполни student (instructions + sections)` +
      (isAssessed ? ` и teacherExtra (answers, criteria).` : `.`);

  return {
    system: SYSTEM,
    user:
      `Сделай готовый раздаточный материал. ТИП: ${TYPE_GUIDE[handoutType]}\n` +
      `Инструмент: ${toolDescription || '—'}.\n` +
      `Предмет: ${ctx.subject ?? '—'}, класс: ${ctx.grade ?? '—'}, тема: ${ctx.lessonTitle ?? '—'}.\n` +
      `Цели урока: ${ctx.lessonObjectives.join('; ') || '—'}.\n` +
      valueRule +
      `${teacherRule}\n` +
      // Профилактика дефекта rewrite/transform (ТЗ №2, задача 4): в заданиях
      // «переписать с данной конструкцией» исходное предложение НЕ должно уже
      // содержать целевую конструкцию — ученик её строит, а не переписывает.
      `ТРАНСФОРМАЦИИ: если в задании нужно переписать предложение с заданной ` +
      `конструкцией (if only / unless / relative clause с why и т.п.) — в ИСХОДНОМ ` +
      `предложении этой конструкции быть НЕ должно, ученик её строит. Ключ обязан ` +
      `отличаться от условия, а не повторять его.\n` +
      `${langRule(ctx.language, ctx.subject)}\n` +
      `Материал должен быть готов к печати: конкретные формулировки, без «вставьте сюда» и плейсхолдеров.\n` +
      `${LENGTH_CAP[handoutType]} Пиши компактно, по делу.\n` +
      `Верни результат вызовом инструмента emit_handout. ${fields}`,
  };
}
