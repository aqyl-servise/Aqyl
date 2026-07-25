"use client";
import type { Lang } from "../lib/lesson-translations";

const OPTS: { key: Lang; label: string }[] = [
  { key: "kz", label: "ҚАЗ" },
  { key: "ru", label: "РУ" },
  { key: "en", label: "EN" },
];

// Свитчер языка воронки B2C. Цвета — через токены .aqyl-b2c, поэтому
// адаптируется к светлой/тёмной теме автоматически. Проп `dark` больше не нужен
// (оставлен для обратной совместимости сигнатуры), стили от него не зависят.
export function LangSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void; dark?: boolean }) {
  return (
    <div style={{ display: "inline-flex", gap: 2, background: "rgba(139,127,232,.14)", borderRadius: 8, padding: 2 }}>
      {OPTS.map((o) => {
        const active = lang === o.key;
        return (
          <button
            key={o.key}
            onClick={() => setLang(o.key)}
            style={{
              border: "none", borderRadius: 6, padding: "4px 9px", fontSize: 12, cursor: "pointer", fontWeight: 700,
              fontFamily: "inherit",
              background: active ? "var(--lavender)" : "transparent",
              color: active ? "#fff" : "var(--muted)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
