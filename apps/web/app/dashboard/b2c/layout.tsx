"use client";

import { useEffect, useState } from "react";
import { useLang, LT } from "../../../lib/lesson-translations";

/**
 * Layout воронки B2C: управляет темой (светлая по умолчанию, тёмная — опционально)
 * независимо от глобальной темы B2G и ОС. Тёмная включается классом
 * .b2c-theme-dark на обёртке — токены .aqyl-b2c переопределяются в globals.css.
 * Тумблер плавающий (fixed) — работает на всех страницах воронки без их правок.
 */
export default function B2CLayout({ children }: { children: React.ReactNode }) {
  const [lang] = useLang();
  const t = LT[lang];
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try { setDark(localStorage.getItem("aqyl-b2c-theme") === "dark"); } catch { /* ignore */ }
  }, []);

  function toggle() {
    setDark((d) => {
      const next = !d;
      try { localStorage.setItem("aqyl-b2c-theme", next ? "dark" : "light"); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <div className={dark ? "b2c-theme-dark" : undefined}>
      {children}
      <button
        type="button"
        onClick={toggle}
        className="b2c-theme-fab"
        aria-label={dark ? t.themeLight : t.themeDark}
        title={dark ? t.themeLight : t.themeDark}
      >
        {mounted && dark ? "☀️" : "🌙"}
      </button>
    </div>
  );
}
