/**
 * Языковой шлюз (ТЗ 1.6, раздел 3) — чистые функции без ввода-вывода.
 *
 * Три уровня для казахских текстов:
 *   1 — русские корни (стоп-лист, белый список приоритетнее) — жёсткая ошибка;
 *   2 — несуществующие слова (частичная реализация: список известных
 *       псевдослов; полноценного словаря словоформ нет) — предупреждение;
 *   3 — семантические ловушки («өлік» вместо «өлең») — жёсткая ошибка.
 *
 * Сохранение текста в обход шлюза запрещено архитектурно: точки записи
 * сгенерированного текста вызывают LanguageGateService.persistGeneratedText.
 */
import { STOP_ROOTS } from './language/stop-roots';
import { LANGUAGE_WHITELIST } from './language/whitelist';
import { SEMANTIC_TRAPS } from './language/semantic-traps';
import { KNOWN_PSEUDO_WORDS } from './language/pseudo-words';

export type GateLevel = 1 | 2 | 3;

export interface GateViolation {
  level: GateLevel;
  /** Найденное слово как в тексте. */
  word: string;
  /** Чем заменить (уровни 1 и 3), если известно. */
  suggestion?: string;
  /** Контекст ±5 слов — для лога и промпта перегенерации. */
  context: string;
}

/** Кириллическое слово с казахскими буквами включительно. */
const WORD_RE = /[а-яёәғқңөұүһі]+/giu;

const lower = (s: string) => s.toLowerCase();

/** Слово начинается с одной из основ списка. */
function startsWithAny(word: string, roots: readonly string[]): string | null {
  for (const r of roots) if (word.startsWith(r)) return r;
  return null;
}

function contextAround(words: string[], idx: number, radius = 5): string {
  return words.slice(Math.max(0, idx - radius), idx + radius + 1).join(' ');
}

/**
 * Проверка одного текста. Применяется ТОЛЬКО к казахским текстам —
 * вызывающий передаёт язык урока.
 */
export function checkKazakhText(text: string): GateViolation[] {
  if (!text) return [];
  const out: GateViolation[] = [];

  const tokens = [...text.matchAll(WORD_RE)].map((m) => m[0]);
  const lowered = tokens.map(lower);

  for (let i = 0; i < lowered.length; i++) {
    const w = lowered[i];
    if (w.length < 3) continue;
    // Белый список приоритетнее стоп-листа (ТЗ 3.2), но только пока его
    // совпадение не короче: «проза» (белый) не должен прикрывать
    // «прозайшысы» (стоп-корень «прозайш» длиннее и специфичнее).
    const wl = startsWithAny(w, LANGUAGE_WHITELIST);
    const root = startsWithAny(w, STOP_ROOTS);
    if (wl && (!root || wl.length >= root.length)) continue;

    // ── Уровень 1: русские корни ─────────────────────────────────────────
    if (root) {
      out.push({ level: 1, word: tokens[i], context: contextAround(tokens, i) });
      continue;
    }

    // ── Уровень 2 (частично): известные псевдослова ──────────────────────
    if (startsWithAny(w, KNOWN_PSEUDO_WORDS)) {
      out.push({ level: 2, word: tokens[i], context: contextAround(tokens, i) });
      continue;
    }

    // ── Уровень 3: семантические ловушки ─────────────────────────────────
    for (const trap of SEMANTIC_TRAPS) {
      if (!w.startsWith(trap.wrong)) continue;
      const window = lowered.slice(Math.max(0, i - 5), i + 6);
      const hasMarker = trap.markers.some((m) => window.some((t) => t.startsWith(m)));
      // «11-сынық»: цифра-дефис прямо перед словом.
      const digitHyphen = !!trap.digitHyphen &&
        new RegExp(`\\d\\s*-\\s*${trap.wrong}`, 'iu').test(text);
      if (hasMarker || digitHyphen) {
        out.push({
          level: 3, word: tokens[i], suggestion: trap.right,
          context: contextAround(tokens, i),
        });
      }
      break;
    }
  }
  return out;
}

/** Обойти все строки произвольной структуры (parsed-объекты листов, слайды). */
export function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') { out.push(value); return out; }
  if (Array.isArray(value)) { for (const v of value) collectStrings(v, out); return out; }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) collectStrings(v, out);
  }
  return out;
}

/** Проверка целой структуры (лист, набор слайдов) одним вызовом. */
export function checkKazakhStructure(value: unknown): GateViolation[] {
  const seen = new Set<string>();
  const out: GateViolation[] = [];
  for (const s of collectStrings(value)) {
    for (const v of checkKazakhText(s)) {
      const key = `${v.level}|${lower(v.word)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

export const hardViolations = (vs: GateViolation[]) => vs.filter((v) => v.level !== 2);
export const softViolations = (vs: GateViolation[]) => vs.filter((v) => v.level === 2);

/** Строка для лога и для промпта перегенерации. */
export function describeGateViolations(vs: GateViolation[]): string {
  return vs
    .map((v) => `[ур.${v.level}] «${v.word}»${v.suggestion ? ` → «${v.suggestion}»` : ''} (…${v.context}…)`)
    .join('; ');
}
