/**
 * Assessment points engine (ТЗ раздел 8) — pure, deterministic, no I/O.
 *
 * Invariants enforced by CODE (we never trust the model's arithmetic):
 *  - a lesson has exactly `TOTAL_POINTS` (10) points across assessed stages;
 *  - at least `MIN_ASSESSED` (2) assessed stages;
 *  - each assessed stage's descriptors sum to that stage's points;
 *  - every assessed stage / descriptor gets at least 1 point.
 */

export const TOTAL_POINTS = 10;
export const MIN_ASSESSED = 2;

export interface StagePointsProposal {
  stageId: string;
  points: number; // proposed by Sonnet (weight)
}

/** Are there enough assessed stages to distribute points over? */
export function hasEnoughAssessed(assessedCount: number): boolean {
  return assessedCount >= MIN_ASSESSED;
}

/**
 * Reconcile a proposed list of integers to sum EXACTLY to `total`, giving each
 * item at least 1 (when `total >= items.length`). The remainder lands on the
 * largest item(s) — "остаток на самое сложное".
 */
export function reconcileToTotal(proposed: number[], total: number): number[] {
  const n = proposed.length;
  if (n === 0) return [];

  const out = proposed.map((p) => Math.max(1, Math.round(Number.isFinite(p) ? p : 1)));
  let sum = out.reduce((a, b) => a + b, 0);

  // Degenerate: fewer points than items — hand 1 to as many as possible, 0 to rest.
  if (total < n) {
    const zeroed = out.map(() => 0);
    // rank by proposed weight desc, give 1 to the top `total`
    const order = out
      .map((_, i) => i)
      .sort((a, b) => (proposed[b] ?? 0) - (proposed[a] ?? 0));
    for (let k = 0; k < total; k++) zeroed[order[k]] = 1;
    return zeroed;
  }

  let guard = 10000;
  while (sum !== total && guard-- > 0) {
    if (sum < total) {
      const i = indexOfMax(out);
      out[i] += 1;
      sum += 1;
    } else {
      const i = indexOfMaxAbove(out, 1);
      if (i === -1) break; // everything at 1, cannot reduce further
      out[i] -= 1;
      sum -= 1;
    }
  }
  return out;
}

/** Distribute the lesson's total (10) across assessed stages, code-validated. */
export function distributeLessonPoints(
  proposal: StagePointsProposal[],
  total: number = TOTAL_POINTS,
): { stageId: string; points: number }[] {
  const reconciled = reconcileToTotal(
    proposal.map((p) => p.points),
    total,
  );
  return proposal.map((p, i) => ({ stageId: p.stageId, points: reconciled[i] }));
}

/** Adjust descriptor points so they sum exactly to the stage's points. */
export function adjustDescriptorSum(
  descriptorPoints: number[],
  stagePoints: number,
): number[] {
  return reconcileToTotal(descriptorPoints, stagePoints);
}

export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

// ── helpers ──────────────────────────────────────────────────────
function indexOfMax(arr: number[]): number {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[idx]) idx = i;
  return idx;
}
function indexOfMaxAbove(arr: number[], floor: number): number {
  let idx = -1;
  let mx = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > floor && arr[i] > mx) {
      mx = arr[i];
      idx = i;
    }
  }
  return idx;
}
