/** Тесты воронки роста: отписка, источник регистрации, тексты писем. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acquisitionSource, mailLang, makeUnsubscribeToken, readUnsubscribeToken } from './growth-utils';
import { activationMail, trialEndMail } from './nudge-mail';

process.env.JWT_SECRET = 'test-secret';

// ── ссылка отписки ────────────────────────────────────────────────────────
const id = '3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c';

test('подписанный токен читается обратно', () => {
  assert.equal(readUnsubscribeToken(makeUnsubscribeToken(id)), id);
});

test('чужой id с чужой подписью не проходит', () => {
  const [, sig] = makeUnsubscribeToken(id).split('.');
  const forged = `${Buffer.from('00000000-0000-0000-0000-000000000000').toString('base64url')}.${sig}`;
  assert.equal(readUnsubscribeToken(forged), null);
});

test('мусор и пустое значение — null, без исключений', () => {
  for (const t of ['', 'abc', 'a.b.c', undefined, null]) assert.equal(readUnsubscribeToken(t), null);
});

test('другой секрет — другая подпись', () => {
  const t = makeUnsubscribeToken(id);
  process.env.JWT_SECRET = 'other';
  assert.equal(readUnsubscribeToken(t), null);
  process.env.JWT_SECRET = 'test-secret';
});

// ── источник регистрации ──────────────────────────────────────────────────
test('до начала учёта — «не записан»', () => {
  assert.equal(acquisitionSource(null), 'не записан');
});

test('utm_source важнее реферера', () => {
  assert.equal(acquisitionSource({ utm_source: 'Threads', referrer: 'https://www.google.com/' }), 'threads');
});

test('реферер без метки распознаётся по домену', () => {
  assert.equal(acquisitionSource({ referrer: 'https://l.threads.net/?u=x' }), 'threads (без метки)');
  assert.equal(acquisitionSource({ referrer: 'https://l.instagram.com/' }), 'instagram (без метки)');
  assert.equal(acquisitionSource({ referrer: 'https://www.google.kz/' }), 'поиск google');
  assert.equal(acquisitionSource({ referrer: 'https://example.org/page' }), 'example.org');
});

test('без меток и реферера — прямой заход', () => {
  assert.equal(acquisitionSource({ landing: '/', app: 'web' }), 'прямой заход');
});

// ── язык письма ───────────────────────────────────────────────────────────
test('пришёл на казахскую витрину — казахское письмо', () => {
  assert.equal(mailLang({ preferredLanguage: 'ru', acquisition: { landing: '/kz' } }), 'kz');
});

test('по умолчанию — русский', () => {
  assert.equal(mailLang({ preferredLanguage: 'ru', acquisition: null }), 'ru');
});

// ── тексты писем ──────────────────────────────────────────────────────────
const unsub = 'https://aqyl-service.kz/api/mail/unsubscribe?t=x';

test('термины по утверждённой таблице', () => {
  const ru = activationMail({ lang: 'ru', freeLessons: 5, unsubscribeUrl: unsub });
  const kz = activationMail({ lang: 'kz', freeLessons: 5, unsubscribeUrl: unsub });
  assert.ok(ru.html.includes('краткосрочный план урока'));
  assert.ok(!/ҚМЖ|КМЖ/.test(ru.html + ru.text));
  assert.ok(kz.html.includes('қысқа мерзімді сабақ жоспары'));
  assert.ok(!/КСП/.test(kz.html + kz.text));
  assert.ok(ru.html.includes('№ 130') && kz.html.includes('№ 130'));
});

test('в каждом письме есть ссылка отписки — в html и в тексте', () => {
  for (const m of [
    activationMail({ lang: 'ru', freeLessons: 5, unsubscribeUrl: unsub }),
    activationMail({ lang: 'kz', freeLessons: 5, unsubscribeUrl: unsub }),
    trialEndMail({ lang: 'ru', lessonsMade: 5, unsubscribeUrl: unsub }),
    trialEndMail({ lang: 'kz', lessonsMade: 5, unsubscribeUrl: unsub }),
  ]) {
    assert.ok(m.html.includes(unsub));
    assert.ok(m.text.includes(unsub));
  }
});

test('согласование числа уроков', () => {
  assert.ok(activationMail({ lang: 'ru', freeLessons: 1, unsubscribeUrl: unsub }).subject.includes('1 бесплатный урок'));
  assert.ok(activationMail({ lang: 'ru', freeLessons: 3, unsubscribeUrl: unsub }).subject.includes('3 бесплатных урока'));
  assert.ok(activationMail({ lang: 'ru', freeLessons: 5, unsubscribeUrl: unsub }).subject.includes('5 бесплатных уроков'));
  assert.ok(trialEndMail({ lang: 'ru', lessonsMade: 5, unsubscribeUrl: unsub }).html.includes('5 уроков'));
});

test('имя экранируется', () => {
  const m = activationMail({ lang: 'ru', fullName: '<b>Айгуль</b>', freeLessons: 5, unsubscribeUrl: unsub });
  assert.ok(!m.html.includes('<b>Айгуль'));
});

test('прайс — из каталога, без апселл-пакета', () => {
  const m = trialEndMail({ lang: 'ru', lessonsMade: 5, unsubscribeUrl: unsub });
  assert.ok(m.html.includes('3 990 ₸'));
  assert.ok(!m.html.includes('1 490 ₸'));
});
