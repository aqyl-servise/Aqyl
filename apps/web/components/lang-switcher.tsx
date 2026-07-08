"use client";
import type { Lang } from "../lib/lesson-translations";

const OPTS: { key: Lang; label: string }[] = [
  { key: "kz", label: "ҚАЗ" },
  { key: "ru", label: "РУ" },
  { key: "en", label: "EN" },
];

export function LangSwitcher({ lang, setLang, dark }: { lang: Lang; setLang: (l: Lang) => void; dark?: boolean }) {
  return (
    <div style={{ display: "inline-flex", gap: 2, background: dark ? "rgba(255,255,255,0.12)" : "#ececf3", borderRadius: 8, padding: 2 }}>
      {OPTS.map((o) => {
        const active = lang === o.key;
        return (
          <button
            key={o.key}
            onClick={() => setLang(o.key)}
            style={{
              border: "none", borderRadius: 6, padding: "4px 9px", fontSize: 12, cursor: "pointer", fontWeight: 700,
              background: active ? (dark ? "#6B5CE7" : "#fff") : "transparent",
              color: active ? (dark ? "#fff" : "#0D0E1A") : (dark ? "rgba(255,255,255,0.75)" : "#6b7280"),
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
