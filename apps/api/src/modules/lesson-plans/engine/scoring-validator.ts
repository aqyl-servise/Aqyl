/**
 * Проверка числовой согласованности блока оценивания раздаточного листа
 * (ТЗ 1.5.2). Модель хорошо пишет содержание и плохо держит арифметику между
 * блоками одного листа: шкала может идти вниз при росте числа верных ответов,
 * количество пропусков в тексте, в критериях и в дескрипторе — расходиться,
 * а баллы за задание распределяться двумя несовместимыми способами.
 *
 * Всё это проверяется детерминированно, поэтому модель тут не вызывается:
 * `validateScoring` — чистая функция без ввода-вывода.
 */

export interface ScoringItem {
  /** Номер пункта в задании, с 1. */
  index: number;
  /** Сколько пропусков внутри пункта; 0, если пропусков нет. */
  gaps: number;
}

export interface ScoringBand {
  /** Нижняя граница диапазона, включительно. */
  minCorrect: number;
  /** Верхняя граница, включительно. */
  maxCorrect: number;
  points: number;
}

export interface DescriptorLine {
  text: string;
  points: number;
  /** Номера пунктов задания; пустой массив — строка относится ко всему листу. */
  refersToItems: number[];
}

export interface Scoring {
  totalPoints: number;
  items: ScoringItem[];
  /** Пороговая шкала; пустой массив — оценивание пофакторное. */
  bands: ScoringBand[];
  /** Баллы за каждый пункт, если шкала не пороговая. */
  perTaskPoints?: Record<number, number>;
  descriptors: DescriptorLine[];
}

/** Код правила из ТЗ 1.5.2, раздел 4.3. */
export type ScoringRule =
  | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6'
  | 'R7' | 'R8' | 'R9' | 'R10' | 'R11';

export interface ScoringViolation {
  rule: ScoringRule;
  /** Человекочитаемое описание — уходит в лог и в промпт перегенерации. */
  detail: string;
}

export interface ValidationResult {
  ok: boolean;
  violations: ScoringViolation[];
  /** По чему считается шкала: по пунктам или по пропускам. Для запасного варианта. */
  scaleBasis: 'items' | 'gaps';
  /** Значение максимума шкалы при выбранной базе. */
  scaleMax: number;
  /** Фактическое число пропусков, посчитанное в тексте задания. */
  gapsInText: number;
}

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/**
 * Пропуск в теле задания: три и более подчёркивания либо три и более точки
 * подряд. Многоточие из трёх точек в обычной прозе тоже попадёт под правило,
 * поэтому вызывающая сторона обязана передавать ТОЛЬКО тело задания — без
 * ключей ответов и без блока критериев (ТЗ 4.3, подсчёт пропусков).
 */
export function countGapsInText(text: string): number {
  if (!text) return 0;
  const matches = text.match(/_{3,}|\.{3,}/g);
  return matches ? matches.length : 0;
}

/** Числительные словами — три языка интерфейса. */
const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  один: 1, одна: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7,
  восемь: 8, девять: 9, десять: 10,
  бір: 1, екі: 2, үш: 3, төрт: 4, бес: 5, алты: 6, жеті: 7, сегіз: 8, тоғыз: 9, он: 10,
};

/**
 * Числа, заявленные как ИТОГОВОЕ количество пунктов или пропусков:
 * «all 7 gap answers», «all five Part 1 gaps», «5 пропусков», «бес сұрақ».
 *
 * Границы диапазонов шкалы («4–6 correct», «fewer than 2») намеренно НЕ
 * ловятся: это не заявление об объёме задания, а пороги оценивания, и они
 * законно принимают любые значения от нуля до максимума. Если считать их
 * заявленным количеством, R7 срабатывал бы на каждом втором корректном листе.
 * По той же причине исключены баллы («2 pts»): маркер обязателен.
 */
