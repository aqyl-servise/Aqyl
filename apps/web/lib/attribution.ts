/**
 * Откуда пришёл учитель — первый источник касания.
 *
 * До этого источник регистрации не записывался вовсе, и на вопрос «что
 * сработало на неделе 24 августа, когда пришло 66 учителей» ответа не было.
 *
 * Модель — первое касание: записываем при первом заходе и не перезаписываем
 * при следующих. Учитель, пришедший из Threads и вернувшийся через неделю
 * напрямую, должен засчитаться Threads, а не «прямому заходу».
 *
 * Хранится только на устройстве до регистрации и уходит на наш же сервер
 * вместе с ней. Третьим лицам ничего не передаётся — нового получателя
 * данных это не создаёт.
 */
const KEY = "aqyl_attr";
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"] as const;

export type Attribution = Partial<Record<(typeof PARAMS)[number] | "referrer" | "landing" | "app" | "at", string>>;

const clip = (v: string) => v.slice(0, 200);

/** Вызывается при каждом открытии страницы; пишет только при первом касании. */
export function captureAttribution(): void {
  try {
    const url = new URL(window.location.href);
    const stored = localStorage.getItem(KEY);
    if (stored) {
      // Исключение из первого касания — код приглашения коллеги. Учитель мог
      // когда-то зайти из Threads, а зарегистрироваться по ссылке коллеги:
      // награду за приглашение должен получить коллега.
      const ref = url.searchParams.get("ref");
      if (ref) {
        const a = JSON.parse(stored) as Attribution;
        if (a.ref !== ref) localStorage.setItem(KEY, JSON.stringify({ ...a, ref: clip(ref) }));
      }
      return;
    }
    const a: Attribution = {};
    for (const p of PARAMS) {
      const v = url.searchParams.get(p);
      if (v) a[p] = clip(v);
    }
    // Реферер — только внешний: переходы внутри сайта источником не являются.
    // Встроенные браузеры приложений его часто обрезают, поэтому ссылки в
    // постах всё равно нужно размечать utm-метками.
    const ref = document.referrer;
    if (ref && !ref.includes(window.location.host)) a.referrer = clip(ref);
    a.landing = clip(url.pathname);
    const ua = navigator.userAgent;
    a.app = ua.includes("AqylApp/Android") ? "android" : ua.includes("AqylApp/iOS") ? "ios" : "web";
    a.at = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    // Приватный режим или запрет хранилища: без учёта источника сайт работает.
  }
}

/** Для отправки вместе с регистрацией. Пустой объект, если ничего не записано. */
export function readAttribution(): Attribution | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : undefined;
  } catch {
    return undefined;
  }
}
