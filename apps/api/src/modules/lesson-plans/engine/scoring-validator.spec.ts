/**
 * Тесты валидатора баллов (ТЗ 1.5.2, раздел 5): по одному на каждое правило
 * R1–R11 плюс четыре регрессионных на реальных данных урока
 * 0f1c3b0c-1022-41c8-a3e1-94e08124bb5b.
 *
 * Встроенный node:test, а не jest: jest в проекте не установлен (в
 * зависимостях только @types/jest, конфига и скрипта test нет). Запуск —
 * `npm run test` в apps/api, см. package.json.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateScoring,
  countGapsInText,
  totalClaimsInText,
  buildFallbackScoring,
  type Scoring,
  type ScoringRule,
} from './scoring-validator';

/** Корректный лист-основа: 3 пункта по 1 баллу, три дескриптора. */
function validScoring(): Scoring {
  return {
    totalPoints: 3,
    items: [{ index: 1, gaps: 0 }, { index: 2, gaps: 0 }, { index: 3, gaps: 0 }],
    bands: [],
    perTaskPoints: { 1: 1, 2: 1, 3: 1 },
    descriptors: [
      { text: 'Пункт 1 выполнен верно', points: 1, refersToItems: [1] },
      { text: 'Пункт 2 выполнен верно', points: 1, refersToItems: [2] },
      { text: 'Пункт 3 выполнен верно', points: 1, refersToItems: [3] },
    ],
  };
}

const rules = (s: Scoring, task = '', scoringText = ''): ScoringRule[] =>
  validateScoring(s, task, scoringText).violations.map((v) => v.rule);

// ── База: корректный лист не должен давать ложных срабатываний ────────────
test('корректный лист проходит без нарушений', () => {
  const res = validateScoring(validScoring(), 'Задание из трёх пунктов.');
  assert.equal(res.ok, true, `неожиданные нарушения: ${JSON.stringify(res.violations)}`);
});

// ── R1 ────────────────────────────────────────────────────────────────────
test('R1: сумма дескрипторов не равна totalPoints', () => {
  const s = validScoring();
  s.descriptors[0].points = 2; // сумма станет 4 при totalPoints 3
  s.perTaskPoints = { 1: 2, 2: 1, 3: 1 };
  assert.ok(rules(s).includes('R1'));
});

// ── R2 ────────────────────────────────────────────────────────────────────
test('R2: максимум шкалы не равен totalPoints', () => {
  const s: Scoring = {
    totalPoints: 3,
    items: [{ index: 1, gaps: 0 }, { index: 2, gaps: 0 }],
    bands: [
      { minCorrect: 0, maxCorrect: 0, points: 0 },
      { minCorrect: 1, maxCorrect: 2, points: 2 }, // максимум 2, а не 3
    ],
    descriptors: [{ text: 'всё верно', points: 3, refersToItems: [] }],
  };
  assert.ok(rules(s).includes('R2'));
});

// ── R3 ────────────────────────────────────────────────────────────────────
test('R3: шкала не монотонна — больше верных даёт меньше баллов', () => {
  const s: Scoring = {
    totalPoints: 2,
    items: [{ index: 1, gaps: 0 }, { index: 2, gaps: 0 }, { index: 3, gaps: 0 }],
    bands: [
      { minCorrect: 0, maxCorrect: 1, points: 2 },
      { minCorrect: 2, maxCorrect: 3, points: 1 },
    ],
    descriptors: [{ text: 'всё верно', points: 2, refersToItems: [] }],
  };
  assert.ok(rules(s).includes('R3'));
});

// ── R4 ────────────────────────────────────────────────────────────────────
test('R4: диапазоны шкалы пересекаются', () => {
  const s: Scoring = {
    totalPoints: 2,
    items: [{ index: 1, gaps: 0 }, { index: 2, gaps: 0 }, { index: 3, gaps: 0 }],
    bands: [
      { minCorrect: 0, maxCorrect: 2, points: 1 },
      { minCorrect: 2, maxCorrect: 3, points: 2 }, // 2 попадает в оба
    ],
    descriptors: [{ text: 'всё верно', points: 2, refersToItems: [] }],
  };
  assert.ok(rules(s).includes('R4'));
});

