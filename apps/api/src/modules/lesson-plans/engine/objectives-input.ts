/**
 * Цели обучения: разбор того, что ввёл учитель, и чистка ответа модели.
 *
 * Учителя вставляют в поле кодов цели целиком — «7.2.4.1 иметь представление
 * о производстве бумаги;» — и переносят длинную цель на новую строку. До
 * 04.10.2026 поле резалось по строкам И запятым: обрывок «объёмные и
 * предметные аппликации;» становился отдельным «кодом», модель повторяла
 * каждую строку как цель, а сервер дописывал её ещё раз с темой вместо
 * формулировки. В документе цели обучения шли дважды (замечание методиста).
 *
 * Здесь код берётся из начала строки (допускаются пробелы: «7. 2.5. 1»),
 * строка без кода — продолжение предыдущей цели, а в ответе модели код
 * отрезается от текста и повторы схлопываются.
 */
export interface CurriculumItem {
  code: string;
  text: string;
}

// 3–5 чисел через точку в начале строки: «7.2.4.1», «11.1.2», «7. 2.5. 1».
const CODE_RE = /^\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})(?:\s*\.\s*(\d{1,2}))?(?:\s*\.\s*(\d{1,2}))?(?!\d)/;

/** Нормализованный код из начала строки или null. */
export function leadingCode(raw: string | null | undefined): { code: string; rest: string } | null {
  const s = String(raw ?? '');
  const m = CODE_RE.exec(s);
  if (!m) return null;
  const code = m.slice(1).filter((x) => x !== undefined).join('.');
  return { code, rest: s.slice(m[0].length) };
}

const trimSep = (s: string) => s.replace(/^[\s.:;,—–-]+/, '').replace(/[\s;,]+$/, '').trim();

/**
 * Цели, введённые учителем: по одной на строку, код в начале, текст —
 * необязателен. Строка без кода дописывается к предыдущей цели (перенос
 * длинной формулировки). Повтор кода — объединяется.
 */
export function parseGivenObjectives(lines: string[] | null | undefined): CurriculumItem[] {
  const out: CurriculumItem[] = [];
  for (const raw of lines ?? []) {
    const s = String(raw ?? '').trim();
    if (!s) continue;
    const lc = leadingCode(s);
    if (lc) {
      const text = trimSep(lc.rest);
      const prev = out.find((o) => o.code === lc.code);
      if (prev) { if (!prev.text && text) prev.text = text; }
      else out.push({ code: lc.code, text });
    } else if (out.length) {
      const last = out[out.length - 1];
      last.text = [last.text, trimSep(s)].filter(Boolean).join(', ');
    }
  }
  return out;
}

/** Цели учителя одной строкой каждая — для промпта: «код — формулировка». */
export function givenForPrompt(lines: string[] | null | undefined): string[] {
  return parseGivenObjectives(lines).map((g) => (g.text ? `${g.code} — ${g.text}` : g.code));
}

/**
 * Чистка списка целей обучения (ответ модели или сохранённый паспорт):
 * код нормализуется, повтор кода в начале текста отрезается, записи без
 * настоящего кода отбрасываются, повторы схлопываются (остаётся самая
 * содержательная формулировка). `weakText` — формулировка-заглушка (тема
 * урока), которая уступает любой настоящей.
 */
export function cleanCurriculum(items: Array<{ code?: unknown; text?: unknown }> | null | undefined, weakText = ''): CurriculumItem[] {
  const out: CurriculumItem[] = [];
  const weak = weakText.trim();
  const score = (t: string) => (!t || t === weak ? 0 : t.length);
  for (const it of items ?? []) {
    const lc = leadingCode(String(it?.code ?? ''));
    if (!lc) continue;
    let text = String(it?.text ?? '').trim();
    const inText = leadingCode(text);
    if (inText && inText.code === lc.code) text = trimSep(inText.rest);
    // Модель иногда кладёт формулировку в поле code: «7.2.4.1 иметь представление…».
    if (!text || text === weak) text = trimSep(lc.rest) || text;
    const prev = out.find((o) => o.code === lc.code);
    if (!prev) out.push({ code: lc.code, text });
    else if (score(text) > score(prev.text)) prev.text = text;
  }
  return out;
}

/**
 * Итоговые цели обучения урока. Если учитель указал коды — ровно они и в его
 * порядке (лишние коды, придуманные моделью, не попадают); формулировка —
 * модели, иначе учителя, иначе тема. Без кодов учителя — то, что вернула модель.
 */
export function finalCurriculum(
  given: CurriculumItem[], fromModel: CurriculumItem[], title: string,
): CurriculumItem[] {
  if (!given.length) return fromModel.map((c) => ({ code: c.code, text: c.text || title || c.code }));
  return given.map((g) => {
    const m = fromModel.find((c) => c.code === g.code);
    const modelText = m?.text && m.text !== title ? m.text : '';
    return { code: g.code, text: modelText || g.text || title || g.code };
  });
}
