/** Цели обучения: разбор ввода учителя, чистка ответа модели, связь 1 к 1. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanCurriculum, finalCurriculum, givenForPrompt, leadingCode, parseGivenObjectives } from './objectives-input';
import { canonicalSubject, coreObjectivesProblems } from './lesson-core';
import { fixedStageName, stageDisplayName } from './stage-names';

// Реальный ввод учителя из базы (урок технологии, 7 класс): цели целиком,
// длинная цель перенесена на вторую строку.
const PAPER = [
  '7.2.4.1 иметь представление о производстве бумаги;',
  '7.2.4.2 владеть приёмами складывания бумаги; выполнять аппликации на плоскости',
  'объёмные и предметные аппликации;',
  '7.2.4.4 использовать в аппликациях различные узоры и орнаменты',
];

test('код берётся из начала строки, пробелы внутри кода допускаются', () => {
  assert.equal(leadingCode('7. 2.5. 1 identify the speaker')?.code, '7.2.5.1');
  assert.equal(leadingCode('11.1.2.1')?.code, '11.1.2.1');
  assert.equal(leadingCode('объёмные аппликации'), null);
  assert.equal(leadingCode('2.4 Аппликация'), null, 'два числа — не код цели');
});

test('ввод учителя: строка без кода — продолжение предыдущей цели, а не новый «код»', () => {
  const g = parseGivenObjectives(PAPER);
  assert.deepEqual(g.map((x) => x.code), ['7.2.4.1', '7.2.4.2', '7.2.4.4']);
  assert.ok(g[1].text.includes('объёмные и предметные аппликации'));
  assert.ok(!g[0].text.endsWith(';'));
});

test('для промпта — «код — формулировка», по одной на цель', () => {
  assert.equal(givenForPrompt(PAPER).length, 3);
  assert.ok(givenForPrompt(['8.2.1.4'])[0] === '8.2.1.4');
});

test('ответ модели: повторы и обрывки схлопываются, код из текста отрезается', () => {
  // Ровно то, что лежало в паспорте этого урока до исправления.
  const model = [
    { code: '7.2.4.1', text: 'иметь представление о производстве бумаги' },
    { code: '7.2.4.2', text: 'владеть приёмами складывания бумаги' },
    { code: '7.2.4.4', text: 'использовать в аппликациях различные узоры и орнаменты' },
    { code: '7.2.4.1 иметь представление о производстве бумаги;', text: '2.4 Аппликация Вводный свойства бумаги' },
    { code: 'объёмные и предметные аппликации;', text: '2.4 Аппликация Вводный свойства бумаги' },
    { code: '7.2.4.4', text: '7.2.4.4 использовать в аппликациях различные узоры и орнаменты' },
  ];
  const c = cleanCurriculum(model, '2.4 Аппликация Вводный свойства бумаги');
  assert.deepEqual(c.map((x) => x.code), ['7.2.4.1', '7.2.4.2', '7.2.4.4']);
  assert.ok(!c[2].text.startsWith('7.2.4.4'));
});

test('коды учителя главнее: лишние коды модели отбрасываются, порядок — учителя', () => {
  const given = parseGivenObjectives(['8.2.1.4', '8.2.1.5']);
  const model = cleanCurriculum([
    { code: '8.2.1.5', text: 'вторая' }, { code: '8.2.1.4', text: 'первая' }, { code: '8.9.9.9', text: 'выдумка' },
  ]);
  assert.deepEqual(finalCurriculum(given, model, 'Тема'), [
    { code: '8.2.1.4', text: 'первая' }, { code: '8.2.1.5', text: 'вторая' },
  ]);
});

test('без формулировки от модели — формулировка учителя, потом тема', () => {
  const given = parseGivenObjectives(['7.1.1.1 знать основы']);
  assert.equal(finalCurriculum(given, [], 'Тема')[0].text, 'знать основы');
  assert.equal(finalCurriculum(parseGivenObjectives(['7.1.1.1']), [], 'Тема')[0].text, 'Тема');
});

test('связь 1 к 1: целей урока должно быть столько же, сколько целей обучения', () => {
  const curriculum = [{ code: '8.2.1.1', text: 'a' }, { code: '8.2.1.2', text: 'b' }];
  assert.ok(coreObjectivesProblems({ curriculum, lesson: ['1', '2', '3', '4'] }).some((p) => p.includes('ровно 2')));
  assert.deepEqual(coreObjectivesProblems({ curriculum, lesson: ['1', '2'] }), []);
});

test('первый этап — «Организация урока» / «Ұйымдастыру», остальные — от модели', () => {
  assert.equal(fixedStageName('warmup', 'ru'), 'Организация урока');
  assert.equal(fixedStageName('warmup', 'kz'), 'Ұйымдастыру');
  assert.equal(fixedStageName('task', 'ru'), null);
  assert.equal(stageDisplayName({ stageType: 'warmup', stageName: 'Білімді жаңғырту' }, 'kz'), 'Ұйымдастыру');
  assert.equal(stageDisplayName({ stageType: 'task', stageName: 'Работа в парах' }, 'ru'), 'Работа в парах');
});

test('справочник предметов: варианты написания → одно название на языке урока', () => {
  for (const v of ['English', 'english', 'Английский язык', 'английский язык', 'Ағылшын тілі', 'ағылшын тілі']) {
    assert.equal(canonicalSubject(v, 'kz'), 'Ағылшын тілі', v);
    assert.equal(canonicalSubject(v, 'ru'), 'Английский язык', v);
  }
  assert.equal(canonicalSubject('История казахстан', 'kz'), 'Қазақстан тарихы');
  assert.equal(canonicalSubject('Денешыныктыру', 'kz'), 'Дене шынықтыру');
  assert.equal(canonicalSubject('  химия ', 'ru'), 'Химия');
  assert.equal(canonicalSubject('Робототехника', 'kz'), 'Робототехника', 'нет в справочнике — как ввёл учитель');
  assert.equal(canonicalSubject('Әдебиеті'), 'Қазақ әдебиеті', 'без языка — прежнее поведение');
});