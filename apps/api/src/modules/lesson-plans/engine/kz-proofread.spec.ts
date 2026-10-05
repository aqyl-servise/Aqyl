/** Вычитка казахского: разбор ответа корректора и применение исправлений. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFixes, applyFixesDeep, chunkTexts, kazakhWords, parseFixes, proofreadPrompt, stringsDeep } from './kz-proofread';

test('слова: кириллица от 3 букв, казахские буквы входят, повторы схлопываются', () => {
  const w = kazakhWords(['Оқушыларды сәлемдесіп шаңырақтастырады.', 'Fe және H₂O, оқушыларды']);
  assert.ok(w.includes('шаңырақтастырады'));
  assert.ok(w.includes('оқушыларды'));
  assert.equal(w.filter((x) => x === 'оқушыларды').length, 1);
  assert.ok(!w.includes('Fe'));
});

test('ответ корректора: пустые, одинаковые и слишком длинные пары отбрасываются', () => {
  const f = parseFixes({ fixes: [
    { wrong: 'шаңырақтастырады', right: 'сабаққа дайындайды' },
    { wrong: 'түлектері', right: 'тұлғалары' },
    { wrong: 'сол', right: 'сол' },
    { wrong: '', right: 'x' },
    { wrong: 'x'.repeat(200), right: 'y' },
    { wrong: 'түлектері', right: 'дубль' },
  ] });
  assert.deepEqual(f, [
    { wrong: 'шаңырақтастырады', right: 'сабаққа дайындайды' },
    { wrong: 'түлектері', right: 'тұлғалары' },
  ]);
  assert.deepEqual(parseFixes(null), []);
  assert.deepEqual(parseFixes({ fixes: 'нет' }), []);
});

test('применение: все точные вхождения, остальной текст не трогается', () => {
  const fixes = [{ wrong: 'шыға басталған', right: 'шыға бастаған' }];
  assert.equal(
    applyFixes('«Қазақ» газетінің шыға басталған жылын, шыға басталған айын жаз.', fixes),
    '«Қазақ» газетінің шыға бастаған жылын, шыға бастаған айын жаз.',
  );
  assert.equal(applyFixes('Басқа мәтін', fixes), 'Басқа мәтін');
});

test('раздатка: исправления во всех строках JSON, числа и ключи целы', () => {
  const sheet = { title: 'Алаш қозғалысы: құрылымы және түлектері', questions: [{ q: 'Алаш түлектері кім?', points: 2 }] };
  const fixed = applyFixesDeep(sheet, [{ wrong: 'түлектері', right: 'тұлғалары' }]);
  assert.equal(fixed.title, 'Алаш қозғалысы: құрылымы және тұлғалары');
  assert.equal(fixed.questions[0].q, 'Алаш тұлғалары кім?');
  assert.equal(fixed.questions[0].points, 2);
  assert.deepEqual(stringsDeep({ a: ['x', { b: 'y' }], n: 3, e: '  ' }), ['x', 'y']);
});

test('промпт: подсказка словаря помечена как неполная, тексты пронумерованы', () => {
  const p = proofreadPrompt(['бір', 'екі'], ['шаңырақтастырады'], 'Қазақстан тарихы');
  assert.ok(p.user.includes('словарь неполный'));
  assert.ok(p.user.includes('[1] бір') && p.user.includes('[2] екі'));
  assert.ok(p.system.includes('report_fixes'));
  assert.ok(!proofreadPrompt(['бір'], []).user.includes('словарь неполный'));
});

test('части: повторы убраны, длина части ограничена, длинная строка — отдельной частью', () => {
  const c = chunkTexts(['аааа', 'бббб', 'аааа', '  ', 'в'.repeat(20), 'гггг'], 10);
  assert.deepEqual(c, [['аааа', 'бббб'], ['в'.repeat(20)], ['гггг']]);
  assert.deepEqual(chunkTexts([]), []);
});
