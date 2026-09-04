/** Тесты подсчёта баллов и лидерборда (ТЗ 3.0, п. 3.3–3.4). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answerScore, leaderboard, BASE_POINTS, answeredCount } from './scoring';

const at = (msTaken: number, correct = true, speedBonus = true) =>
  answerScore({ correct, msTaken, limitMs: 20000, speedBonus });

test('неправильный ответ — всегда ноль, как бы быстро ни нажали', () => {
  assert.equal(at(0, false), 0);
  assert.equal(at(19999, false), 0);
});

test('мгновенный ответ даёт полный балл, ответ на последней секунде — половину', () => {
  assert.equal(at(0), BASE_POINTS);
  assert.equal(at(20000), BASE_POINTS / 2);
});

test('надбавка убывает равномерно', () => {
  assert.equal(at(10000), 750);
  assert.ok(at(5000) > at(15000));
});

test('без надбавки за скорость все правильные ответы равны', () => {
  // Асинхронный режим: каждый идёт в своём темпе, скорость сравнивать нечестно.
  assert.equal(at(0, true, false), BASE_POINTS);
  assert.equal(at(19000, true, false), BASE_POINTS);
});

test('присланному времени не доверяем: выход за границы приводится к ним', () => {
  // Часы клиента могут убежать вперёд или назад — балл от этого не должен
  // становиться больше максимума или отрицательным.
  assert.equal(at(-5000), BASE_POINTS);
  assert.equal(at(999999), BASE_POINTS / 2);
});

test('нулевой предел времени не роняет подсчёт делением на ноль', () => {
  const s = answerScore({ correct: true, msTaken: 100, limitMs: 0, speedBonus: true });
  assert.ok(Number.isFinite(s));
});

// ── лидерборд ─────────────────────────────────────────────────────────────
test('порядок по убыванию счёта, места с единицы', () => {
  const board = leaderboard([
    { id: 'a', name: 'Айгерим', score: 700 },
    { id: 'b', name: 'Данияр', score: 1500 },
    { id: 'c', name: 'Мадина', score: 900 },
  ]);
  assert.deepEqual(board.map((p) => p.name), ['Данияр', 'Мадина', 'Айгерим']);
  assert.deepEqual(board.map((p) => p.place), [1, 2, 3]);
});

test('равный счёт — равное место, а следующее место со сдвигом', () => {
  const board = leaderboard([
    { id: 'a', name: 'Айгерим', score: 1000 },
    { id: 'b', name: 'Данияр', score: 1000 },
    { id: 'c', name: 'Мадина', score: 500 },
  ]);
  assert.deepEqual(board.map((p) => p.place), [1, 1, 3]);
});

test('при равном счёте порядок устойчив и не прыгает между вопросами', () => {
  const players = [
    { id: 'b', name: 'Данияр', score: 1000 },
    { id: 'a', name: 'Айгерим', score: 1000 },
  ];
  const first = leaderboard(players).map((p) => p.id);
  const second = leaderboard([...players].reverse()).map((p) => p.id);
  assert.deepEqual(first, second, 'один и тот же набор даёт один и тот же порядок');
});

test('пустой лидерборд не роняет вывод', () => {
  assert.deepEqual(leaderboard([]), []);
});

test('счётчик ответивших', () => {
  assert.equal(answeredCount({ p1: 1, p2: 1 }), 2);
  assert.equal(answeredCount({}), 0);
  assert.equal(answeredCount(undefined as never), 0);
});
