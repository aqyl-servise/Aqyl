/**
 * Проверка дескриптора на соответствие фактическому заданию (ТЗ, задача 2).
 *
 * Дескрипторы писались раньше задания — из описания этапа, а не из его
 * содержания, — поэтому уходили в КМЖ, презентацию и раздатку формулировки
 * вроде «Completes all three sections» там, где секций три нет, или
 * «first conditional» на уроке про second. Ошибка тиражировалась во все три
 * документа сразу.
 *
 * Проверки принципиально КОДОВЫЕ, а не модельные: модель уже один раз
 * ошиблась, спрашивать её же о корректности собственного ответа — не проверка.
 */

/** Факты о сгенерированном задании, против которых сверяется дескриптор. */
export interface TaskFacts {
  /** Есть ли в задании связный текст для чтения. */
  hasText: boolean;
  /** Сколько частей видит ОДИН ученик (для уровневого — внутри своего уровня). */
  partCount: number;
  /**
   * Весь текст урока и задания одной строкой: тема, цели, формулировки.
   * По нему проверяется, не названа ли в дескрипторе чужая конструкция.
   */
  context: string;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Собирает все строки из вложенной структуры. */
export function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) collectStrings(v, out);
  return out;
}

// ── Проверка 1: ссылка на текст, которого в задании нет ──────────────
//
// Границы слова заданы через (?<!\p{L}) с флагом u, а НЕ через \b: в JS \b
// опирается на \w = [A-Za-z0-9_], поэтому с кириллицей \b не срабатывает
// вовсе — «мәтін» и «текст» в такой проверке не находились бы никогда.
// Хвост \p{L}* покрывает казахскую агглютинацию: мәтін|мәтінді|мәтіннің|…
const TEXT_WORDS = /(?<!\p{L})(text|passage|reading|мәтін|текст)\p{L}*/iu;

// ── Проверка 2: количество частей ────────────────────────────────────
const NUM_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5,
  екі: 2, үш: 3, төрт: 4, бес: 5,
  два: 2, две: 2, три: 3, четыре: 4, пять: 5,
};
// Основы слов; хвост \p{L}* добирает окончания (тапсырма → тапсырманы).
const PART_WORDS = 'section|part|task|item|question|бөлім|тапсырма|сұрақ|секц|част|задани|вопрос';

/**
 * Ищет в дескрипторе заявленное число частей: «all three sections», «3 tasks»,
 * «үш тапсырма». Возвращает наибольшее найденное, либо null.
 */
export function claimedPartCount(text: string): number | null {
  const t = norm(text);
  let max: number | null = null;
  const take = (n: number) => { if (Number.isFinite(n) && n > 1 && (max === null || n > max)) max = n; };

  const digits = new RegExp(`(\\d+)\\s+(?:${PART_WORDS})\\p{L}*`, 'giu');
  for (const m of t.matchAll(digits)) take(Number(m[1]));

  // (?<!\p{L}) вместо \b — см. комментарий у TEXT_WORDS.
  const words = new RegExp(`(?<!\\p{L})(${Object.keys(NUM_WORDS).join('|')})\\s+(?:${PART_WORDS})\\p{L}*`, 'giu');
  for (const m of t.matchAll(words)) take(NUM_WORDS[m[1].toLowerCase()]);

  return max;
}

// ── Проверка 3: чужая грамматическая конструкция ─────────────────────
/**
 * Конструкции, которые модель называет в дескрипторе. Список закрытый и
 * узкий нарочно: цель — поймать подмену («first» вместо «second conditional»),
 * а не разметить всю грамматику. Ложное срабатывание здесь стоит одной
 * лишней регенерации, пропуск — неверного дескриптора в трёх документах.
 */
const CONSTRUCTIONS: RegExp[] = [
  /\b(zero|first|second|third|mixed)\s+conditional\b/gi,
  /\b(present|past|future)\s+(simple|continuous|progressive|perfect)(\s+continuous|\s+progressive)?\b/gi,
  /\b(passive|active)\s+voice\b/gi,
  /\breported\s+speech\b/gi,
  /\b(comparative|superlative)\s+(degree|form)s?\b/gi,
  /\bwish\s+clauses?\b/gi,
  /\bmodal\s+verbs?\b/gi,
];

/** Конструкции, названные в тексте (в нормализованном виде, без дублей). */
export function namedConstructions(text: string): string[] {
  const found = new Set<string>();
  for (const re of CONSTRUCTIONS) for (const m of text.matchAll(re)) found.add(norm(m[0]));
  return [...found];
}

// ── Покрытие пронумерованных заданий дескриптором (ТЗ №2, задача 3) ──
//
// Целевые метки задания: именованные конструкции (выше) + отдельные слова-цели
// семейства условных предложений и придаточных, которые часто стоят в задании
// капсом или в кавычках («use UNLESS», «relative clause with 'why'»).
const TARGET_WORDS = [
  /(?<!\p{L})(unless|wish|if only|why)(?!\p{L})/giu,
  /(?<!\p{L})relative\s+clauses?(?!\p{L})/giu,
];

