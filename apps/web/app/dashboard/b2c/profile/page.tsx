"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getValidAccessToken, logout } from "../../../../lib/auth";
import { api, type B2CProfile } from "../../../../lib/api";
import { useLang, LT } from "../../../../lib/lesson-translations";
import { LangSwitcher } from "../../../../components/lang-switcher";
import { Icon } from "../../../../components/ui/icon";

// Бренд-токены применяются через класс .aqyl-b2c на корне (см. globals.css).
const BRAND = "var(--amber)";
const DARK = "var(--white)";

export default function ProfilePage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  const [profile, setProfile] = useState<B2CProfile | null>(null);

  useEffect(() => {
    (async () => {
      const tk = await getValidAccessToken();
      if (!tk) { router.replace("/login"); return; }
      try { setProfile(await api.getB2CMe(tk)); } catch { router.replace("/login"); }
    })();
  }, [router]);

  const row = (l: string, v: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 15 }}>
      <span style={{ color: "var(--muted)" }}>{l}</span><span style={{ color: "var(--white)", fontWeight: 600 }}>{v || "—"}</span>
    </div>
  );

  return (
    <div className="aqyl-b2c" style={{ minHeight: "100vh" }}>
      <header style={{ background: "var(--ink-2)", color: "var(--white)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--line)" }}>
        <button onClick={() => router.push("/dashboard/b2c")} style={{ background: "rgba(139,127,232,.12)", border: "1px solid var(--line)", color: "var(--white)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>← {t.back}</button>
        <span style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="user" size={18} /> {t.profile}</span>
        <div style={{ marginLeft: "auto" }}><LangSwitcher lang={lang} setLang={setLang} dark /></div>
      </header>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "28px 24px" }}>
        {!profile ? <div style={{ color: "var(--muted)" }}>{t.loading}</div> : (
          <div style={{ background: "var(--ink-2)", borderRadius: 14, padding: "24px", border: "1px solid var(--line)" }}>
            {row(t.pName, profile.fullName)}
            {row(t.pEmail, profile.email)}
            {row(t.pSubject, profile.subject ?? "")}
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={{ background: BRAND, color: "var(--on-amber)", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>{t.subscription}</button>
              <button onClick={async () => { await logout(); router.replace("/login"); }} style={{ background: "transparent", border: "1.5px solid var(--lavender)", color: "var(--white)", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>{t.logout}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