test('R4: дыра между диапазонами', () => {
  const s: Scoring = {
    totalPoints: 2,
    items: [{ index: 1, gaps: 0 }, { index: 2, gaps: 0 }, { index: 3, gaps: 0 }],
    bands: [
      { minCorrect: 0, maxCorrect: 0, points: 0 },
      { minCorrect: 2, maxCorrect: 3, points: 2 }, // результат «1» не оценивается
    ],
    descriptors: [{ text: 'всё верно', points: 2, refersToItems: [] }],
  };
  assert.ok(rules(s).includes('R4'));
});

// ── R5 ────────────────────────────────────────────────────────────────────
test('R5: верхний диапазон не покрывает максимум', () => {
  const s: Scoring = {
    totalPoints: 2,
    items: [{ index: 1, gaps: 0 }, { index: 2, gaps: 0 }, { index: 3, gaps: 0 }],
    bands: [
      { minCorrect: 0, maxCorrect: 0, points: 0 },
      { minCorrect: 1, maxCorrect: 2, points: 2 }, // 3 верных не описаны
    ],
    descriptors: [{ text: 'всё верно', points: 2, refersToItems: [] }],
  };
  assert.ok(rules(s).includes('R5'));
});

// ── R6 ────────────────────────────────────────────────────────────────────
test('R6: объявленные пропуски расходятся с текстом задания', () => {
  const s: Scoring = {
    totalPoints: 2,
    items: [{ index: 1, gaps: 1 }, { index: 2, gaps: 1 }],
    bands: [],
    descriptors: [{ text: 'всё верно', points: 2, refersToItems: [] }],
  };
  // В тексте три пропуска, в метаданных два.
  const task = '1. I wish I ____ (know). 2. If only we ____ (live) and ____ (stay).';
  assert.ok(rules(s, task).includes('R6'));
});

test('countGapsInText считает подчёркивания и многоточия', () => {
  assert.equal(countGapsInText('a ____ b ___ c'), 2);
  assert.equal(countGapsInText('a ... b'), 1);
  assert.equal(countGapsInText('без пропусков'), 0);
});

// ── R7 ────────────────────────────────────────────────────────────────────
test('R7: число в критериях не совпадает ни с пунктами, ни с пропусками', () => {
  const s: Scoring = {
    totalPoints: 2,
    items: [{ index: 1, gaps: 3 }, { index: 2, gaps: 2 }], // 2 пункта, 5 пропусков
    bands: [],
    descriptors: [{ text: 'всё верно', points: 2, refersToItems: [] }],
  };
  const scoringText = 'all 7 gap answers correct = 2';
  assert.ok(rules(s, '', scoringText).includes('R7'));
});

test('totalClaimsInText: ловит заявленные итоги, не трогает баллы и пороги', () => {
  // «2 pts» — балл, «4–6 correct» — порог шкалы: ни то ни другое не итог.
  assert.deepEqual(totalClaimsInText('2 pts'), []);
  assert.deepEqual(totalClaimsInText('4–6 correct: 1 pt'), []);
  assert.ok(totalClaimsInText('all 7 gap answers').includes(7));
  assert.ok(totalClaimsInText('five Part 1 gaps').includes(5));
  assert.ok(totalClaimsInText('бес сұрақ').includes(5));
  assert.ok(totalClaimsInText('заполняет 9 пропусков').includes(9));
});

