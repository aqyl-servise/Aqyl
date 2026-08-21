import { HandoutType } from '../entities/handout.entity';

/**
 * Единый контракт содержимого раздаточного листа. Разные типы заданий
 * заполняют разные части: у квиза — `questions`, у кейса — `sections`, у листа
 * с ответами — `answerLines`. Экспорт (фаза 3) рендерит то, что заполнено.
 */
export interface HandoutSection {
  heading?: string;
  body?: string;
  items?: string[];
}

export interface HandoutQuestion {
  q: string;
  options?: string[]; // варианты для квиза; пусто — открытый вопрос
}

/** Версия для ученика: задание без ключей. */
export interface HandoutStudent {
  instructions?: string;
  sections?: HandoutSection[];
  questions?: HandoutQuestion[];
  answerLines?: number; // сколько пустых линий оставить под ответ
}

/** Добавки для учителя поверх ученической версии. */
export interface HandoutTeacherExtra {
  answers?: string;
  criteria?: string;
  descriptors?: { text: string; points: number }[];
  points?: number | null;
  notes?: string;
}

/** Полная учительская версия = задание ученика + ключи/критерии. */
export type HandoutTeacher = HandoutStudent & HandoutTeacherExtra;

export interface HandoutLevel {
  student: HandoutStudent;
  teacher: HandoutTeacher;
}

/** Три уровня A/B/C для индивидуального задания. */
export interface HandoutLevels {
  A: HandoutLevel; // базовый
  B: HandoutLevel; // средний
  C: HandoutLevel; // продвинутый
}

/** Материал с уровнями (individual) рендерится тремя под-листами. */
export function isLeveled(type: HandoutType): boolean {
  return type === 'individual';
}

/**
 * Модель под тип листа (ТЗ 1.2, оптимизация трат). Задания требуют качества и
 * объёма → Sonnet; разминка/объяснение/рефлексия проще → Haiku втрое дешевле
 * на выходе. Возвращает action для ai-models (модель и лимит токенов).
 *
 * Квиз переведён с Haiku на Sonnet: на замере Haiku давал бессмысленные
 * формулировки вопросов, опечатки в терминах («төт» вместо «тот») и неверную
 * терминологию («білік қабілеті» вместо «меншікті жылу сыйымдылығы»). Квиз —
 * оцениваемый лист, ошибка в вопросе стоит дороже сэкономленных токенов.
 */
export function handoutAction(type: HandoutType): 'lesson_handout' | 'lesson_handout_light' {
  return type === 'individual' || type === 'pair' || type === 'group' || type === 'text' || type === 'quiz'
    ? 'lesson_handout'
    : 'lesson_handout_light';
}

/** Есть ли в блоке задания реальное содержание (а не пустышка). */
function blockHasContent(b: unknown): boolean {
  if (!b || typeof b !== 'object') return false;
  const o = b as Record<string, any>;
  const hasInstr = typeof o.instructions === 'string' && o.instructions.trim().length > 0;
  const hasSections = Array.isArray(o.sections) && o.sections.some(
    (s: any) => (s?.body && String(s.body).trim()) || (Array.isArray(s?.items) && s.items.length > 0),
  );
  const hasQuestions = Array.isArray(o.questions) && o.questions.length > 0;
  return hasInstr || hasSections || hasQuestions;
}

/**
 * Прошёл ли ответ модели проверку на непустоту (ТЗ 1.2, дефект 1). Пустой или
 * обрезанный (max_tokens → битый JSON) ответ сюда приходит как {} и отсеивается,
 * чтобы пустой лист не попал в документ.
 */
export function parsedHandoutHasContent(parsed: unknown, type: HandoutType): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  const o = parsed as Record<string, any>;
  if (isLeveled(type)) {
    return !!o.levels && ['A', 'B', 'C'].every((k) => blockHasContent(o.levels[k]));
  }
  return blockHasContent(o.student);
}

/**
 * Факты о сгенерированном задании — вход для проверки дескрипторов
 * (ТЗ, задача 2). Считаются по фактической структуре ответа модели, а не по
 * тому, что задумывалось: дескриптор сверяется с тем, что реально в листе.
 */