export function totalClaimsInText(text: string): number[] {
  if (!text) return [];
  const out: number[] = [];

  // Словесная ветка — только реальные числительные: если разрешить любое
  // слово, «заполняет 9 пропусков» матчится с NUM=«заполняет» и поглощает
  // цифру 9 как промежуточное слово, теряя её. Границы — через \p{L}, а не
  // \b: c кириллицей \b в JS не работает, и короткое «он» (каз. 10) иначе
  // цеплялось бы внутри слов.
  const NUM = `(?<!\\p{L})(\\d+|${Object.keys(WORD_NUMBERS).join('|')})(?!\\p{L})`;
  // Маркеры счётных единиц. «correct» сюда не входит — см. комментарий выше.
  const UNIT =
    '(gaps?|blanks?|items?|questions?|sentences?|tasks?|' +
    'пропуск\\w*|пункт\\w*|вопрос\\w*|предложен\\w*|задани\\w*|' +
    'сұрақ\\w*|тапсырма\\w*|сөйлем\\w*)';

  const push = (raw: string) => {
    const n = /^\d+$/.test(raw) ? Number(raw) : WORD_NUMBERS[raw.toLowerCase()];
    if (typeof n === 'number' && Number.isFinite(n)) out.push(n);
  };

  // «5 пропусков», «five Part 1 gaps» — между числом и единицей допускаем до
  // двух слов: в реальных листах встречается «all five Part 1 gaps».
  for (const m of text.matchAll(new RegExp(`${NUM}\\s+(?:\\S+\\s+){0,2}${UNIT}`, 'giu'))) push(m[1]);
  // «all N» — утверждение о полноте, даже если единица названа дальше.
  for (const m of text.matchAll(new RegExp(`(?:all|все|всех|барлық)\\s+${NUM}`, 'giu'))) push(m[1]);

  return out;
}

/**
 * Основная проверка. `taskText` — тело задания без ключей и критериев (для R6),
 * `scoringText` — текст критериев и дескрипторов (для R7).
 */
