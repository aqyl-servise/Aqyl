"use client";

import { useRouter } from "next/navigation";
import { useLang, LT } from "../../../../lib/lesson-translations";
import { LangSwitcher } from "../../../../components/lang-switcher";

const DARK = "#0D0E1A";

export default function HelpPage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: DARK, color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.push("/dashboard/b2c")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>← {t.back}</button>
        <span style={{ fontWeight: 700 }}>❓ {t.help}</span>
        <div style={{ marginLeft: "auto" }}><LangSwitcher lang={lang} setLang={setLang} dark /></div>
      </header>
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 4px 18px rgba(13,14,26,0.06)", lineHeight: 1.7, color: DARK, fontSize: 15 }}>
          <h2 style={{ marginTop: 0 }}>{t.helpH2}</h2>
          <p><b>{t.createLesson}</b> — {t.help1}</p>
          <p><b>{t.materials}</b> — {t.help2}</p>
          <p><b>{t.subscription}</b> — {t.help3}</p>
          <h3>{t.helpSupport}</h3>
          <p>{t.helpContact} <a href="mailto:support@aqyl-service.kz">support@aqyl-service.kz</a></p>
        </div>
      </main>
    </div>
  );
}
