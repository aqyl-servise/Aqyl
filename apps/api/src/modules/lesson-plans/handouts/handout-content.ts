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
