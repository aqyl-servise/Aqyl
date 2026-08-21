/**
 * Разбор цели обучения на целевые элементы (ТЗ, задача 3).
 *
 * Цель 8.6.17.1 требует «use if / unless / if only …», но `unless` и `if only`
 * терялись уже на шаге разворачивания в цели урока и дальше не попадали ни в
 * одно задание. Чтобы это ловить, нужно знать, что именно перечислено в цели.
 *
 * Разбор ПРАВИЛАМИ, не моделью: перечисление через «/» — синтаксис, а не смысл,
 * и платить за вызов ради него незачем.
 *
 * Формат целей в базе грязный (учителя вставляют их кусками), поэтому парсер
 * рассчитан на реальные строки, а не на образцовые:
 *   «8.6.17.1 use if / unless/ if only in second conditional clauses and wish
 *    [that] clauses [present reference]; use a growing variety of …»
 *   «8.2.4.3 – металдар коррозиясын …», «6. 2. 5. 1 Supportive …», «write»
 */

/** Слова, на которых перечисление заканчивается: дальше идёт уже контекст. */
const BOUNDARY = new Set([
  'in', 'on', 'at', 'for', 'with', 'to', 'from', 'of', 'within', 'across',
  'including', 'and', 'or', 'a', 'an', 'the', 'use', 'using', 'apply', 'write',
  'мен', 'және', 'немесе', 'арқылы', 'бойынша', 'үшін',
  'и', 'или', 'при', 'для', 'через', 'по',
]);

