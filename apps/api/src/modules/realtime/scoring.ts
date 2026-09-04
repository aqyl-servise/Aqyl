/**
 * Подсчёт баллов живого квиза (ТЗ 3.0, п. 3.3) — чистые функции.
 *
 * За правильный ответ дают баллы; в синхронном режиме — с надбавкой за
 * скорость, как в Kahoot. Надбавка ограничена половиной: иначе один быстрый
 * ученик отрывается так, что остальным нет смысла играть дальше, а квиз
 * нужен для вовлечения всего класса, а не для выявления самого шустрого.
 */

export const BASE_POINTS = 1000;

/** Доля баллов, которая зависит от скорости. Половина — потолок надбавки. */
const SPEED_SHARE = 0.5;

export interface AnswerInput {
  /** Совпал ли выбранный вариант с правильным. */
  correct: boolean;
  /** Сколько миллисекунд думал ученик с момента показа вопроса. */
  msTaken: number;
  /** Отведённое на вопрос время, мс. */
  limitMs: number;
  /** Включена ли надбавка за скорость (в асинхронном режиме её нет). */
  speedBonus: boolean;
}

/**
 * Баллы за один ответ. Неправильный — всегда ноль: частичных баллов в квизе
 * с выбором ответа нет, иначе «ткнуть наугад» становится выгодной стратегией.
 */
export function answerScore(input: AnswerInput): number {
  if (!input.correct) return 0;
  if (!input.speedBonus) return BASE_POINTS;

  const limit = input.limitMs > 0 ? input.limitMs : 1;
  // Отрицательное время (часы клиента убежали вперёд) и опоздание за предел
  // одинаково приводим к границам: доверять присланному времени нельзя.
  const ratio = Math.min(Math.max(input.msTaken / limit, 0), 1);
  return Math.round(BASE_POINTS * (1 - SPEED_SHARE * ratio));
}

export interface Standing {
  id: string;
  name: string;
  score: number;
}

/**
 * Лидерборд. При равном счёте — по имени: порядок обязан быть устойчивым,
 * иначе одинаковые результаты будут прыгать местами между вопросами и это
 * выглядит как ошибка подсчёта.
 */
export function leaderboard(players: readonly Standing[]): (Standing & { place: number })[] {
  const sorted = [...players].sort((a, b) => (
    b.score - a.score || a.name.localeCompare(b.name, "ru")
  ));

  let place = 0;
  let prevScore: number | null = null;
  return sorted.map((p, i) => {
    // Равный счёт — равное место: «двое вторых» честнее, чем случайный выбор.
    if (prevScore === null || p.score !== prevScore) place = i + 1;
    prevScore = p.score;
    return { ...p, place };
  });
}

/** Сколько ответили на текущий вопрос — для полосы прогресса у ведущего. */
export function answeredCount(answers: Record<string, unknown>): number {
  return Object.keys(answers ?? {}).length;
}
