/**
 * Цены Anthropic за миллион токенов, в долларах США.
 *
 * Источник — прайс Anthropic. Обновлять при смене моделей или тарифов.
 * Важно: цена зависит от МОДЕЛИ, а не от типа действия. Раньше учёт считал
 * все вызовы по одной ставке ($0.25/$1.25 — тариф старого Haiku 3), из-за
 * чего расход на Sonnet занижался примерно в двенадцать раз.
 */
export interface ModelPrice {
  /** Доллары за миллион входных токенов. */
  inputPerMTok: number;
  /** Доллары за миллион выходных токенов. */
  outputPerMTok: number;
}

const PRICES: Record<string, ModelPrice> = {
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
};

/** Ставка по умолчанию — самая дорогая из используемых, чтобы не занижать расход. */
const FALLBACK: ModelPrice = { inputPerMTok: 3, outputPerMTok: 15 };

/**
 * Курс тенге к доллару для отчётности.
 * Приблизительный: точная стоимость считается в долларах, тенге нужны лишь
 * для наглядности в кабинете. Вынесен в переменную окружения, чтобы не
 * пересобирать приложение при заметном изменении курса.
 */
export function usdToKzt(): number {
  const fromEnv = Number(process.env.USD_KZT_RATE);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 525;
}

/** Цена для модели. Идентификаторы с датой (…-20251001) сводятся к базовым. */
export function getModelPrice(model: string): ModelPrice {
  if (PRICES[model]) return PRICES[model];
  const base = Object.keys(PRICES).find((k) => model.startsWith(k));
  return base ? PRICES[base] : FALLBACK;
}

/** Стоимость вызова в долларах. */
export function costUsd(model: string, tokensIn: number, tokensOut: number): number {
  const p = getModelPrice(model);
  return (tokensIn * p.inputPerMTok + tokensOut * p.outputPerMTok) / 1_000_000;
}

/** Стоимость вызова в тенге — для отчётности в кабинете. */
export function costKzt(model: string, tokensIn: number, tokensOut: number): number {
  return costUsd(model, tokensIn, tokensOut) * usdToKzt();
}
