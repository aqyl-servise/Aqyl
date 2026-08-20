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

/**
 * Множители кэша промптов (Anthropic): запись в кэш дороже обычного входа,
 * чтение — почти бесплатно. Ставка та же входная, меняется только множитель.
 */
export const CACHE_WRITE_MULTIPLIER = 1.25;
export const CACHE_READ_MULTIPLIER = 0.1;

/** Токены кэша одного вызова. Нулевые, если кэш не использовался. */
export interface CacheTokens {
  /** Записано в кэш (тариф ×1.25). */
  write?: number;
  /** Прочитано из кэша (тариф ×0.1). */
  read?: number;
}

/**
 * Входные токены, приведённые к обычному тарифу.
 *
 * При кэшировании usage.input_tokens — это ТОЛЬКО некэшированный остаток, а
 * запись и чтение кэша идут отдельными полями по своим множителям. Без этого
 * приведения учёт занижал бы расход на объём кэша.
 */
export function billableInputTokens(tokensIn: number, cache?: CacheTokens): number {
  return tokensIn
    + (cache?.write ?? 0) * CACHE_WRITE_MULTIPLIER
    + (cache?.read ?? 0) * CACHE_READ_MULTIPLIER;
}

/** Стоимость вызова в долларах. */
export function costUsd(model: string, tokensIn: number, tokensOut: number, cache?: CacheTokens): number {
  const p = getModelPrice(model);
  return (billableInputTokens(tokensIn, cache) * p.inputPerMTok + tokensOut * p.outputPerMTok) / 1_000_000;
}

/** Стоимость вызова в тенге — для отчётности в кабинете. */
export function costKzt(model: string, tokensIn: number, tokensOut: number, cache?: CacheTokens): number {
  return costUsd(model, tokensIn, tokensOut, cache) * usdToKzt();
}