export function validateScoring(
  scoring: Scoring,
  taskText: string,
  scoringText = '',
): ValidationResult {
  const v: ScoringViolation[] = [];
  const add = (rule: ScoringRule, detail: string) => v.push({ rule, detail });

  const items = scoring.items ?? [];
  const bands = scoring.bands ?? [];
  const descriptors = scoring.descriptors ?? [];
  const total = scoring.totalPoints;

  const gapsDeclared = sum(items.map((i) => i.gaps ?? 0));
  const gapsInText = countGapsInText(taskText);

  // База шкалы: по пропускам, если они есть и верх шкалы к ним ближе.
  const bandTop = bands.length ? Math.max(...bands.map((b) => b.maxCorrect)) : 0;
  const scaleBasis: 'items' | 'gaps' =
    gapsDeclared > 0 && Math.abs(bandTop - gapsDeclared) < Math.abs(bandTop - items.length)
      ? 'gaps'
      : 'items';
  const scaleMax = scaleBasis === 'gaps' ? gapsDeclared : items.length;

  // ── R11: санитарная проверка. Идёт первой: на битых числах остальные
  // правила выдадут каскад бессмысленных нарушений.
  if (!(total > 0)) add('R11', `totalPoints должен быть больше нуля, получено ${total}`);
  for (const d of descriptors) {
    if (!(d.points >= 0)) add('R11', `отрицательный балл в дескрипторе «${d.text}»: ${d.points}`);
  }
  for (const b of bands) {
    if (!(b.points >= 0)) add('R11', `отрицательный балл в шкале ${b.minCorrect}–${b.maxCorrect}: ${b.points}`);
  }

  // ── R1: сумма дескрипторов равна объявленному итогу.
  const descTotal = sum(descriptors.map((d) => d.points ?? 0));
  if (descriptors.length && descTotal !== total) {
    add('R1', `сумма баллов дескрипторов ${descTotal} не равна totalPoints ${total}`);
  }

  if (bands.length) {
    // ── R2: максимум шкалы равен итогу.
    const maxBandPoints = Math.max(...bands.map((b) => b.points));
    if (maxBandPoints !== total) {
      add('R2', `максимум шкалы ${maxBandPoints} не равен totalPoints ${total}`);
    }

    const sorted = [...bands].sort((a, b) => a.minCorrect - b.minCorrect);

    // ── R3: с ростом числа верных ответов балл не должен падать.
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].points < sorted[i - 1].points) {
        add('R3', `шкала не монотонна: ${sorted[i - 1].minCorrect}–${sorted[i - 1].maxCorrect} даёт ` +
          `${sorted[i - 1].points} б., а ${sorted[i].minCorrect}–${sorted[i].maxCorrect} — ${sorted[i].points} б.`);
        break;
      }
    }

    // ── R4: диапазоны не пересекаются и не оставляют дыр от 0 до scaleMax.
    for (const b of sorted) {
      if (b.minCorrect > b.maxCorrect) {
        add('R4', `диапазон ${b.minCorrect}–${b.maxCorrect} задом наперёд`);
      }
    }
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      if (cur.minCorrect <= prev.maxCorrect) {
        add('R4', `диапазоны пересекаются: ${prev.minCorrect}–${prev.maxCorrect} и ${cur.minCorrect}–${cur.maxCorrect}`);
      } else if (cur.minCorrect > prev.maxCorrect + 1) {
        add('R4', `дыра в шкале между ${prev.maxCorrect} и ${cur.minCorrect}`);
      }
    }
    if (sorted.length && sorted[0].minCorrect > 0) {
      add('R4', `шкала начинается с ${sorted[0].minCorrect}, результат ниже никак не оценивается`);
    }

    // ── R5: верхний диапазон покрывает максимум.
    if (scaleMax > 0 && bandTop < scaleMax) {
      add('R5', `шкала доходит только до ${bandTop}, а максимум — ${scaleMax} ` +
        `(${scaleBasis === 'gaps' ? 'пропусков' : 'пунктов'})`);
    }
  }

  // ── R6: объявленные пропуски совпадают с фактическими в тексте.
  if (gapsDeclared > 0 && gapsInText > 0 && gapsDeclared !== gapsInText) {
    add('R6', `в метаданных ${gapsDeclared} пропусков, в тексте задания — ${gapsInText}`);
  }

  // ── R7: числа в критериях и дескрипторах совпадают с пунктами или пропусками.
  if (scoringText) {
    const allowed = new Set<number>([items.length, gapsDeclared].filter((n) => n > 0));
    // Баллы — не заявленное количество, их из проверки исключаем.
    const pointValues = new Set<number>([
      total,
      ...descriptors.map((d) => d.points),
      ...bands.map((b) => b.points),
    ]);
    for (const n of totalClaimsInText(scoringText)) {
      if (!allowed.has(n) && !pointValues.has(n) && allowed.size) {
        add('R7', `в тексте оценивания указано количество ${n}, но в задании ` +
          `${items.length} пунктов и ${gapsDeclared} пропусков`);
        break;
      }
    }
  }

  // ── R10: ссылки на существующие пункты.
  for (const d of descriptors) {
    for (const ref of d.refersToItems ?? []) {
      if (!Number.isInteger(ref) || ref < 1 || ref > items.length) {
        add('R10', `дескриптор «${d.text}» ссылается на пункт ${ref}, а пунктов ${items.length}`);
      }
    }
  }

  // ── R8/R9: распределение баллов по пунктам совпадает в критериях и дескрипторах.
  const perTask = scoring.perTaskPoints;
  if (perTask && Object.keys(perTask).length) {
    for (const [key, declared] of Object.entries(perTask)) {
      const idx = Number(key);
      // Модель иногда шлёт нечисловые ключи («Part 1», «1a») — без этой
      // проверки idx = NaN, и в лог с промптом ретрая уходил «пункт NaN».
      if (!Number.isInteger(idx)) continue;
      const fromDescriptors = sum(
        descriptors.filter((d) => (d.refersToItems ?? []).includes(idx)).map((d) => d.points),
      );
      // Пункт без единой ссылки — это R9 (склейка), а не расхождение баллов:
      // сообщать про «0 баллов по дескрипторам» было бы неверной подсказкой.
      const covered = descriptors.some((d) => (d.refersToItems ?? []).includes(idx));
      if (covered && fromDescriptors !== declared) {
        add('R8', `пункт ${idx}: по критериям ${declared} б., по дескрипторам ${fromDescriptors} б.`);
      }
      if (!covered) {
        add('R9', `пункт ${idx} оценивается отдельно (${declared} б.), но ни один дескриптор на него не ссылается`);
      }
    }

    // ── R9: одна строка не должна покрывать несколько раздельно оцениваемых пунктов.
    for (const d of descriptors) {
      const refs = (d.refersToItems ?? []).filter((r) => perTask[r] !== undefined);
      if (refs.length > 1) {
        add('R9', `дескриптор «${d.text}» покрывает пункты ${refs.join(', ')}, ` +
          `которые в критериях оцениваются раздельно`);
      }
    }
  }

  return { ok: v.length === 0, violations: v, scaleBasis, scaleMax, gapsInText };
}