/** Целевые метки одного задания — по ним проверяем покрытие дескриптором. */
export function taskTargets(text: string): string[] {
  const out = new Set(namedConstructions(text));
  for (const re of TARGET_WORDS) for (const m of text.matchAll(re)) out.add(norm(m[0]));
  return [...out];
}

/**
 * Целевые метки заданий, НЕ отражённые в дескрипторе (ТЗ №2, задача 3).
 * Сравнение по границам слова с учётом Unicode (\b в JS на кириллице не
 * работает). Пустой массив — каждая цель заданий встречается в дескрипторе.
 */
export function uncoveredTaskTargets(tasks: string[], descriptorsText: string): string[] {
  const hay = descriptorsText.toLowerCase().replace(/\s+/g, ' ');
  const targets = new Set<string>();
  for (const t of tasks) for (const g of taskTargets(t)) targets.add(g);
  // Ключ покрытия: для «relative clause», «wish clauses» проверяем по головному
  // слову (relative, wish) — дескриптор редко повторяет фразу дословно, а слово
  // почти всегда есть. Одиночные метки (unless, why) — как есть.
  const coverageKey = (g: string) => g.replace(/\s+(clauses?|forms?|tenses?|structures?)$/i, '').trim() || g;
  const covered = (key: string) => {
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<!\\p{L})${esc}(?!\\p{L})`, 'iu').test(hay);
  };
  const missing = new Set<string>();
  for (const g of targets) if (!covered(coverageKey(g))) missing.add(coverageKey(g));
  return [...missing];
}

// ── Сводная проверка ─────────────────────────────────────────────────
export interface DescriptorProblem {
  kind: 'text' | 'parts' | 'construction';
  detail: string;
}

/**
 * Возвращает расхождения дескрипторов с заданием. Пустой массив — всё сходится.
 * Сумму баллов здесь не проверяем: её приводит adjustDescriptorSum (кодовый
 * инвариант, который уже работает корректно).
 */
export function findDescriptorProblems(
  descriptors: { text: string }[],
  facts: TaskFacts,
): DescriptorProblem[] {
  const problems: DescriptorProblem[] = [];
  const ctx = norm(facts.context);
  const ctxConstructions = new Set(namedConstructions(ctx));

  for (const d of descriptors) {
    const text = String(d?.text ?? '');
    if (!text.trim()) continue;

    if (!facts.hasText && TEXT_WORDS.test(text)) {
      problems.push({ kind: 'text', detail: `«${text}» ссылается на текст, которого в задании нет` });
    }

    const claimed = claimedPartCount(text);
    if (claimed !== null && facts.partCount > 0 && claimed > facts.partCount) {
      problems.push({ kind: 'parts', detail: `«${text}» требует ${claimed} частей, в задании ${facts.partCount}` });
    }

    for (const c of namedConstructions(text)) {
      if (!ctxConstructions.has(c)) {
        problems.push({ kind: 'construction', detail: `«${text}» называет «${c}», которой нет в теме урока и задании` });
      }
    }
  }
  return problems;
}

// ── Релевантность подсказки учителю содержимому карточки (ТЗ №2, задача 5) ──
//
// Подсказка «Students often confuse 'were' with 'was'» ставилась по теме урока,
// а на карточке A выбора were/was не было. Проверка: формы и конструкции,
// НАЗВАННЫЕ в подсказке, должны присутствовать в задании или ключе этой
// карточки. Если подсказка общая (не называет конкретных форм) — проверять
// нечего, пропускаем.

/** Конкретные формы/слова, названные в подсказке: в кавычках 'were', «құрал». */
function quotedForms(note: string): string[] {
  const out = new Set<string>();
  for (const m of String(note ?? '').matchAll(/['"«]([^'"»]{1,40})['"»]/g)) {
    const w = norm(m[1]);
    // Одиночная грамматическая форма/термин, не целая фраза-пример.
    if (w && w.split(' ').length <= 2) out.add(w);
  }
  return [...out];
}

/**
 * Формы/конструкции из подсказки, которых НЕТ ни в задании, ни в ключе карточки
 * (ТЗ №2, задача 5). Пустой массив — подсказка релевантна (или не называет
 * конкретных форм).
 */
export function noteReferenceGaps(note: string, cardText: string): string[] {
  const named = new Set<string>([...quotedForms(note), ...namedConstructions(note)]);
  if (!named.size) return [];
  const hay = norm(cardText);
  const inCard = (form: string) => {
    const key = form.replace(/\s+(clauses?|forms?|tenses?|structures?)$/i, '').trim() || form;
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<!\\p{L})${esc}(?!\\p{L})`, 'iu').test(hay);
  };
  // Подсказка допустима, если ЛЮБАЯ названная форма есть на карточке — тогда она
  // привязана к заданию, а вторая может стоять для контраста («'were', не 'was'»).
  // Провал — когда НИ ОДНА не найдена (подсказка про тему урока, а не про эту
  // карточку: кейс ТЗ — were/was на карточке, где ни того, ни другого нет).
  if ([...named].some(inCard)) return [];
  return [...named];
}
