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
 * объёма → Sonnet; разминка/объяснение/квиз/рефлексия проще → Haiku втрое
 * дешевле на выходе. Возвращает action для ai-models (модель и лимит токенов).
 */
export function handoutAction(type: HandoutType): 'lesson_handout' | 'lesson_handout_light' {
  return type === 'individual' || type === 'pair' || type === 'group' || type === 'text'
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
