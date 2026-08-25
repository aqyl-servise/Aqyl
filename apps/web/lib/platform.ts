"use client";
import { useEffect, useState } from "react";

/**
 * Определение мобильной обёртки для правил магазинов приложений.
 *
 * И Apple, и Google требуют, чтобы доступ к платным возможностям внутри
 * приложения продавался через их встроенные покупки. Наши пакеты уроков
 * оплачиваются на сайте через Kaspi, а с встроенными покупками Kaspi
 * несовместим. Самая безопасная конфигурация: в приложении нет ни одной
 * кнопки, ведущей к оплате, и ни одного текста, предлагающего купить —
 * приложение лишь сообщает, что уроки закончились.
 *
 * Маркер дописывает сама обёртка в свой User-Agent: в Capacitor — опция
 * `appendUserAgent` (см. capacitor.config.ts в apps/mobile), в чистом
 * WKWebView — `customUserAgent`.
 */
const IOS_APP_MARKER = "AqylApp/iOS";
const ANDROID_APP_MARKER = "AqylApp/Android";

export function isIosAppUA(ua: string): boolean {
  return ua.includes(IOS_APP_MARKER);
}

export function isAndroidAppUA(ua: string): boolean {
  return ua.includes(ANDROID_APP_MARKER);
}

/** Любая мобильная обёртка: правило «без оплаты внутри» одинаково для обеих. */
export function isMobileAppUA(ua: string): boolean {
  return isIosAppUA(ua) || isAndroidAppUA(ua);
}

/**
 * `null` — ещё не определено (первый рендер и разметка с сервера).
 *
 * Платёжные элементы следует показывать только при строгом `=== false`.
 * Так они не мелькают на долю секунды в приложении: до выяснения не
 * рендерится ничего, а не «показать, потом убрать».
 */
function useUaFlag(test: (ua: string) => boolean): boolean | null {
  const [value, setValue] = useState<boolean | null>(null);
  useEffect(() => {
    setValue(typeof navigator === "undefined" ? false : test(navigator.userAgent));
    // test — стабильная функция модуля, в зависимостях не нужна
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

/**
 * Приложение любой платформы. Именно этот хук должны использовать экраны,
 * решающие, показывать ли цены и кнопки покупки.
 */
export function useIsMobileApp(): boolean | null {
  return useUaFlag(isMobileAppUA);
}

/** @deprecated используйте useIsMobileApp — правило одинаково для iOS и Android. */
export function useIsIosApp(): boolean | null {
  return useUaFlag(isMobileAppUA);
}
