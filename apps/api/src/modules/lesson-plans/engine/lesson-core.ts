/**
 * LessonCore — единый паспорт урока (ТЗ 1.6, этап 2: мета, цели, ценность).
 *
 * Принцип: каждая сущность порождается РОВНО ОДИН РАЗ до остальных модулей
 * и дальше только читается. КМЖ, презентация и промпты этапов берут цели и
 * ценность отсюда, а не генерируют заново. Хранится в lessons.core (jsonb).
 *
 * Здесь — типы и детерминированные проверки (C7, C10, C12). Генерация — в
 * сервисе, одним вызовом модели.
 */

export interface CoreObjectives {
  /** Цели обучения: код + ПОЛНАЯ формулировка из программы (C7: непустая). */
  curriculum: Array<{ code: string; text: string }>;
  /** 3–4 цели урока (C7: непусто). */
  lesson: string[];
}

export interface CoreValue {
  /** Название ценности месяца. */
  key: string;
  /** Как ценность раскрывается на этом уроке (1–2 предложения). */
  rationale: string;
  /** Номера приложений, где ценность ОБЯЗАНА присутствовать. */
  appendixIndices: number[];
  /** Этапы, где ценность ОБЯЗАНА присутствовать. */
  stageIds: string[];
}

/** Один проверяемый факт урока (ТЗ 1.6, п. 2.2). */
export interface CoreFact {
  entity: string;       // «С. Сейфуллин»
  attribute: string;    // «туған жылы» | «туған жері» | …
  value: string;        // «1894»
  claim: string;        // полная формулировка для вставки в текст
  confidence: 'high' | 'medium' | 'low';
}

/** Трактовка изучаемого произведения — ОДНА на весь урок. */
export interface CoreWorkInterpretation {
  title: string;
  year?: string;
  mainTheme: string;
  centralImage: string;
  keyDevices: string[];
}

export interface CoreFactSheet {
  facts: CoreFact[];
  workInterpretation?: CoreWorkInterpretation | null;
}

export interface LessonCoreData {
  meta: {
    subject: string;      // полная каноническая форма (C12)
    grade: number | null;
    topic: string;
    durationMin: number;
  };
  objectives: CoreObjectives;
  value: CoreValue | null;
  /** Лист фактов (ТЗ 1.6, этап 3). Единственный источник дат, имён, трактовок. */
  facts?: CoreFactSheet | null;
  generatedAt: string;
  language: string;
}

/**
 * C12 — канонические названия предметов. Модель и учителя пишут усечённые
 * формы («Әдебиеті», «История»); в документах обязана стоять полная. Ключ —
 * нормализованная усечённая форма, значение — каноническая.
 */
const CANONICAL_SUBJECTS: Record<string, string> = {
  'әдебиеті': 'Қазақ әдебиеті',
  'әдебиет': 'Қазақ әдебиеті',
  'қазақ әдебиет': 'Қазақ әдебиеті',
  'тілі': 'Қазақ тілі',
  'литература': 'Русская литература',
  'история': 'История Казахстана',
  'тарих': 'Қазақстан тарихы',
  'математика': 'Математика',
  'информатика': 'Информатика',
  'физика': 'Физика',
  'химия': 'Химия',
  'биология': 'Биология',
  'география': 'География',
  'ағылшын': 'Ағылшын тілі',
  'english': 'English',
};

/** Полная каноническая форма названия предмета (C12). Незнакомое — как есть. */
export function canonicalSubject(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return s;
  const key = s.toLowerCase().replace(/\s+/g, ' ');
  return CANONICAL_SUBJECTS[key] ?? s;
}

/** C7: цели непусты — и формулировки curriculum, и цели урока. */
export function coreObjectivesProblems(o: CoreObjectives | null | undefined): string[] {
  const out: string[] = [];
  if (!o) return ['objectives отсутствуют целиком'];
  if (!o.curriculum?.length) out.push('нет ни одной цели обучения');
  for (const c of o.curriculum ?? []) {
    if (!c.code?.trim()) out.push('цель обучения без кода');
    if (!c.text?.trim() || c.text.trim() === c.code?.trim()) {
      out.push(`цель ${c.code || '?'} без формулировки`);
    }
  }
  if (!o.lesson?.length) out.push('цели урока пусты («Сабақ мақсаттары»)');
  return out;
}

/**
 * C10: сумма времени этапов не превышает длительность урока. Возвращает
 * скорректированные значения (пропорциональное ужатие, минимум 2 мин на
 * этап) либо null, если всё в норме.
 */
