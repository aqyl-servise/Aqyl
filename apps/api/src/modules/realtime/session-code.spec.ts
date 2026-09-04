/** Тесты кода сессии и имени ученика (ТЗ 3.0, п. 2.2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CODE_ALPHABET, CODE_LENGTH, MAX_NAME_LENGTH,
  generateSessionCode, normalizeSessionCode, isValidSessionCode,
  cleanPlayerName, isNameTaken,
} from './session-code';

// ── код сессии ────────────────────────────────────────────────────────────
test('в алфавите нет знаков, которые путают на проекторе', () => {
  for (const c of ['0', 'O', '1', 'I', 'L']) {
    assert.ok(!CODE_ALPHABET.includes(c), `«${c}» не должен входить в алфавит`);
  }
});

test('код нужной длины и только из алфавита', () => {
  for (let i = 0; i < 200; i++) {
    const code = generateSessionCode();
    assert.equal(code.length, CODE_LENGTH);
    assert.ok(isValidSessionCode(code), `негодный код: ${code}`);
  }
});

test('коды не повторяются в пределах разумного', () => {
  const seen = new Set(Array.from({ length: 500 }, generateSessionCode));
  // 31^6 сочетаний: на пятистах выборках совпадений быть не должно.
  assert.equal(seen.size, 500);
});

test('нормализация чистит регистр, пробелы и дефисы', () => {
  assert.equal(normalizeSessionCode(' a2 b3-c4 '), 'A2B3C4');
  assert.equal(normalizeSessionCode('a2b3c4'), 'A2B3C4');
});

test('спорные знаки не подставляются, а отбрасываются', () => {
  // «O», «0», «1», «I», «L» в алфавит не входят. Подстановка вместо них дала
  // бы заведомо неверный код, поэтому такой ввод просто не пройдёт проверку.
  assert.equal(normalizeSessionCode('O0I1L'), '');
  assert.ok(!isValidSessionCode('A2B3C0'));
});

test('лишние знаки за пределами длины отсекаются', () => {
  assert.equal(normalizeSessionCode('A2B3C4D5E6').length, CODE_LENGTH);
});

test('пустой и мусорный ввод не роняет проверку', () => {
  assert.equal(normalizeSessionCode(''), '');
  assert.equal(normalizeSessionCode(null as never), '');
  assert.ok(!isValidSessionCode(''));
  assert.ok(!isValidSessionCode('A2B3C'));
});

// ── имя ученика ───────────────────────────────────────────────────────────
test('имя обрезается по длине и по краям', () => {
  assert.equal(cleanPlayerName('  Айгерим  '), 'Айгерим');
  assert.equal(cleanPlayerName('я'.repeat(50)).length, MAX_NAME_LENGTH);
});

test('невидимые знаки и угловые скобки вычищаются', () => {
  // Имя попадёт на проектор перед классом: подмена направления текста и
  // разметка там недопустимы.
  assert.equal(cleanPlayerName('Ай​герим'), 'Айгерим');
  assert.equal(cleanPlayerName('‮Айгерим'), 'Айгерим');
  assert.equal(cleanPlayerName('<b>Ай</b>'), 'bАй/b');
});

test('внутренние пробелы схлопываются', () => {
  assert.equal(cleanPlayerName('Ай    герим'), 'Ай герим');
});

test('занятость имени не зависит от регистра', () => {
  assert.ok(isNameTaken('Айгерим', ['айгерим', 'Данияр']));
  assert.ok(!isNameTaken('Данияр', ['Айгерим']));
  assert.ok(!isNameTaken('Айгерим', []));
});
