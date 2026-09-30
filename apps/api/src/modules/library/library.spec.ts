/** Тесты библиотеки примеров: адреса страниц и стартовый набор. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exampleLabels, exampleSlug, translit } from './library-utils';
import { LIBRARY_PRESETS } from './library-presets';

test('транслитерация: русские и казахские буквы → латиница', () => {
  assert.equal(translit('Кислород: получение и свойства'), 'kislorod-poluchenie-i-svoystva');
  assert.equal(translit('Өсімдік жасушасының құрылысы'), 'osimdik-zhasushasynyn-kurylysy');
  assert.equal(translit('Қазақ тілі'), 'kazak-tili');
});

test('адрес: КСП для русского, ҚМЖ для казахского, класс/сынып', () => {
  assert.equal(
    exampleSlug({ lang: 'ru', subject: 'Химия', grade: 8, topic: 'Кислород: получение и свойства' }),
    'ksp-himiya-8-klass-kislorod-poluchenie-i-svoystva',
  );
  assert.equal(
    exampleSlug({ lang: 'kz', subject: 'Химия', grade: 8, topic: 'Оттек: алынуы және қасиеттері' }),
    'kmzh-himiya-8-synyp-ottek-alynuy-zhane-kasietteri',
  );
});

test('адрес не длиннее 140 символов и без хвостового дефиса', () => {
  const s = exampleSlug({ lang: 'ru', subject: 'История Казахстана', grade: 6, topic: 'Очень '.repeat(60) });
  assert.ok(s.length <= 140);
  assert.ok(!s.endsWith('-'));
});

test('стартовый набор: адреса уникальны, классы 1–11, поровну языков', () => {
  const slugs = LIBRARY_PRESETS.map(exampleSlug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(LIBRARY_PRESETS.every((p) => p.grade >= 1 && p.grade <= 11));
  assert.equal(LIBRARY_PRESETS.filter((p) => p.lang === 'ru').length, LIBRARY_PRESETS.filter((p) => p.lang === 'kz').length);
});

test('подписи — по утверждённой таблице терминов', () => {
  assert.equal(exampleLabels('ru').kind, 'КСП');
  assert.equal(exampleLabels('kz').kind, 'ҚМЖ');
  assert.equal(exampleLabels('kz').docTitle, 'Қысқа мерзімді сабақ жоспары');
});
