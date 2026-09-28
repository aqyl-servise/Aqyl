import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Подпись ссылки «отписаться». Без неё любой, кто знает id учителя, мог бы
 * отписать его от писем. Секрет — производный от JWT_SECRET, отдельного
 * значения в .env не требуется.
 */
function unsubscribeKey(): string {
  const base = process.env.JWT_SECRET;
  if (!base) throw new Error('JWT_SECRET не задан — ссылку отписки подписать нечем');
  return `${base}:unsubscribe`;
}

function sign(teacherId: string): string {
  return createHmac('sha256', unsubscribeKey()).update(teacherId).digest('base64url').slice(0, 32);
}

export function makeUnsubscribeToken(teacherId: string): string {
  return `${Buffer.from(teacherId).toString('base64url')}.${sign(teacherId)}`;
}

/** id учителя, если подпись верна; иначе null. */
export function readUnsubscribeToken(token: string | undefined | null): string | null {
  if (!token || typeof token !== 'string') return null;
  const [idPart, sig] = token.split('.');
  if (!idPart || !sig) return null;
  let id: string;
  try {
    id = Buffer.from(idPart, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = Buffer.from(sign(id));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  return id;
}

/** Код короткой ссылки: латиница, цифры, дефис; 2–40 символов. */
export const SHORT_CODE_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

/**
 * Канал регистрации одной строкой — для отчёта «откуда пришли учителя».
 *
 * utm_source важнее реферера: метку ставим мы сами, а реферер встроенные
 * браузеры Threads и Instagram часто обрезают. Без меток и реферера —
 * «прямой заход» (набрали адрес, открыли из закладки или из мессенджера,
 * который реферер не передаёт). До 25.09.2026 источник не записывался вовсе.
 */
export function acquisitionSource(a: Record<string, string> | null | undefined): string {
  if (!a) return 'не записан';
  const utm = a.utm_source?.trim().toLowerCase();
  if (utm) return utm;
  if (a.ref) return `ref:${a.ref.trim().toLowerCase()}`;
  if (a.referrer) {
    let host = '';
    try {
      host = new URL(a.referrer).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      host = a.referrer.toLowerCase();
    }
    if (/(^|\.)threads\.(net|com)$/.test(host)) return 'threads (без метки)';
    if (/(^|\.)instagram\.com$/.test(host)) return 'instagram (без метки)';
    if (/(^|\.)(facebook\.com|fb\.com)$/.test(host)) return 'facebook (без метки)';
    if (/(^|\.)t\.me$|telegram/.test(host)) return 'telegram (без метки)';
    if (/whatsapp/.test(host)) return 'whatsapp (без метки)';
    if (/(^|\.)google\./.test(host)) return 'поиск google';
    if (/(^|\.)yandex\./.test(host)) return 'поиск яндекс';
    return host || 'прямой заход';
  }
  if (a.app === 'android' || a.app === 'ios') return `приложение ${a.app}`;
  return 'прямой заход';
}

/** Язык письма: казахский, если учитель пришёл на казахскую витрину. */
export function mailLang(t: { preferredLanguage?: string | null; acquisition?: Record<string, string> | null }): 'ru' | 'kz' {
  const pref = (t.preferredLanguage ?? '').toLowerCase();
  if (pref === 'kz' || pref === 'kk') return 'kz';
  if (t.acquisition?.landing?.startsWith('/kz')) return 'kz';
  return 'ru';
}