const clean = (s: string) =>
  s
    .replace(/\[[^\]]*\]/g, ' ')          // [that], [present reference]
    .replace(/[«»"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Убирает код цели в начале: «8.6.17.1», «6. 2. 5. 1», «10.1.1.1-», «8.2.4.3 –». */
export function stripObjectiveCode(s: string): string {
  return s
    .replace(/^[\s•\-–—]*\d+(?:\s*\.\s*\d+)+\s*[-–—:.]?\s*/, '')
    .trim();
}

/** Берёт до `max` слов с конца, останавливаясь на служебном слове. */
function tailWords(s: string, max = 3): string {
  const w = clean(s).split(' ').filter(Boolean);
  const out: string[] = [];
  for (let i = w.length - 1; i >= 0 && out.length < max; i--) {
    if (BOUNDARY.has(w[i].toLowerCase())) break;
    out.unshift(w[i]);
  }
  return out.join(' ');
}

/** Берёт до `max` слов с начала, останавливаясь на служебном слове. */
function headWords(s: string, max = 3): string {
  const w = clean(s).split(' ').filter(Boolean);
  const out: string[] = [];
  for (const word of w) {
    if (out.length >= max) break;
    if (BOUNDARY.has(word.toLowerCase()) && out.length > 0) break;
    if (BOUNDARY.has(word.toLowerCase()) && out.length === 0) continue;
    out.push(word);
  }
  return out.join(' ');
}

/**
 * Элементы перечисления через «/»: «if / unless/ if only» → [if, unless, if only].
 *
 * Границы крайних элементов определяются служебными словами: слева «use if»
 * даёт «if», справа «if only in second conditional…» даёт «if only».
 */
function slashItems(text: string): string[] {
  if (!text.includes('/')) return [];
  const parts = text.split('/');
  if (parts.length < 2) return [];
  const items: string[] = [];
  parts.forEach((p, i) => {
    const v = i === 0 ? tailWords(p) : i === parts.length - 1 ? headWords(p) : clean(p);
    if (v) items.push(v);
  });
  // Перечисление осмысленно от двух элементов; одиночная дробь (даты, 1/2) — нет.
  return items.length >= 2 ? items : [];
}

/** Именованные типы придаточных и форм: «wish clauses», «relative clauses». */
function namedPhrases(text: string): string[] {
  const out: string[] = [];
  const re = /(?:(\w+)\s+)?(\w+)\s+(clauses?|forms?|tenses?|structures?)/gi;
  for (const m of clean(text).matchAll(re)) {
    const second = (m[2] ?? '').toLowerCase();
    if (BOUNDARY.has(second)) continue;
    // Служебное слово перед фразой в неё не входит: «and wish clauses» —
    // это «wish clauses», а «of relative clauses» — «relative clauses».
    const first = (m[1] ?? '').toLowerCase();
    const phrase = [BOUNDARY.has(first) ? '' : m[1], m[2], m[3]].filter(Boolean).join(' ').toLowerCase();
    out.push(phrase);
  }
  return out;
}

/**
 * Целевые элементы одной цели обучения. Пустой массив — перечисления нет
 * (обычная цель без списка конструкций, либо обрывок вроде «write»).
 */
export function parseObjectiveElements(objective: string): string[] {
  const body = stripObjectiveCode(String(objective ?? ''));
  if (!body || body.split(' ').filter(Boolean).length < 3) return [];

  const seen = new Set<string>();
  const push = (v: string) => {
    const k = v.toLowerCase().trim();
    // Однобуквенные и служебные обрывки не элементы.
    if (k.length > 1 && !BOUNDARY.has(k) && !seen.has(k)) seen.add(k);
  };

  // Цель может содержать несколько предложений через «;» — разбираем каждое.
  for (const part of body.split(/[;.]/)) {
    for (const it of slashItems(part)) push(it);
    for (const it of namedPhrases(part)) push(it);
  }
  return [...seen];
}

/** Элементы всех целей обучения урока. */
export function parseAllObjectiveElements(objectives: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  for (const o of Array.isArray(objectives) ? objectives : []) {
    for (const e of parseObjectiveElements(o)) seen.add(e);
  }
  return [...seen];
}

/**
 * Элементы, которые цель требует ИСПОЛЬЗОВАТЬ — только явное перечисление
 * через «/» («use if / unless / if only»). Именно их отсутствие в материалах
 * считается пробелом.
 *
 * Названия придаточных («relative clauses», «why clauses») сюда не входят
 * намеренно: в реальной 8.6.17.1 их четыре, и требовать каждое в заданиях
 * значит раздувать урок ради формальности. В промпт целей они передаются —
 * там это бесплатно, — но покрытие по ним не требуется.
 */
export function parseRequiredElements(objectives: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  for (const o of Array.isArray(objectives) ? objectives : []) {
    const body = stripObjectiveCode(String(o ?? ''));
    for (const part of body.split(/[;.]/)) {
      for (const it of slashItems(part)) {
        const k = it.toLowerCase().trim();
        if (k.length > 1 && !BOUNDARY.has(k)) seen.add(k);
      }
    }
  }
  return [...seen];
}

/**
 * Ключевое слово элемента — по нему проверяется покрытие.
 *
 * Для «wish clauses» это «wish»: дословной фразы в задании не будет, а слово
 * — будет. Для коротких элементов («if only») берём фразу целиком.
 */
export function coverageKey(element: string): string {
  const w = element.toLowerCase().split(' ').filter(Boolean);
  if (w.length <= 2) return w.join(' ');
  const tail = w[w.length - 1];
  return ['clauses', 'clause', 'forms', 'form', 'tenses', 'tense', 'structures', 'structure'].includes(tail)
    ? w.slice(0, -1).join(' ')
    : w.join(' ');
}

/**
 * Какие элементы не встречаются в материалах. Сравнение по границам слова с
 * учётом Unicode: \b в JS опирается на ASCII и на кириллице не работает.
 */
export function missingElements(elements: string[], materials: string): string[] {
  const hay = materials.toLowerCase().replace(/\s+/g, ' ');
  return elements.filter((el) => {
    const key = coverageKey(el);
    if (!key) return false;
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`(?<!\\p{L})${esc}(?!\\p{L})`, 'iu').test(hay);
  });
}
