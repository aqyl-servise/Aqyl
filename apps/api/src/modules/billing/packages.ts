/**
 * Каталог пакетов уроков — ЕДИНСТВЕННЫЙ источник цен (ТЗ №3, п. 1).
 * Фронт получает список через GET /billing/balance и ничего не хардкодит.
 * Прайс утверждён партнёрами 24.08.2026.
 */
export interface LessonPackage {
  code: string;
  lessons: number;
  priceKzt: number;
  /** Докупка не показывается на витрине — только в апселл-моментах. */
  upsellOnly?: boolean;
}

export const LESSON_PACKAGES: readonly LessonPackage[] = [
  { code: "p10", lessons: 10, priceKzt: 3990 },
  { code: "p30", lessons: 30, priceKzt: 9990 },
  { code: "p64", lessons: 64, priceKzt: 19990 },
  { code: "p128", lessons: 128, priceKzt: 38990 },
  // Малый пакет — только апселл при исчерпании: импульсная докупка
  // (497 ₸/урок, маржа 50%), на витрине не показывается, чтобы не
  // каннибалить основные пакеты. Решение партнёров 24.08.2026.
  { code: "p3", lessons: 3, priceKzt: 1490, upsellOnly: true },
] as const;

export function findPackage(code: string): LessonPackage | undefined {
  return LESSON_PACKAGES.find((p) => p.code === code);
}

/** Каждая покупка продлевает ВЕСЬ баланс на 3 месяца от даты покупки. */
export const BALANCE_MONTHS = 3;
