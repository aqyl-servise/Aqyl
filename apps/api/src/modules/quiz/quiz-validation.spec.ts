/** Тесты проверки вопросов квиза (ТЗ 3.0, п. 4.2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { questionProblem, siftQuestions, cleanQuestion } from './quiz-validation';

const good = { text: 'Столица Казахстана?', options: ['Астана', 'Алматы', 'Шымкент'], correctIndex: 0 };

test('годный вопрос проходит', () => {
  assert.equal(questionProblem(good), null);
});

test('пустой текст и пустой вариант отсеиваются', () => {
  assert.match(questionProblem({ ...good, text: '   ' })!, /пустой текст/);
  assert.match(questionProblem({ ...good, options: ['Астана', '  '] })!, /пустой/);
});

test('число вариантов вне 2–4 — брак', () => {
  assert.match(questionProblem({ ...good, options: ['Один'], correctIndex: 0 })!, /вариантов 1/);
  assert.match(
    questionProblem({ ...good, options: ['а', 'б', 'в', 'г', 'д'], correctIndex: 0 })!,
    /вариантов 5/,
  );
});

test('повторяющиеся варианты — брак даже при разных пробелах и регистре', () => {
  // Частая ошибка модели: один и тот же ответ дважды. В классе такой вопрос
  // не имеет правильного решения.
  assert.match(questionProblem({ ...good, options: ['Астана', 'астана  '] })!, /повторяются/);
});

test('номер правильного ответа вне списка — брак', () => {
  assert.match(questionProblem({ ...good, correctIndex: 3 })!, /вне списка/);
  assert.match(questionProblem({ ...good, correctIndex: -1 })!, /вне списка/);
  assert.match(questionProblem({ ...good, correctIndex: 1.5 })!, /не число/);
  assert.match(questionProblem({ ...good, correctIndex: '0' as never })!, /не число/);
});

test('варианты не списком — брак, а не падение', () => {
  assert.match(questionProblem({ text: 'Вопрос', options: 'Астана' as never, correctIndex: 0 })!, /списком/);
});

test('cleanQuestion срезает пробелы по краям', () => {
  const c = cleanQuestion({ text: '  Вопрос ', options: [' а', 'б '], correctIndex: 1 });
  assert.deepEqual(c, { text: 'Вопрос', options: ['а', 'б'], correctIndex: 1 });
});

test('siftQuestions делит на годные и брак, сохраняя номера', () => {
  const r = siftQuestions([
    good,
    { text: '', options: ['а', 'б'], correctIndex: 0 },
    { ...good, correctIndex: 9 },
    { ...good, text: 'Второй годный' },
  ]);
  assert.equal(r.ok.length, 2);
  assert.equal(r.ok[1].text, 'Второй годный');
  assert.deepEqual(r.rejected.map((x) => x.index), [1, 2]);
});

test('не массив и мусор внутри не роняют разбор', () => {
  assert.deepEqual(siftQuestions(null), { ok: [], rejected: [] });
  const r = siftQuestions([null, undefined, 42]);
  assert.equal(r.ok.length, 0);
  assert.equal(r.rejected.length, 3);
});
