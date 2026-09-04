import { randomInt } from "crypto";

/**
 * Код сессии и временное имя ученика (ТЗ 3.0, п. 2.2) — чистые функции.
 *
 * Код набирают дети с телефона, часто списывая с проектора через весь класс.
 * Поэтому из алфавита убраны знаки, которые путают на расстоянии: ноль и «O»,
 * единица с «I» и «L». Остаётся 31 знак, шесть позиций — под девятьсот
 * миллионов сочетаний, случайных совпадений среди десятка живых сессий не
 * будет.
 */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 6;

/** Криптостойкий выбор: предсказуемый код позволил бы войти в чужой урок. */
export function generateSessionCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Привести введённое к виду хранения: верхний регистр, прочь пробелы и
 * дефисы, которые ученик добавляет при наборе.
 *
 * Спорных знаков не исправляем: «O», «0», «1», «I», «L» в алфавит не входят
 * вовсе, и подстановка вместо них дала бы заведомо неверный код. Такой ввод
 * просто не пройдёт проверку, и человек увидит понятный отказ.
 */
export function normalizeSessionCode(raw: string): string {
  return (raw ?? "")
    .toUpperCase()
    .split("")
    .filter((c) => CODE_ALPHABET.includes(c))
    .join("")
    .slice(0, CODE_LENGTH);
}

export function isValidSessionCode(raw: string): boolean {
  const code = (raw ?? "").toUpperCase();
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

export const MAX_NAME_LENGTH = 20;

/** Невидимые и управляющие знаки: ломают вывод и подменяют направление текста. */
const INVISIBLE = /[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

/**
 * Временное имя ученика. Персональных данных не храним (ТЗ 3.0, п. 0) — это
 * никнейм на один урок. Но он попадёт на проектор перед классом, поэтому
 * невидимые знаки и угловые скобки вычищаем.
 */
export function cleanPlayerName(raw: string): string {
  return (raw ?? "")
    .replace(INVISIBLE, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

/** Занято ли имя: сравнение без учёта регистра и лишних пробелов. */
export function isNameTaken(name: string, taken: readonly string[]): boolean {
  const key = name.toLowerCase();
  return taken.some((t) => t.toLowerCase() === key);
}
