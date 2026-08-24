/**
 * Тесты языкового шлюза (ТЗ 1.6, этап 1). Кейсы приёмки — реальные находки
 * урока 2f6034d5: «ученики», «нравствен», «творчествосында», «опорлы»,
 * «прозайшысы», «өлік».
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkKazakhText, checkKazakhStructure, hardViolations, softViolations,
  describeGateViolations,
} from './language-gate';

const words = (t: string) => checkKazakhText(t).map((v) => v.word.toLowerCase());
const levels = (t: string) => checkKazakhText(t).map((v) => v.level);

// ── Уровень 1: русские корни, включая казахские аффиксы справа ────────────
test('уровень 1: находки из урока 2f6034d5 ловятся', () => {
  assert.ok(words('ученики еңбектің құндылығын түсінеді').includes('ученики'));
  assert.ok(words('өнеге-нравствен ойларымен бөліседі').includes('нравствен'));
  assert.ok(words('оның творчествосында көрініс тапқан').includes('творчествосында'));
  assert.ok(words('опорлы материалды пайдаланыңыз').includes('опорлы'));
  assert.ok(words('ол — көрнекті прозайшысы').includes('прозайшысы'));
  for (const l of levels('ученики творчествосында')) assert.equal(l, 1);
});

test('уровень 1: чистый казахский текст не даёт срабатываний', () => {
  assert.equal(checkKazakhText(
    'Оқушылар өлеңнің тақырыбын анықтайды, шығармашылық жұмысты орындайды, тірек сөздерді қолданады',
  ).length, 0);
});

// ── Белый список приоритетнее ─────────────────────────────────────────────
test('белый список: термины с аффиксами проходят', () => {
  assert.equal(checkKazakhText('метафораны тап, эпитетті көрсет, дескрипторға сәйкес').length, 0);
  assert.equal(checkKazakhText('лирикалық кейіпкер, поэма желісі, диалогке қатысу').length, 0);
});

// ── Уровень 2: известные псевдослова → предупреждение ─────────────────────
test('уровень 2: псевдослова из находок — предупреждение, не жёсткая ошибка', () => {
  const vs = checkKazakhText('мәтінде өндіктеп түседі деген тіркес бар');
  assert.equal(vs.length, 1);
  assert.equal(vs[0].level, 2);
  assert.equal(hardViolations(vs).length, 0);
  assert.equal(softViolations(vs).length, 1);
});

// ── Уровень 3: семантические ловушки ──────────────────────────────────────
test('уровень 3: «өлік» рядом с «өлең» — жёсткая ошибка с подсказкой', () => {
  const vs = checkKazakhText('Сыр сандық өлеңде қандай өлік символы болып табылады?');
  const hard = hardViolations(vs);
  assert.equal(hard.length, 1);
  assert.equal(hard[0].level, 3);
  assert.equal(hard[0].suggestion, 'өлең');
});

test('уровень 3: «өлік» без литературного контекста не трогаем', () => {
  // Тарих: слово легитимно в своём прямом значении.
  assert.equal(checkKazakhText('қазба жұмыстары кезінде өлік табылды').length, 0);
});

test('уровень 3: «11-сынық» ловится по цифре-дефису', () => {
  const hard = hardViolations(checkKazakhText('Бұл тапсырма 11-сынық үшін берілген'));
  assert.equal(hard.length, 1);
  assert.equal(hard[0].suggestion, 'сынып');
});

// ── Структуры и утилиты ───────────────────────────────────────────────────
test('checkKazakhStructure обходит вложенные объекты и дедуплицирует', () => {
  const vs = checkKazakhStructure({
    a: 'ученики келді', b: { c: ['ученики кетті', 'таза мәтін'] },
  });
  assert.equal(vs.length, 1, 'одно слово — одно нарушение');
});

test('describeGateViolations включает слово и замену', () => {
  const s = describeGateViolations(checkKazakhText('өлеңдегі өлік бейнесі'));
  assert.ok(s.includes('өлік') && s.includes('өлең'));
});