/** Список нарушений одной строкой — для лога и для промпта перегенерации. */
export function describeViolations(violations: ScoringViolation[]): string {
  return violations.map((x) => `${x.rule}: ${x.detail}`).join('; ');
}

/**
 * Детерминированный запасной вариант (ТЗ 1.5.2, п. 4.4.3): применяется, когда
 * две перегенерации не дали валидного блока. Учитель в любом случае получает
 * лист — валидатор чинит, а не отменяет.
 *
 * Шкала строится равномерно: диапазон 0..scaleMax делится на totalPoints+1
 * уровней (0..totalPoints баллов), пороги — округлением вниз. Тексты строк
 * дескриптора сохраняются как есть; пересчитываются только баллы —
 * пропорционально perTaskPoints (или поровну), остаток от округления отдаётся
 * первой строке, чтобы сумма сошлась с totalPoints точно.
 */
export function buildFallbackScoring(scoring: Scoring, scaleMax: number): Scoring {
  const total = Math.max(1, Math.round(scoring.totalPoints || 1));
  const max = Math.max(1, scaleMax);

  // ── Шкала: totalPoints+1 уровней от 0 до total, границы без дыр/пересечений.
  const bands: ScoringBand[] = [];
  let prevTop = -1;
  for (let p = 0; p <= total; p++) {
    // Верх уровня p: доля p/total от максимума, округление вниз.
    const top = p === total ? max : Math.floor((max * (p + 1)) / (total + 1));
    if (top <= prevTop) continue; // уровней больше, чем значений — уровень схлопнулся
    bands.push({ minCorrect: prevTop + 1, maxCorrect: top, points: p });
    prevTop = top;
  }
  // Схлопнувшиеся уровни могли съесть максимум балла — верхний уровень обязан
  // давать total (иначе R2 сработает на нашем же запасном варианте).
  if (bands.length) bands[bands.length - 1].points = total;

  // ── Дескрипторы: текст как есть, баллы — пропорционально perTaskPoints.
  const lines = scoring.descriptors ?? [];
  const perTask = scoring.perTaskPoints ?? {};
  const weights = lines.map((d) => {
    const w = sum((d.refersToItems ?? []).map((i) => perTask[i] ?? 0));
    return w > 0 ? w : 1; // строка без ссылок или без баллов — вес 1
  });
  const weightTotal = sum(weights) || 1;
  const points = weights.map((w) => Math.floor((total * w) / weightTotal));
  const remainder = total - sum(points);
  if (points.length) points[0] += remainder; // остаток — первой строке (ТЗ)

  return {
    totalPoints: total,
    items: scoring.items ?? [],
    bands,
    perTaskPoints: scoring.perTaskPoints,
    descriptors: lines.map((d, i) => ({ ...d, points: points[i] ?? 0 })),
  };
}
