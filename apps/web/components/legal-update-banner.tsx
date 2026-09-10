"use client";

import { useEffect, useState } from "react";
import { Icon } from "./ui/icon";
import { LEGAL_NOTICE } from "../lib/legal-docs";

/** Ключ закрытия: значение — id редакции, чтобы новая редакция показалась снова. */
const STORAGE_KEY = "aqyl-legal-notice-dismissed";

/**
 * Плашка «документы обновлены» для вошедших пользователей — уведомление
 * «в интерфейсе» по п. 13.2 оферты. Текст, срок показа и id редакции лежат
 * рядом с самими документами в LEGAL_NOTICE.
 *
 * До монтирования не рендерится: решение зависит от localStorage и текущей
 * даты, а сервер о них не знает — иначе разметка сервера и клиента разошлись бы.
 */
export function LegalUpdateBanner({ strip = false }: { strip?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Date.now() > new Date(`${LEGAL_NOTICE.hideAfter}T23:59:59`).getTime()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === LEGAL_NOTICE.id) return;
    } catch {
      /* приватный режим — просто покажем плашку */
    }
    setVisible(true);
  }, []);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, LEGAL_NOTICE.id); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className={`legal-notice${strip ? " is-strip" : ""}`} role="status">
      <Icon name="file" size={18} />
      <span>
        {LEGAL_NOTICE.text}{" "}
        <a href="/terms" target="_blank" rel="noopener">Соглашение</a>
        {" · "}
        <a href="/privacy" target="_blank" rel="noopener">Политика</a>
      </span>
      <button type="button" className="legal-notice-close" onClick={dismiss} aria-label="Закрыть уведомление">×</button>
    </div>
  );
}
