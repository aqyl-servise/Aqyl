/** Тесты паспорта урока (ТЗ 1.6, этап 2): C7, C10, C12, лексика ценности C8. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalSubject, coreObjectivesProblems, normalizeStageMinutes,
  valueLexemes, containsValueLexeme,
} from './lesson-core';

// ── C12 ───────────────────────────────────────────────────────────────────
test('C12: усечённые названия предметов канонизируются', () => {
  assert.equal(canonicalSubject('Әдебиеті'), 'Қазақ әдебиеті'); // урок 2f6034d5
  assert.equal(canonicalSubject('  тарих '), 'Қазақстан тарихы');
  assert.equal(canonicalSubject('Математика'), 'Математика');
  assert.equal(canonicalSubject('Неизвестный предмет'), 'Неизвестный предмет');
  assert.equal(canonicalSubject(null), '');
});

// ── C7 ────────────────────────────────────────────────────────────────────
test('C7: пустые формулировки и пустые цели урока — нарушения', () => {
  assert.ok(coreObjectivesProblems(null).length);
  const bad = coreObjectivesProblems({
    curriculum: [{ code: '11.1.2.1', text: '' }, { code: '11.2.1.1', text: '11.2.1.1' }],
    lesson: [],
  });
  assert.equal(bad.length, 3, 'две пустые формулировки + пустые цели урока');
  assert.equal(coreObjectivesProblems({
    curriculum: [{ code: '11.1.2.1', text: 'көркем шығарманың тақырыбын анықтау' }],
    lesson: ['оқушы тақырыпты анықтайды'],
  }).length, 0);
});

// ── C10 ───────────────────────────────────────────────────────────────────
test('C10: превышение длительности ужимается пропорционально до точной суммы', () => {
  const fixed = normalizeStageMinutes([10, 15, 20, 10], 45); // 55 > 45
  assert.ok(fixed);
  assert.equal(fixed!.reduce((a, b) => a + b, 0), 45);
  assert.ok(fixed!.every((m) => m >= 2));
  assert.equal(normalizeStageMinutes([10, 15, 15], 45), null, 'в норме — не трогаем');
});

// ── C8: лексика ценности ─────────────────────────────────────────────────
test('C8: основы слов ценности находятся сквозь аффиксы', () => {
  const lex = valueLexemes({ key: 'Еңбекқорлық және кәсіби біліктілік', rationale: '' });
  assert.ok(containsValueLexeme('оқушылар еңбекқорлықтың маңызын талқылайды', lex));
  assert.ok(containsValueLexeme('кәсіби шеберлік туралы мәтін', lex));
  assert.ok(!containsValueLexeme('квадрат теңдеулерді шешеді', lex));
});
