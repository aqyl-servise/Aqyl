/**
 * PISA question-set validator (ТЗ раздел 8) — pure, deterministic, no I/O.
 * We never trust the model: every question must carry a PISA level (1–6),
 * points (>0) and a key (correctAnswer); open questions need a grading
 * criterion. totalPoints is computed by CODE. A set that fails is NOT `ready`.
 */

export type QType = 'single' | 'multiple' | 'truefalse' | 'short' | 'open' | 'matching';
const Q_TYPES: QType[] = ['single', 'multiple', 'truefalse', 'short', 'open', 'matching'];

export interface RawQuestion {
  questionText?: string;
  questionType?: string;
  pisaLevel?: number;
  points?: number;
  options?: unknown;
  correctAnswer?: unknown;
  answerCriteria?: string | null;
}

export interface NormalizedQuestion {
  questionText: string;
  questionType: QType;
  pisaLevel: number;
  points: number;
  options: unknown | null;
  correctAnswer: unknown;
  answerCriteria: string | null;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
  questions: NormalizedQuestion[];
  totalPoints: number;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function hasKey(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** Normalize + validate raw AI questions against the expected count. */
export function validateQuestions(raw: RawQuestion[], expectedCount: number): ValidationResult {
  const normalized: NormalizedQuestion[] = [];

  for (const q of raw ?? []) {
    const type = (Q_TYPES as string[]).includes(q.questionType ?? '') ? (q.questionType as QType) : 'short';
    const level = clamp(Number(q.pisaLevel), 1, 6);
    const points = Math.max(1, clamp(Number(q.points), 1, 20));
    const text = (q.questionText ?? '').trim();
    const criteria = (q.answerCriteria ?? '')?.toString().trim() || null;

    // Hard requirements (per ТЗ): text, key present; open → criteria.
    if (!text) continue;
    if (!hasKey(q.correctAnswer)) continue;
    if (type === 'open' && !criteria) continue;

    normalized.push({
      questionText: text,
      questionType: type,
      pisaLevel: level,
      points,
      options: q.options ?? null,
      correctAnswer: q.correctAnswer,
      answerCriteria: type === 'open' ? criteria : (criteria ?? null),
    });
  }

  if (normalized.length < expectedCount) {
    return { ok: false, reason: `Получено валидных вопросов: ${normalized.length} из ${expectedCount}`, questions: normalized, totalPoints: sum(normalized) };
  }

  const questions = normalized.slice(0, expectedCount);
  return { ok: true, questions, totalPoints: sum(questions) };
}

/** Validate a single regenerated question. */
export function validateOne(q: RawQuestion): NormalizedQuestion | null {
  const res = validateQuestions([q], 1);
  return res.ok ? res.questions[0] : null;
}

export function sum(qs: { points: number }[]): number {
  return qs.reduce((a, q) => a + q.points, 0);
}