export function taskFactsFromParsed(
  parsed: Record<string, any> | null,
  type: HandoutType,
): { hasText: boolean; partCount: number; taskText: string } {
  const o = parsed ?? {};
  const blocks: Record<string, any>[] = isLeveled(type)
    ? ['A', 'B', 'C'].map((k) => (o.levels?.[k] ?? {}) as Record<string, any>)
    : [(o.student ?? {}) as Record<string, any>];

  const wordsIn = (s: unknown) => String(s ?? '').split(/\s+/).filter(Boolean).length;

  // Связный текст для чтения: либо это лист «работа с текстом», либо в задании
  // есть абзац от 40 слов. Короткая инструкция текстом для чтения не считается.
  const hasText =
    type === 'text' ||
    blocks.some((b) => (b.sections ?? []).some((s: any) => wordsIn(s?.body) >= 40));

  // Частей ровно столько, сколько видит ОДИН ученик: на уровневом листе он
  // работает со своим уровнем, а не со всеми тремя.
  const partCount = Math.max(
    0,
    ...blocks.map((b) => (b.sections?.length ?? 0) + (b.questions?.length ?? 0)),
  );

  const taskText = [o.title, ...blocks.flatMap((b) => collectText(b))].filter(Boolean).join(' ');
  return { hasText, partCount, taskText };
}

function collectText(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) collectText(x, out);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) collectText(x, out);
  return out;
}

/**
 * Пронумерованные задания раздатки (ТЗ №2, задача 3): «Task 1 …», «1. …»,
 * «Задание 2 …». Групповая/парная работа держит их в items секции-списка или
 * в вопросах. Нужны, чтобы проверить: каждое отражено в дескрипторе.
 */
const NUM_ITEM = /^\s*(?:task|тапсырма|задание|сұрақ)?\s*\d+\s*[.):]/i;

export function extractNumberedTasks(parsed: Record<string, any> | null, type: HandoutType): string[] {
  const o = parsed ?? {};
  const blocks: Record<string, any>[] = isLeveled(type)
    ? ['A', 'B', 'C'].map((k) => (o.levels?.[k] ?? {}) as Record<string, any>)
    : [(o.student ?? {}) as Record<string, any>];

  const tasks: string[] = [];
  for (const b of blocks) {
    for (const s of b.sections ?? []) {
      for (const it of s.items ?? []) if (NUM_ITEM.test(String(it))) tasks.push(String(it).trim());
      // Задания иногда пронумерованы строками внутри body.
      for (const line of String(s.body ?? '').split('\n')) if (NUM_ITEM.test(line)) tasks.push(line.trim());
    }
    for (const q of b.questions ?? []) if (q?.q) tasks.push(String(q.q).trim());
  }
  return tasks;
}

/**
 * Факты одного уровня (A/B/C) уровневого задания — для дескриптора этого
 * уровня (ТЗ №2, задача 2). Считаются по ученической части КАРТОЧКИ, чтобы
 * дескриптор ссылался только на её содержимое, не на другие уровни.
 */
export function levelFacts(
  parsed: Record<string, any> | null,
  level: 'A' | 'B' | 'C',
): { hasText: boolean; partCount: number; taskText: string } {
  const block = ((parsed?.levels ?? {})[level] ?? {}) as Record<string, any>;
  // Сырой ответ модели держит содержимое уровня напрямую (instructions,
  // sections), ключи/критерии — в teacherExtra: их в факты задания не берём.
  const student = { instructions: block.instructions, sections: block.sections, questions: block.questions };
  const wordsIn = (s: unknown) => String(s ?? '').split(/\s+/).filter(Boolean).length;
  const hasText = (student.sections ?? []).some((s: any) => wordsIn(s?.body) >= 40);
  const partCount = (student.sections?.length ?? 0) + (student.questions?.length ?? 0);
  const taskText = collectText(student).filter(Boolean).join(' ');
  return { hasText, partCount, taskText };
}

// ── Обратная запись КМЖ из раздатки (ТЗ №2, задача 1) ────────────────
//
// Источник истины — приложение: КМЖ описывал ресурсы и действия ученика
// плановым текстом (жесты, «4 ситуации»), а по факту раздатка — печатный лист
// с иной структурой. Ресурсы выводятся из ТИПА листа детерминированно; действия
// ученика — из фактической структуры (число заданий) и инструкции листа.

