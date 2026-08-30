/**
 * Подсказка опечатки в домене почты.
 *
 * Письмо с кодом уходит через SMTP, который принимает его молча, а отказ
 * возвращается часами позже в наш ящик — приложение об этом не узнаёт никогда.
 * Поэтому опечатку надо ловить до отправки: человек видит «код отправлен» и
 * ждёт письма, которого не будет.
 *
 * Реальный случай 28 августа 2026: адрес на «icliud.com», через 87 секунд
 * попытка с того же имени на gmail — и всё равно уход без регистрации.
 *
 * Подсказка не блокирует отправку и ничего не исправляет сама: незнакомый
 * домен вполне может быть настоящим (школьные и корпоративные ящики).
 */

/** Домены, которыми пользуются наши учителя, плюс распространённые в СНГ. */
const KNOWN_DOMAINS = [
  "gmail.com", "mail.ru", "icloud.com", "bk.ru", "list.ru", "inbox.ru",
  "yandex.ru", "yandex.kz", "yandex.by", "yandex.com", "ya.ru",
  "outlook.com", "hotmail.com", "yahoo.com", "rambler.ru", "proton.me",
  "mail.kz", "internet.ru",
];

/** Расстояние Левенштейна — сколько правок отделяет одну строку от другой. */
function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const cur = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/**
 * Вернуть исправленный адрес, если домен похож на известный с опечаткой.
 * null — домен либо верен, либо ни на что не похож.
 */
export function suggestEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain.includes(".") || KNOWN_DOMAINS.includes(domain)) return null;

  let best: string | null = null;
  let bestDistance = Infinity;
  for (const known of KNOWN_DOMAINS) {
    const d = editDistance(domain, known);
    if (d < bestDistance) { bestDistance = d; best = known; }
  }
  if (!best || bestDistance === 0) return null;

  // Короткому домену прощаем одну ошибку, длинному — две: иначе «mail.kz»
  // подсказывал бы «mail.ru», а это разные живые домены.
  const limit = best.length <= 7 ? 1 : 2;
  return bestDistance <= limit ? `${local}@${best}` : null;
}