// ── R8 ────────────────────────────────────────────────────────────────────
test('R8: балл за пункт в критериях и в дескрипторах разный', () => {
  const s = validScoring();
  s.totalPoints = 3;
  s.descriptors = [
    { text: 'Пункт 1', points: 2, refersToItems: [1] }, // критерии обещают 1
    { text: 'Пункт 2', points: 1, refersToItems: [2] },
    { text: 'Пункт 3', points: 0, refersToItems: [3] },
  ];
  assert.ok(rules(s).includes('R8'));
});

// ── R9 ────────────────────────────────────────────────────────────────────
test('R9: одна строка дескриптора склеивает раздельно оцениваемые пункты', () => {
  const s: Scoring = {
    totalPoints: 3,
    items: [{ index: 1, gaps: 0 }, { index: 2, gaps: 0 }, { index: 3, gaps: 0 }],
    bands: [],
    perTaskPoints: { 1: 1, 2: 1, 3: 1 },
    descriptors: [
      { text: 'Пункт 1', points: 1, refersToItems: [1] },
      { text: 'Пункты 2 и 3 вместе', points: 2, refersToItems: [2, 3] },
    ],
  };
  assert.ok(rules(s).includes('R9'));
});

// ── R10 ───────────────────────────────────────────────────────────────────
test('R10: ссылка на несуществующий пункт', () => {
  const s = validScoring();
  s.descriptors[2].refersToItems = [6]; // пунктов всего 3
  assert.ok(rules(s).includes('R10'));
});

// ── R11 ───────────────────────────────────────────────────────────────────
test('R11: нулевой totalPoints и отрицательные баллы', () => {
  const s = validScoring();
  s.totalPoints = 0;
  assert.ok(rules(s).includes('R11'));

  const neg = validScoring();
  neg.descriptors[0].points = -1;
  assert.ok(rules(neg).includes('R11'));
});

// ── Регрессия 1: баг A, Level A ───────────────────────────────────────────
test('регрессия A: перевёрнутая пересекающаяся шкала на 6 вопросов', () => {
  const s: Scoring = {
    totalPoints: 3,
    items: Array.from({ length: 6 }, (_, i) => ({ index: i + 1, gaps: 0 })),
    bands: [
      { minCorrect: 3, maxCorrect: 3, points: 3 },
      { minCorrect: 4, maxCorrect: 5, points: 2 },
      { minCorrect: 2, maxCorrect: 3, points: 1 },
      { minCorrect: 0, maxCorrect: 1, points: 0 },
    ],
    descriptors: [{ text: 'Определяет верные формы', points: 3, refersToItems: [] }],
  };
  const found = rules(s);
  assert.ok(found.includes('R3'), 'ожидалось R3 (немонотонность)');
  assert.ok(found.includes('R4'), 'ожидалось R4 (пересечение)');
  assert.ok(found.includes('R5'), 'ожидалось R5 (не покрыт максимум 6)');
});

// ── Регрессия 2: баг B, Level C Part 1 ────────────────────────────────────
test('регрессия B: 9 пропусков в тексте, 7 в критериях, 5 в дескрипторе', () => {
  const s: Scoring = {
    totalPoints: 2,
    items: [
      { index: 1, gaps: 1 }, { index: 2, gaps: 1 }, { index: 3, gaps: 2 },
      { index: 4, gaps: 2 }, { index: 5, gaps: 3 },
    ],
    bands: [
      { minCorrect: 0, maxCorrect: 3, points: 0 },
      { minCorrect: 4, maxCorrect: 6, points: 1 },
      { minCorrect: 7, maxCorrect: 9, points: 2 },
    ],
    descriptors: [{ text: 'Completes all five Part 1 gaps', points: 2, refersToItems: [] }],
  };
  const scoringText = 'Part 1 — 2 pts: all 7 gap answers correct=2, 4–6 correct=1. ' +
    'Completes all five Part 1 gaps using correct verb forms.';
  const found = rules(s, '', scoringText);
  assert.ok(found.includes('R7'), `ожидалось R7, получено: ${found.join(', ')}`);
});