export function normalizeStageMinutes(
  minutes: number[],
  durationMin: number,
): number[] | null {
  const total = minutes.reduce((a, b) => a + (b || 0), 0);
  if (total <= durationMin || !total) return null;
  const k = durationMin / total;
  const scaled = minutes.map((m) => Math.max(2, Math.floor((m || 0) * k)));
  // добираем/убираем разницу с самого длинного этапа
  let diff = durationMin - scaled.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    const idx = diff > 0
      ? scaled.indexOf(Math.max(...scaled))
      : scaled.findIndex((m) => m === Math.max(...scaled.filter((x) => x > 2)));
    if (idx < 0) break;
    scaled[idx] += Math.sign(diff);
    diff -= Math.sign(diff);
  }
  return scaled;
}

/**
 * C8: лексика ценности присутствует в тексте. Сравнение по основам слов
 * названия и обоснования (первые 5 букв, слова короче 5 пропускаются),
 * без учёта регистра — аффиксы справа не мешают.
 */
export function valueLexemes(value: Pick<CoreValue, 'key' | 'rationale'>): string[] {
  const words = `${value.key} ${value.rationale}`.toLowerCase().match(/[а-яёәғқңөұүһіa-z]{5,}/giu) ?? [];
  return [...new Set(words.map((w) => w.slice(0, 5)))];
}

export function containsValueLexeme(text: string, lexemes: string[]): boolean {
  const t = text.toLowerCase();
  return lexemes.some((l) => t.includes(l));
}

// ── Правила согласованности фактов (ТЗ 1.6, п. 4: C1, C2, C3) ─────────────

export interface FactProblem {
  rule: 'C1' | 'C2' | 'C3';
  detail: string;
}

/** Годы из текста: 4 цифры в диапазоне исторических дат. */
function yearsIn(text: string): string[] {
  return [...text.matchAll(/(?<!\d)(1[0-9]{3}|20[0-2][0-9])(?!\d)/g)].map((m) => m[1]);
}

/** Основа слова для нестрогого сравнения (казахские аффиксы клеятся справа). */
const stem = (w: string) => w.toLowerCase().slice(0, 5);

/**
 * C1 — годы рядом с сущностью не противоречат листу фактов.
 *
 * Проверяем только те годы, что стоят в предложении с упоминанием сущности:
 * иначе любая дата в историческом тексте считалась бы нарушением. Год-нарушение
 * — тот, которого нет ни в одном факте про эту сущность.
 */
