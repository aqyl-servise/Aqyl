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
  points: number; // вес этапа
}

/**
 * Веса этапов по педагогической нагрузке: «групповое/сложное — больше,
 * индивидуальное/простое — меньше».
 *
 * Раньше эти веса запрашивались у модели отдельным вызовом, но результат всё
 * равно пересчитывался кодом (reconcileToTotal), чтобы сумма была ровно 10.
 * То есть платили за арифметику, ответ которой сами и исправляли. Правило
 * детерминированное и не требует модели: на стандартных пяти этапах веса
 * дают ровно 10, на любом другом наборе сумму приводит reconcileToTotal.
 */
const STAGE_WEIGHTS: Record<string, number> = {
  warmup: 1,      // разминка — короткая, оценивается слабо
  explanation: 2, // объяснение — проверка понимания
  task: 4,        // задание — основная самостоятельная работа
  quiz: 2,        // квиз — контроль усвоения
  reflection: 1,  // рефлексия — самооценка
};

/** Вес этапа по его типу. Неизвестный тип получает средний вес. */
export function stageWeight(stageType: string): number {
  return STAGE_WEIGHTS[stageType] ?? 2;
}

/**
 * Веса для набора оцениваемых этапов — замена вызова модели.
 * Сумму до `total` доводит distributeLessonPoints/reconcileToTotal.
 */
export function proposeWeights(
  assessed: { id: string; stageType: string }[],
): StagePointsProposal[] {
  return assessed.map((s) => ({ stageId: s.id, points: stageWeight(s.stageType) }));
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

/**
 * Обрезает вводные конструкции в начале цели урока.
 *
 * Страховка из ТЗ: промпт уже запрещает такие обороты, но модель может
 * вернуть их на любом из трёх языков. Проверка кодом дешевле повторной
 * генерации и, в отличие от неё, детерминирована.
 */
// Английские и русские кальки — устойчивые обороты, их можно снимать без
// двоеточия. Казахские снимаются ТОЛЬКО при явном двоеточии и с ограничением
// длины: «Барлық оқушылар … алады» — это законченное предложение, и жадный
// шаблон без этих условий стирал цель целиком.
const OBJECTIVE_PREFIXES = [
  /^all\s+learners\s+will\s+be\s+able\s+to\s*:?\s*/i,
  /^(most|some)\s+learners\s+will\s+be\s+able\s+to\s*:?\s*/i,
  /^все\s+(ученики|учащиеся|обучающиеся)\s+(с)?могут\s*:?\s*/i,
  /^(большинство|некоторые)\s+(учеников|учащихся)[^:]{0,40}:\s*/i,
  /^барлық\s+оқушылар[^:]{0,40}:\s*/i,
  /^оқушылардың\s+(көпшілігі|кейбірі)[^:]{0,40}:\s*/i,
];

export function stripObjectivePrefix(objective: string): string {
  let out = (objective ?? '').trim();
  for (const re of OBJECTIVE_PREFIXES) out = out.replace(re, '');
  out = out.trim();
  // Первая буква могла оказаться строчной после обрезки.
  return out ? out[0].toUpperCase() + out.slice(1) : '';
}