const RESOURCES: Record<HandoutType, Record<string, string>> = {
  individual: { kz: 'A/B/C деңгейлік тапсырма парақтары (басып шығару)', ru: 'Листы уровневых заданий A/B/C (на печать)', en: 'Levelled task sheets A/B/C (printed)' },
  text: { kz: 'Мәтін мен тапсырма парағы (басып шығару)', ru: 'Лист с текстом и заданиями (на печать)', en: 'Text and task sheet (printed)' },
  pair: { kz: 'Жұптық жұмыс карточкалары (басып шығару)', ru: 'Карточки для парной работы (на печать)', en: 'Pair-work cards (printed)' },
  group: { kz: 'Топтық кейс-парақтар (басып шығару)', ru: 'Кейс-листы для групповой работы (на печать)', en: 'Group case sheets (printed)' },
  quiz: { kz: 'Квиз парағы (басып шығару)', ru: 'Лист-квиз (на печать)', en: 'Quiz sheet (printed)' },
  warmup: { kz: 'Қыздыру парағы (басып шығару)', ru: 'Лист разминки (на печать)', en: 'Warm-up sheet (printed)' },
  explanation: { kz: 'Тірек-конспект парағы (басып шығару)', ru: 'Опорный лист (на печать)', en: 'Reference sheet (printed)' },
  reflection: { kz: 'Рефлексия парағы: белгі қою (басып шығару)', ru: 'Лист рефлексии с отметками (на печать)', en: 'Reflection sheet with checkboxes (printed)' },
};

// Слово «задание» по языку и числу — для фактической структуры.
function tasksWord(n: number, language: string): string {
  if (language === 'en') return n === 1 ? 'task' : 'tasks';
  if (language === 'ru') return n === 1 ? 'задание' : (n >= 2 && n <= 4 ? 'задания' : 'заданий');
  return 'тапсырма'; // казахский — без числовой формы
}

function lang3(v?: string | null): 'kz' | 'ru' | 'en' {
  return v === 'ru' || v === 'en' ? v : 'kz';
}

/**
 * Фактические «Ресурсы» и «Действия ученика» этапа по готовой раздатке.
 * Действия строятся из инструкции листа (что ученик реально делает) и числа
 * заданий, поэтому структура в КМЖ совпадает с приложением, а не с планом.
 */
export function deriveStageFromHandout(
  parsed: Record<string, any> | null,
  type: HandoutType,
  language?: string | null,
): { resources: string; studentActions: string } {
  const lg = lang3(language);
  const resources = RESOURCES[type][lg];

  const o = parsed ?? {};
  const blocks: Record<string, any>[] = isLeveled(type)
    ? ['A', 'B', 'C'].map((k) => (o.levels?.[k] ?? {}) as Record<string, any>)
    : [(o.student ?? {}) as Record<string, any>];

  // Число заданий = максимум частей, которые видит один ученик (как в фактах).
  const partCount = Math.max(0, ...blocks.map((b) => (b.sections?.length ?? 0) + (b.questions?.length ?? 0)));
  const countStr = partCount > 1 ? ` (${partCount} ${tasksWord(partCount, lg)})` : '';

  // Инструкция листа — то, что ученик делает по факту. Для уровневого берём
  // краткую сводку по A/B/C.
  const trim = (s: string, n = 200) => {
    const t = String(s ?? '').replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n).replace(/\s\S*$/, '') + '…' : t;
  };

  let studentActions: string;
  if (isLeveled(type)) {
    const lead = { kz: 'Әр оқушы өз деңгейіндегі тапсырманы орындайды (A/B/C)', ru: 'Каждый ученик выполняет задание своего уровня (A/B/C)', en: 'Each learner completes the task of their level (A/B/C)' }[lg];
    const aInstr = trim(blocks[0]?.instructions ?? '', 120);
    studentActions = aInstr ? `${lead}: ${aInstr}` : lead;
  } else {
    const instr = trim(blocks[0]?.instructions ?? '');
    const lead = { kz: 'Оқушылар тапсырманы орындайды', ru: 'Ученики выполняют задание', en: 'Learners complete the task' }[lg];
    studentActions = (instr || lead) + countStr;
  }

  return { resources, studentActions };
}

/**
 * Тип раздаточного материала по этапу и инструменту.
 * Для задания смотрим на инструмент; для остальных этапов — на тип этапа.
 */
export function handoutTypeFor(stageType: string, toolId?: string | null): HandoutType {
  switch (stageType) {
    case 'warmup': return 'warmup';
    case 'explanation': return 'explanation';
    case 'quiz': return 'quiz';
    case 'reflection': return 'reflection';
    case 'task':
      if (toolId === 'pair') return 'pair';
      if (toolId === 'group') return 'group';
      if (toolId === 'text_adaptation') return 'text';
      return 'individual'; // individual + любой незнакомый инструмент задания
    default:
      return 'individual';
  }
}
