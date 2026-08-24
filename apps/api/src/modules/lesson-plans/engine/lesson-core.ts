/**
 * LessonCore — единый паспорт урока (ТЗ 1.6, этап 2: мета, цели, ценность).
 *
 * Принцип: каждая сущность порождается РОВНО ОДИН РАЗ до остальных модулей
 * и дальше только читается. КМЖ, презентация и промпты этапов берут цели и
 * ценность отсюда, а не генерируют заново. Хранится в lessons.core (jsonb).
 *
 * Здесь — типы и детерминированные проверки (C7, C10, C12). Генерация — в
 * сервисе, одним вызовом модели.
 */

export interface CoreObjectives {
  /** Цели обучения: код + ПОЛНАЯ формулировка из программы (C7: непустая). */
  curriculum: Array<{ code: string; text: string }>;
  /** 3–4 цели урока (C7: непусто). */
  lesson: string[];
}

export interface CoreValue {
  /** Название ценности месяца. */
  key: string;
  /** Как ценность раскрывается на этом уроке (1–2 предложения). */
  rationale: string;
  /** Номера приложений, где ценность ОБЯЗАНА присутствовать. */
  appendixIndices: number[];
  /** Этапы, где ценность ОБЯЗАНА присутствовать. */
  stageIds: string[];
}

export interface LessonCoreData {
  meta: {
    subject: string;      // полная каноническая форма (C12)
    grade: number | null;
    topic: string;
    durationMin: number;
  };
  objectives: CoreObjectives;
  value: CoreValue | null;
  generatedAt: string;
  language: string;
}

/**
 * C12 — канонические названия предметов. Модель и учителя пишут усечённые
 * формы («Әдебиеті», «История»); в документах обязана стоять полная. Ключ —
 * нормализованная усечённая форма, значение — каноническая.
 */
const CANONICAL_SUBJECTS: Record<string, string> = {
  'әдебиеті': 'Қазақ әдебиеті',
  'әдебиет': 'Қазақ әдебиеті',
  'қазақ әдебиет': 'Қазақ әдебиеті',
  'тілі': 'Қазақ тілі',
  'литература': 'Русская литература',
  'история': 'История Казахстана',
  'тарих': 'Қазақстан тарихы',
  'математика': 'Математика',
  'информатика': 'Информатика',
  'физика': 'Физика',
  'химия': 'Химия',
  'биология': 'Биология',
  'география': 'География',
  'ағылшын': 'Ағылшын тілі',
  'english': 'English',
};

/** Полная каноническая форма названия предмета (C12). Незнакомое — как есть. */
export function canonicalSubject(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return s;
  const key = s.toLowerCase().replace(/\s+/g, ' ');
  return CANONICAL_SUBJECTS[key] ?? s;
}

/** C7: цели непусты — и формулировки curriculum, и цели урока. */
export function coreObjectivesProblems(o: CoreObjectives | null | undefined): string[] {
  const out: string[] = [];
  if (!o) return ['objectives отсутствуют целиком'];
  if (!o.curriculum?.length) out.push('нет ни одной цели обучения');
  for (const c of o.curriculum ?? []) {
    if (!c.code?.trim()) out.push('цель обучения без кода');
    if (!c.text?.trim() || c.text.trim() === c.code?.trim()) {
      out.push(`цель ${c.code || '?'} без формулировки`);
    }
  }
  if (!o.lesson?.length) out.push('цели урока пусты («Сабақ мақсаттары»)');
  return out;
}

/**
 * C10: сумма времени этапов не превышает длительность урока. Возвращает
 * скорректированные значения (пропорциональное ужатие, минимум 2 мин на
 * этап) либо null, если всё в норме.
 */
export function normalizeStageMinutes(
  minutes: number[],
  durationMin: number,
): number[] | null {
  const total = minutes.reduce((a, b) => a + (b || 0), 0);
  if (total <= durationMin || !total) return null;
  const k = durationMin / total;
  const scaled = minutes.map((m) => Math.max(2, Math.floor((m || 0) * k)));
  // добираем/убираем разницу с самого длинного этапа
  let diff = durationMin - scaled.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    const idx = diff > 0
      ? scaled.indexOf(Math.max(...scaled))
      : scaled.findIndex((m) => m === Math.max(...scaled.filter((x) => x > 2)));
    if (idx < 0) break;
    scaled[idx] += Math.sign(diff);
    diff -= Math.sign(diff);
  }
  return scaled;
}

/**
 * C8: лексика ценности присутствует в тексте. Сравнение по основам слов
 * названия и обоснования (первые 5 букв, слова короче 5 пропускаются),
 * без учёта регистра — аффиксы справа не мешают.
 */
export function valueLexemes(value: Pick<CoreValue, 'key' | 'rationale'>): string[] {
  const words = `${value.key} ${value.rationale}`.toLowerCase().match(/[а-яёәғқңөұүһіa-z]{5,}/giu) ?? [];
  return [...new Set(words.map((w) => w.slice(0, 5)))];
}

export function containsValueLexeme(text: string, lexemes: string[]): boolean {
  const t = text.toLowerCase();
  return lexemes.some((l) => t.includes(l));
}
