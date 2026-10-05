import { spawn } from 'child_process';

/**
 * Вычитка казахского текста: чистые функции и словарная подсказка.
 *
 * Методист (05.10.2026): генерация выдавала слова, которых нет в языке
 * («Схеманы ұмтыл, диаграммалау және өйтіп қостарыстырмалау үшін
 * пайдалан», «шаңырақтастырады»), и настоящие слова не по смыслу
 * («түлектері» вместо «тұлғалары»). Прежний языковой шлюз ловил только
 * русские корни и короткий список известных псевдослов.
 *
 * Схема: словарь hunspell-kk (пакет Ubuntu, 2009 г.) даёт список слов,
 * которых в нём нет, — это ПОДСКАЗКА, не приговор: на наших уроках словарь
 * не знает около трети нормальных слов («мұғалімнің», «парағы»). Решает
 * корректор (отдельный вызов модели), он же правит слова не по смыслу.
 */

export interface KzFix {
  wrong: string;
  right: string;
}

// Кириллические слова от 3 букв (казахские буквы входят в \p{Script=Cyrillic}).
const WORD_RE = /[\p{Script=Cyrillic}]{3,}/gu;

export function kazakhWords(texts: string[]): string[] {
  const set = new Set<string>();
  for (const t of texts) for (const m of String(t ?? '').match(WORD_RE) ?? []) set.add(m);
  return [...set];
}

/**
 * Слова, которых нет в словаре hunspell-kk. Пустой список, если hunspell
 * не установлен (локальная разработка) или упал: вычитка тогда идёт без
 * подсказки — словарь лишь фокусирует внимание корректора.
 */
export function unknownKazakhWords(words: string[], timeoutMs = 5000): Promise<string[]> {
  if (!words.length) return Promise.resolve([]);
  return new Promise((resolve) => {
    let out = '';
    let done = false;
    const finish = (v: string[]) => { if (!done) { done = true; resolve(v); } };
    try {
      const p = spawn('hunspell', ['-d', 'kk_KZ', '-l', '-i', 'utf-8'], { stdio: ['pipe', 'pipe', 'ignore'] });
      const timer = setTimeout(() => { p.kill(); finish([]); }, timeoutMs);
      p.stdout.setEncoding('utf8');
      p.stdout.on('data', (d: string) => { out += d; });
      p.on('error', () => { clearTimeout(timer); finish([]); });
      p.on('close', () => {
        clearTimeout(timer);
        finish([...new Set(out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))]);
      });
      p.stdin.end(words.join('\n') + '\n');
    } catch {
      finish([]);
    }
  });
}

/**
 * Промпт корректора. Тексты пронумерованы, чтобы модель видела контекст
 * каждого слова, но в ответ возвращает только пары «как было → как надо».
 */
export function proofreadPrompt(
  texts: string[], suspicious: string[], subject?: string | null,
): { system: string; user: string } {
  const system =
    'Ты — корректор казахского языка (литературная норма), проверяешь учебные материалы для школы Казахстана. ' +
    'Найди в тексте ТОЛЬКО:\n' +
    '1) слова, которых нет в казахском языке: выдуманные, искажённые, с невозможными суффиксами ' +
    '(пример: «шаңырақтастырады», «қостарыстырмалау», «өйтіп» в несвязном контексте);\n' +
    '2) настоящие слова, употреблённые не в своём значении (пример: «Алаш қозғалысының түлектері» — ' +
    'нужно «тұлғалары»);\n' +
    '3) явные ошибки в формах слов (пример: «шыға басталған» → «шыға бастаған»).\n' +
    'НЕ трогай: имена собственные, предметные термины, формулы, числа, правильные слова, стиль и ' +
    'порядок слов. Если фраза бессмысленна целиком — замени её короткой правильной фразой с тем же смыслом.\n' +
    'Ответ СТРОГО валидным JSON без пояснений: {"fixes":[{"wrong":"точный фрагмент из текста, 1–6 слов",' +
    '"right":"исправленный фрагмент"}]}. Нет ошибок — {"fixes":[]}.';
  const hint = suspicious.length
    ? `Слова, которых нет в нашем орфографическом словаре (словарь неполный: многие из них правильные — ` +
      `проверь каждое по смыслу и не исправляй правильные): ${suspicious.slice(0, 150).join(', ')}.\n\n`
    : '';
  const user =
    (subject ? `Предмет: ${subject}.\n` : '') +
    hint +
    'Текст:\n' + texts.map((t, i) => `[${i + 1}] ${t}`).join('\n');
  return { system, user };
}

/** Разбор ответа корректора: только непустые пары, где есть что менять. */
export function parseFixes(raw: unknown): KzFix[] {
  const arr = (raw as { fixes?: unknown })?.fixes;
  if (!Array.isArray(arr)) return [];
  const out: KzFix[] = [];
  for (const f of arr) {
    const wrong = String((f as KzFix)?.wrong ?? '').trim();
    const right = String((f as KzFix)?.right ?? '').trim();
    // Защита от переписывания: фрагмент короткий, исправление не пустое.
    if (!wrong || !right || wrong === right || wrong.length > 120 || right.length > 200) continue;
    if (!out.some((o) => o.wrong === wrong)) out.push({ wrong, right });
  }
  return out;
}

/** Применить исправления к строке: точные вхождения фрагмента. */
export function applyFixes(text: string, fixes: KzFix[]): string {
  let s = text;
  for (const f of fixes) if (s.includes(f.wrong)) s = s.split(f.wrong).join(f.right);
  return s;
}

/** Применить исправления ко всем строкам внутри произвольного JSON (раздатка). */
export function applyFixesDeep<T>(value: T, fixes: KzFix[]): T {
  if (!fixes.length) return value;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return applyFixes(v, fixes);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const o: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = walk(x);
      return o;
    }
    return v;
  };
  return walk(value) as T;
}

/** Все строки внутри JSON — для вычитки раздатки. */
export function stringsDeep(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') { if (value.trim()) out.push(value); }
  else if (Array.isArray(value)) value.forEach((x) => stringsDeep(x, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((x) => stringsDeep(x, out));
  return out;
}
