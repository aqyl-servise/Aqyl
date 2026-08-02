"use client";

import { useRouter } from "next/navigation";
import { useLang, LT } from "../../../../lib/lesson-translations";
import { LangSwitcher } from "../../../../components/lang-switcher";
import { Icon } from "../../../../components/ui/icon";

export default function HelpPage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  return (
    <div className="aqyl-b2c" style={{ minHeight: "100vh" }}>
      <header style={{ background: "var(--ink-2)", color: "var(--white)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--line)" }}>
        <button onClick={() => router.push("/dashboard/b2c")} style={{ background: "rgba(139,127,232,.12)", border: "1px solid var(--line)", color: "var(--white)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>← {t.back}</button>
        <span style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="help" size={18} /> {t.help}</span>
        <div style={{ marginLeft: "auto" }}><LangSwitcher lang={lang} setLang={setLang} dark /></div>
      </header>
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ background: "var(--ink-2)", borderRadius: 14, padding: "24px", border: "1px solid var(--line)", lineHeight: 1.7, color: "var(--white)", fontSize: 15 }}>
          <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontWeight: 600 }}>{t.helpH2}</h2>
          <p><b>{t.createLesson}</b> — {t.help1}</p>
          <p><b>{t.materials}</b> — {t.help2}</p>
          <p><b>{t.subscription}</b> — {t.help3}</p>
          <h3>{t.helpSupport}</h3>
          <p>{t.helpContact} <a href="mailto:support@aqyl-service.kz" style={{ color: "var(--lavender)" }}>support@aqyl-service.kz</a></p>
        </div>
      </main>
    </div>
  );
}