// ── Регрессия 3: баг C, приложение 5 ──────────────────────────────────────
test('регрессия C: суммы совпадают, а распределение по задачам — нет', () => {
  const s: Scoring = {
    totalPoints: 4,
    items: [
      { index: 1, gaps: 0 }, { index: 2, gaps: 0 },
      { index: 3, gaps: 0 }, { index: 4, gaps: 0 },
    ],
    bands: [],
    perTaskPoints: { 1: 1, 2: 1, 3: 1, 4: 1 },
    descriptors: [
      { text: 'Writes 2 correct second conditional sentences', points: 2, refersToItems: [1] },
      { text: 'Rewrites the given sentence using unless', points: 1, refersToItems: [2] },
      { text: 'Constructs a wish clause and an if only sentence', points: 1, refersToItems: [3, 4] },
    ],
  };
  const res = validateScoring(s, '');
  // Общая сумма сходится (2+1+1 = 4 = totalPoints), R1 не срабатывает —
  // именно поэтому нужны R8 и R9.
  assert.ok(!res.violations.some((x) => x.rule === 'R1'), 'R1 не должно срабатывать: суммы равны');
  const found = res.violations.map((x) => x.rule);
  assert.ok(found.includes('R8'), 'ожидалось R8 (пункт 1: 1 против 2)');
  assert.ok(found.includes('R9'), 'ожидалось R9 (пункты 3 и 4 склеены)');
});

test('R11: дробные баллы — в числах scoring и в тексте критериев', () => {
  const s = validScoring();
  s.descriptors[0].points = 0.5;
  s.descriptors[1].points = 1.5;
  assert.ok(rules(s).includes('R11'));

  // Текстовая форма из живого бага: «Each correct gap is worth 0.5 points».
  const t = validScoring();
  assert.ok(rules(t, '', 'Each correct gap is worth 0.5 points, maximum 3 points').includes('R11'));
  // Математический ответ «47,35» дробью баллов не считается.
  assert.ok(!rules(t, '', 'Ответ: 47,35 км. За верный ответ 1 балл').includes('R11'));
});

// ── Запасной вариант (п. 4.4.3) ──────────────────────────────────────────
test('fallback: шкала монотонна, без дыр, покрывает максимум, сумма дескрипторов сходится', () => {
  const broken: Scoring = {
    totalPoints: 3,
    items: Array.from({ length: 6 }, (_, i) => ({ index: i + 1, gaps: 0 })),
    bands: [
      { minCorrect: 3, maxCorrect: 3, points: 3 },
      { minCorrect: 4, maxCorrect: 5, points: 2 },
    ],
    descriptors: [
      { text: 'строка 1', points: 5, refersToItems: [] },
      { text: 'строка 2', points: 1, refersToItems: [] },
    ],
  };
  const fixed = buildFallbackScoring(broken, 6);
  // Шкала: пороговые правила R2–R5 на запасном варианте не срабатывают.
  const res = validateScoring({ ...fixed, descriptors: fixed.descriptors }, '');
  const bandRules = res.violations.filter((v) => ['R2', 'R3', 'R4', 'R5'].includes(v.rule));
  assert.deepEqual(bandRules, [], `запасная шкала сама нарушает правила: ${JSON.stringify(bandRules)}`);
  // Дескрипторы: тексты сохранены, сумма баллов равна итогу.
  assert.deepEqual(fixed.descriptors.map((d) => d.text), ['строка 1', 'строка 2']);
  assert.equal(fixed.descriptors.reduce((a, d) => a + d.points, 0), 3);
});

// ── Регрессия 4: приложение 4, корректный лист ────────────────────────────
test('регрессия D: корректный лист на 3 пункта не даёт ложных срабатываний', () => {
  const res = validateScoring(validScoring(), 'Три пункта задания без пропусков.');
  assert.equal(res.ok, true, `ложное срабатывание: ${JSON.stringify(res.violations)}`);
});
