/** Тесты паспорта урока (ТЗ 1.6, этап 2): C7, C10, C12, лексика ценности C8. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalSubject, coreObjectivesProblems, normalizeStageMinutes,
  valueLexemes, containsValueLexeme,
  checkFactYears, checkWorkTheme, checkLowConfidenceKeys, factsForPrompt,
  type CoreFact, type CoreWorkInterpretation,
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

// ── Эталонный лист фактов урока 1 золотого набора (ТЗ 1.6, п. 6) ──────────
// Проверенные данные: С. Сейфуллин род. 15.10.1894 (Акмолинский уезд),
// ум. 25.02.1938 (Алматы); «Сыр сандық» (1926) — о настоящей дружбе.
const SEIFULLIN_FACTS: CoreFact[] = [
  { entity: 'С. Сейфуллин', attribute: 'туған жылы', value: '1894', claim: 'С. Сейфуллин 1894 жылы туған.', confidence: 'high' },
  { entity: 'С. Сейфуллин', attribute: 'қайтыс болған жылы', value: '1938', claim: 'С. Сейфуллин 1938 жылы қайтыс болды.', confidence: 'high' },
];
const SYR_SANDYQ: CoreWorkInterpretation = {
  title: 'Сыр сандық', year: '1926',
  mainTheme: 'нағыз достық және адалдық',
  centralImage: 'жартас басындағы құлыпталған сандық — адамның ішкі сыры',
  keyDevices: ['метафора', 'символ'],
};

// ── C1 ────────────────────────────────────────────────────────────────────
test('C1: ложная дата рождения ловится (баг 1.1)', () => {
  // Реальные значения из урока: 1901 в ключе, 1898 в приложении 4.
  const bad = checkFactYears('Сейфуллин туған жылы: 1901.', SEIFULLIN_FACTS);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].rule, 'C1');
  assert.ok(checkFactYears('Ақынның туған жылы — 1898.', SEIFULLIN_FACTS).length);
});

test('C1: верные даты, дистракторы и чужие годы не дают ложных срабатываний', () => {
  assert.equal(checkFactYears('С. Сейфуллин туған жылы 1894, қайтыс болған жылы 1938.', SEIFULLIN_FACTS).length, 0);
  // Варианты ответа в вопросе с выбором обязаны содержать неверные годы.
  assert.equal(
    checkFactYears('Сәкен Сейфуллин қай жылы дүниеге келген? а) 1900 ә) 1894 б) 1905', SEIFULLIN_FACTS).length,
    0, 'дистракторы вопроса с выбором — не нарушение',
  );
  // Другая достоверная дата биографии, которой просто нет в листе фактов.
  assert.equal(checkFactYears('Ақын 1922 жылы «Асау тұлпар» жинағын шығарды.', SEIFULLIN_FACTS).length, 0);
  assert.equal(checkFactYears('Кеңес өкіметі 1917 жылы орнады.', SEIFULLIN_FACTS).length, 0);
});

// ── C2 ────────────────────────────────────────────────────────────────────
test('C2: выдуманная трактовка «Сырдария» ловится (баг 1.2)', () => {
  const bad = checkWorkTheme('«Сыр сандық» өлеңі Сырдария өзені мен табиғат үйлесімі туралы.', SYR_SANDYQ);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].rule, 'C2');
});

test('C2: верная трактовка проходит; чужие материалы не проверяются', () => {
  assert.equal(checkWorkTheme('«Сыр сандық» — нағыз достық туралы шығарма.', SYR_SANDYQ).length, 0);
  assert.equal(checkWorkTheme('Квадрат теңдеулерді шешу тәсілдері.', SYR_SANDYQ).length, 0);
});

// ── C3 ────────────────────────────────────────────────────────────────────
test('C3: ключ на ненадёжном факте ловится (баг 1.3 — «Достық»)', () => {
  const facts: CoreFact[] = [
    { entity: 'С. Сейфуллин', attribute: 'ұйым', value: 'Достық', claim: '', confidence: 'low' },
  ];
  const bad = checkLowConfidenceKeys('{"answers":"5) В) Достық"}', facts);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].rule, 'C3');
  // high-факт в ключе — норма.
  assert.equal(checkLowConfidenceKeys('{"answers":"5) Ә) Бірлік"}',
    [{ entity: 'С. Сейфуллин', attribute: 'ұйым', value: 'Бірлік', claim: '', confidence: 'high' }]).length, 0);
});

// ── промпт ────────────────────────────────────────────────────────────────
test('factsForPrompt помечает ненадёжные факты и несёт трактовку', () => {
  const s = factsForPrompt({
    facts: [...SEIFULLIN_FACTS, { entity: 'С. Сейфуллин', attribute: 'ұйым', value: 'Достық', claim: '', confidence: 'low' }],
    workInterpretation: SYR_SANDYQ,
  });
  assert.ok(s.includes('1894'));
  assert.ok(s.includes('НЕНАДЁЖНО'));
  assert.ok(s.includes('нағыз достық'));
  assert.equal(factsForPrompt(null), '');
});
