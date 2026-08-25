/**
 * Отпечаток устройства — мягкий признак связи аккаунтов.
 *
 * Считается из устойчивых характеристик браузера. Намеренно слабый и легко
 * обходится (другой браузер, режим инкогнито меняют не всё, но многое) —
 * блокировать по нему нельзя, он лишь повод посмотреть глазами. Ни один
 * пользователь по нему не идентифицируется вне нашей базы: значение
 * необратимо хешируется на сервере.
 *
 * Canvas и WebGL сознательно не используются: это уже настоящая слежка,
 * несоразмерная задаче «заметить десять аккаунтов с одного ноутбука».
 */
export function deviceFingerprint(): string {
  if (typeof navigator === "undefined" || typeof screen === "undefined") return "";
  const parts = [
    navigator.userAgent,
    navigator.language,
    Array.isArray(navigator.languages) ? navigator.languages.join(",") : "",
    String(screen.width), String(screen.height), String(screen.colorDepth),
    String(new Date().getTimezoneOffset()),
    String((navigator as { hardwareConcurrency?: number }).hardwareConcurrency ?? ""),
    String((navigator as { maxTouchPoints?: number }).maxTouchPoints ?? ""),
  ];
  return parts.join("|");
}

/** Заголовок для запросов регистрации и входа. */
export function devicePrintHeader(): Record<string, string> {
  const fp = deviceFingerprint();
  return fp ? { "X-Device-Print": fp } : {};
}
