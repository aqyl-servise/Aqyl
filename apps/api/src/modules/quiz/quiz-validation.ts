/**
 * Проверка вопросов квиза (ТЗ 3.0, п. 4.2) — чистые функции без ввода-вывода.
 *
 * Модель ошибается предсказуемо: повторяет варианты слово в слово, ставит
 * номер правильного ответа за пределами списка, возвращает пустые строки.
 * Такой вопрос нельзя показывать классу, поэтому негодные отсеиваются до
 * сохранения, а не в момент запуска квиза перед учениками.
 */

export interface RawQuestion {
  text?: unknown;
  options?: unknown;
  correctIndex?: unknown;
}

export interface CleanQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 4;

/** Схлопывает пробелы: «А  Б » и «А Б» — один и тот же вариант. */
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Причина, по которой вопрос не годится, либо null. Текст на русском:
 * попадает в лог, по нему разбираются, а не пользователю.
 */
export function questionProblem(q: RawQuestion): string | null {
  const text = typeof q.text === "string" ? q.text.trim() : "";
  if (!text) return "пустой текст вопроса";

  if (!Array.isArray(q.options)) return "варианты не переданы списком";
  const options = q.options.map((o) => (typeof o === "string" ? o.trim() : ""));

  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    return `вариантов ${options.length}, допустимо ${MIN_OPTIONS}–${MAX_OPTIONS}`;
  }
  if (options.some((o) => !o)) return "среди вариантов есть пустой";

  const unique = new Set(options.map(norm));
  if (unique.size !== options.length) return "варианты повторяются";

  const idx = q.correctIndex;
  if (typeof idx !== "number" || !Number.isInteger(idx)) return "номер правильного ответа не число";
  if (idx < 0 || idx >= options.length) return `номер правильного ответа ${idx} вне списка`;

  return null;
}

/** Привести вопрос к чистому виду. Вызывать только после questionProblem. */
export function cleanQuestion(q: RawQuestion): CleanQuestion {
  return {
    text: String(q.text).trim(),
    options: (q.options as unknown[]).map((o) => String(o).trim()),
    correctIndex: q.correctIndex as number,
  };
}

export interface SiftResult {
  ok: CleanQuestion[];
  /** Отброшенные — с причиной и номером в исходном ответе модели. */
  rejected: { index: number; reason: string }[];
}

/** Разделить ответ модели на пригодные вопросы и брак. */
export function siftQuestions(raw: unknown): SiftResult {
  const list = Array.isArray(raw) ? raw : [];
  const ok: CleanQuestion[] = [];
  const rejected: { index: number; reason: string }[] = [];

  list.forEach((q, index) => {
    const problem = questionProblem((q ?? {}) as RawQuestion);
    if (problem) rejected.push({ index, reason: problem });
    else ok.push(cleanQuestion(q as RawQuestion));
  });

  return { ok, rejected };
}
