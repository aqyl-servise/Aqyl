"use client";
import { useEffect, useState } from "react";

/**
 * Определение iOS-обёртки для правил App Store.
 *
 * Apple требует, чтобы доступ к платным возможностям внутри приложения
 * продавался через встроенные покупки. Наша подписка оплачивается на сайте
 * через Kaspi, а встроенные покупки с Kaspi несовместимы. Самая безопасная
 * конфигурация: в приложении нет ни одной кнопки, ведущей к оплате, и ни
 * одного текста, предлагающего оплатить — приложение лишь сообщает, что
 * подписка неактивна.
 *
 * Нативной сборки в репозитории пока нет. Механизм сделан заранее, чтобы
 * правило соблюдалось с первого дня, когда обёртку соберут: обёртка должна
 * дописать маркер ниже в свой User-Agent (в Capacitor — опция
 * `appendUserAgent`, в чистом WKWebView — `customUserAgent`).
 */
const IOS_APP_MARKER = "AqylApp/iOS";

export function isIosAppUA(ua: string): boolean {
  return ua.includes(IOS_APP_MARKER);
}

/**
 * `null` — ещё не определено (первый рендер и разметка с сервера).
 *
 * Платёжные элементы следует показывать только при строгом `=== false`.
 * Так они не мелькают на долю секунды в приложении: до выяснения не
 * рендерится ничего, а не «показать, потом убрать».
 */
export function useIsIosApp(): boolean | null {
  const [value, setValue] = useState<boolean | null>(null);
  useEffect(() => {
    setValue(typeof navigator === "undefined" ? false : isIosAppUA(navigator.userAgent));
  }, []);
  return value;
}
