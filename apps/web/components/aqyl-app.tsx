"use client";

import { Language } from "../lib/translations";

/* ─── Lang switcher ─────────────────────────────────────────────────── */
export function LangSwitcher({ language, onChange }: { language: Language; onChange: (l: Language) => void }) {
  return (
    <div className="lang-switcher">
      {(["ru", "kz", "en"] as Language[]).map((l) => (
        <button key={l} className={`lang-btn${l === language ? " active" : ""}`} onClick={() => onChange(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
