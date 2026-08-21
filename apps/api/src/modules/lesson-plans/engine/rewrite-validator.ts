/**
 * Проверка заданий типа «переписать / трансформировать» (ТЗ №2, задача 4).
 *
 * Дефект: исходное предложение уже содержит целевую конструкцию, поэтому
 * трансформировать нечего — ученик переписывает предложение без изменений, а
 * ключ дословно повторяет условие. Корректный пункт: в исходнике целевой
 * конструкции НЕТ, ученик её строит.
 *
 * Проверки КОДОВЫЕ, не модельные (та же логика, что у остальных валидаторов).
 */

import { taskTargets } from './descriptor-validator';

/** Нормализация для сравнения: нижний регистр, без пунктуации и лишних пробелов. */
function norm(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Доля общих слов (Жаккар по токенам) — грубая мера «ключ ≈ условие». */
function tokenJaccard(a: string, b: string): number {
  const A = new Set(norm(a).split(' ').filter(Boolean));
  const B = new Set(norm(b).split(' ').filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * Разбирает пункт rewrite: «1. [IF ONLY] → source (Use: if only)».
 * Возвращает целевую метку задания и исходное предложение.
 */
function parseRewriteItem(item: string): { target: string; source: string; num: number | null } | null {
  const text = String(item ?? '').trim();
  const numMatch = text.match(/^\s*(\d+)/);
  const num = numMatch ? Number(numMatch[1]) : null;

  // Целевая конструкция: из [СКОБОК] в начале или из «(Use: …)» в конце.
  const bracket = text.match(/\[([^\]]+)\]/);
  const useHint = text.match(/\(\s*use\s*:?\s*([^)]+)\)/i);
  const target = (bracket?.[1] ?? useHint?.[1] ?? '').trim();
  if (!target) return null;

  // Исходное предложение: между «→» (или «:») и «(Use …)», без служебных меток.
  let source = text;
  const arrow = source.indexOf('→');
  if (arrow >= 0) source = source.slice(arrow + 1);
  source = source
    .replace(/\(\s*use\s*:?[^)]*\)/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/^\s*\d+\s*[.):]?/, '')
    .trim();
  if (!source) return null;

  return { target, source, num };
}

export interface RewriteProblem {
  num: number | null;
  kind: 'target-in-source' | 'key-equals-source';
  detail: string;
}

/**
 * Находит невалидные пункты rewrite. `keys` — тексты ключей (по номерам), нужны
 * для проверки «ключ ≈ условие»; без них работает только проверка «конструкция
 * уже в исходнике».
 *
 * Ложных срабатываний на gap-fill нет: там ключ — короткое вставляемое слово,
 * а не полное предложение, поэтому Жаккар с условием низкий; и целевого слова в
 * исходнике с пропуском нет.
 */
export function findRewriteProblems(items: string[], keys: Record<number, string> = {}): RewriteProblem[] {
  const problems: RewriteProblem[] = [];
  for (const raw of items) {
    const it = parseRewriteItem(raw);
    if (!it) continue;

    // 1) Целевая конструкция уже в исходном предложении — строить нечего.
    const targets = taskTargets(it.target);
    const srcLc = norm(it.source);
    for (const g of targets) {
      const key = g.replace(/\s+(clauses?|forms?|tenses?|structures?)$/i, '').trim() || g;
      const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?<!\\p{L})${esc}(?!\\p{L})`, 'iu').test(srcLc)) {
        problems.push({ num: it.num, kind: 'target-in-source', detail: `пункт ${it.num ?? '?'}: «${key}» уже есть в исходном предложении — трансформировать нечего` });
        break;
      }
    }

    // 2) Ключ дословно повторяет условие (≥90% общих слов).
    const key = it.num != null ? keys[it.num] : undefined;
    if (key && tokenJaccard(key, it.source) >= 0.9) {
      problems.push({ num: it.num, kind: 'key-equals-source', detail: `пункт ${it.num ?? '?'}: ключ совпадает с условием — переписывать нечего` });
    }
  }
  return problems;
}

/** Ключи из строки answers по номерам: «1. …| 2. …| 3. …» → {1:…,2:…,3:…}. */
export function parseAnswerKeys(answers: string): Record<number, string> {
  const out: Record<number, string> = {};
  for (const part of String(answers ?? '').split('|')) {
    const m = part.match(/^\s*(\d+)\s*[.):]?\s*(.+)$/s);
    if (m) out[Number(m[1])] = m[2].trim();
  }
  return out;
}