export function checkFactYears(text: string, facts: CoreFact[]): FactProblem[] {
  if (!text || !facts.length) return [];
  const out: FactProblem[] = [];
  const byEntity = new Map<string, Set<string>>();
  for (const f of facts) {
    const key = f.entity.toLowerCase();
    if (!byEntity.has(key)) byEntity.set(key, new Set());
    for (const y of yearsIn(`${f.value} ${f.claim}`)) byEntity.get(key)!.add(y);
  }

  // Ловим ПРОТИВОРЕЧИЕ конкретному атрибуту, а не любой незнакомый год.
  // Иначе правило било по легитимным случаям: дистракторы вопроса с выбором
  // («а) 1900 ә) 1894 б) 1905» — неверные варианты там обязаны быть) и другие
  // достоверные даты биографии, которых просто нет в листе. Нарушение — когда
  // рядом со СВОИМ маркером атрибута («туған жылы», «родился») стоит год,
  // отличный от записанного в факте.
  const RADIUS = 90;
  const lower = text.toLowerCase();
  const seen = new Set<string>();

  // Позиции маркеров всех атрибутов: год приписывается БЛИЖАЙШЕМУ маркеру.
  // Иначе в перечислении «туған жылы 1894, қайтыс болған жылы 1938» год смерти
  // попадал в окно маркера рождения и считался противоречием.
  type Marker = { pos: number; fact: CoreFact; years: string[] };
  const markers: Marker[] = [];
  for (const f of facts) {
    const factYears = yearsIn(`${f.value} ${f.claim}`);
    if (!factYears.length) continue;
    const words = (f.attribute.toLowerCase().match(/[а-яёәғқңөұүһіa-z]{4,}/giu) ?? [])
      .filter((w) => !['жылы', 'жыл', 'года', 'год', 'year'].includes(w))
      .map((w) => w.slice(0, 5));
    for (const w of words) {
      for (let i = lower.indexOf(w); i >= 0; i = lower.indexOf(w, i + 1)) {
        markers.push({ pos: i, fact: f, years: factYears });
      }
    }
  }
  if (!markers.length) return out;

  for (const m of [...text.matchAll(/(?<!\d)(1[0-9]{3}|20[0-2][0-9])(?!\d)/g)]) {
    const y = m[1];
    const pos = m.index ?? 0;
    // Вариант ответа в списке («ә) 1894») — не утверждение о факте.
    const before = text.slice(Math.max(0, pos - 6), pos);
    if (/[a-zа-яәғқңөұүһі]\s*\)\s*$/iu.test(before)) continue;

    // Маркер и год должны быть в одной части предложения: запятая или точка
    // между ними означают разные утверждения («туған жылы 1894, қайтыс болған
    // жылы 1938» — год смерти не относится к маркеру рождения).
    let nearest: Marker | null = null;
    let best = RADIUS + 1;
    for (const mk of markers) {
      const d = Math.abs(mk.pos - pos);
      if (d >= best) continue;
      const from = Math.min(mk.pos, pos);
      const to = Math.max(mk.pos, pos);
      if (/[,;.!?\n]/.test(text.slice(from, to))) continue;
      best = d; nearest = mk;
    }
    if (!nearest || nearest.years.includes(y)) continue;

    const key = `${nearest.fact.attribute}|${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      rule: 'C1',
      detail: `«${nearest.fact.entity} — ${nearest.fact.attribute}» указан как ${y}, в листе фактов ${nearest.years.join(', ')}`,
    });
  }
  return out;
}

/**
 * C2 — трактовка произведения не противоречит паспорту: ключевое существительное
 * главной темы обязано присутствовать в материале, где произведение разбирается.
 */
export function checkWorkTheme(
  text: string,
  work: CoreWorkInterpretation | null | undefined,
): FactProblem[] {
  if (!work?.mainTheme || !text) return [];
  const title = work.title?.toLowerCase() ?? '';
  // Проверяем только материалы, где произведение реально упоминается.
  if (title && !text.toLowerCase().includes(title.slice(0, 6))) return [];
  const themeStems = (work.mainTheme.toLowerCase().match(/[а-яёәғқңөұүһіa-z]{5,}/giu) ?? []).map(stem);
  if (!themeStems.length) return [];
  const lower = text.toLowerCase();
  const hit = themeStems.some((s) => lower.includes(s));
  return hit ? [] : [{
    rule: 'C2',
    detail: `трактовка расходится с паспортом: главной темы «${work.mainTheme}» нет в материале`,
  }];
}

/**
 * C3 — факт с confidence:'low' не должен становиться основой вопроса с
 * однозначным ответом или ключа. Ищем значение low-факта в блоке ключей.
 */
export function checkLowConfidenceKeys(
  answerKeysText: string,
  facts: CoreFact[],
): FactProblem[] {
  if (!answerKeysText) return [];
  const out: FactProblem[] = [];
  const lower = answerKeysText.toLowerCase();
  for (const f of facts.filter((x) => x.confidence === 'low')) {
    const v = f.value?.trim().toLowerCase();
    if (v && v.length > 2 && lower.includes(v)) {
      out.push({
        rule: 'C3',
        detail: `ключ построен на ненадёжном факте «${f.entity} — ${f.attribute}: ${f.value}»`,
      });
    }
  }
  return out;
}

/** Компактный лист фактов для вставки в промпт. */
export function factsForPrompt(sheet: CoreFactSheet | null | undefined): string {
  if (!sheet) return '';
  const lines: string[] = [];
  for (const f of sheet.facts ?? []) {
    lines.push(`- ${f.entity} · ${f.attribute}: ${f.value}${f.confidence === 'low' ? ' (НЕНАДЁЖНО — не использовать в вопросах с однозначным ответом и в ключах)' : ''}`);
  }
  const w = sheet.workInterpretation;
  if (w?.title) {
    lines.push(`- Произведение «${w.title}»${w.year ? ` (${w.year})` : ''}: главная тема — ${w.mainTheme}; центральный образ — ${w.centralImage}${w.keyDevices?.length ? `; приёмы: ${w.keyDevices.join(', ')}` : ''}`);
  }
  if (!lines.length) return '';
  return `\n\nПРОВЕРЕННЫЕ ФАКТЫ УРОКА — единственный допустимый источник дат, имён и трактовок. ` +
    `Не придумывай других значений и не противоречь им:\n${lines.join('\n')}`;
}
