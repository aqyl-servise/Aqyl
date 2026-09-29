"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type MyReferral } from "../../../../lib/api";
import { getValidAccessToken } from "../../../../lib/auth";
import { useLang, LT } from "../../../../lib/lesson-translations";
import { LangSwitcher } from "../../../../components/lang-switcher";
import { Icon } from "../../../../components/ui/icon";

/**
 * Пригласить коллегу: ссылка с кодом, кнопки «поделиться» и сколько уже
 * получено. Учителя делятся инструментами в школьных чатах — это и есть канал,
 * поэтому главное здесь — одна кнопка копирования и готовый текст для WhatsApp.
 */
export default function InvitePage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  const [data, setData] = useState<MyReferral | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getValidAccessToken();
      if (!token) { router.replace("/login"); return; }
      try { const d = await api.myReferral(token); if (active) setData(d); }
      catch { if (active) setError(true); }
    })();
    return () => { active = false; };
  }, [router]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://aqyl-service.kz";
  // Казахский интерфейс — ссылка на казахскую витрину.
  const link = data ? `${origin}${lang === "kz" ? "/kz" : "/"}?ref=${data.code}` : "";
  const shareText = `${t.invShareText} ${link}`;
  const n = String(data?.bonus ?? 5);

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { window.prompt(t.invLinkLabel, link); }
  }

  return (
    <div className="aqyl-b2c" style={{ minHeight: "100vh" }}>
      <header style={{ background: "var(--ink-2)", color: "var(--white)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--line)" }}>
        <button onClick={() => router.push("/dashboard/b2c")} style={backBtn}>← {t.back}</button>
        <span style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="users" size={18} /> {t.invite}</span>
        <div style={{ marginLeft: "auto" }}><LangSwitcher lang={lang} setLang={setLang} dark /></div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 64px", color: "var(--white)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(26px,4.5vw,38px)", margin: "0 0 12px", letterSpacing: "-.01em" }}>
          {t.invTitle.replace("{n}", n)}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.6, margin: "0 0 26px" }}>{t.invSub.replace("{n}", n)}</p>

        {error && <div style={{ ...card, color: "var(--danger)" }}>—</div>}
        {!data && !error && <div style={{ color: "var(--muted)" }}>{t.loading}</div>}

        {data && (
          <>
            <section style={card}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{t.invLinkLabel}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label={t.invLinkLabel}
                  style={{ flex: 1, minWidth: 0, background: "var(--ink)", border: "1.5px solid var(--line)", borderRadius: 12, padding: "13px 14px", color: "var(--white)", fontFamily: "inherit", fontSize: 15 }} />
                <button onClick={copy} style={btnPrimary}>{copied ? t.invCopied : t.invCopy}</button>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" style={shareBtn}>
                  <Icon name="message" size={16} /> WhatsApp
                </a>
                <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(t.invShareText)}`} target="_blank" rel="noopener noreferrer" style={shareBtn}>
                  <Icon name="message" size={16} /> Telegram
                </a>
              </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginTop: 16 }}>
              <Stat label={t.invInvited} value={data.invited} />
              <Stat label={t.invWaiting} value={data.waiting} />
              <Stat label={t.invEarned} value={data.lessonsEarned} accent />
            </section>

            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginTop: 18 }}>
              {t.invRules.replace("{cap}", String(data.cap))}
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: accent ? "var(--mint)" : "var(--white)" }}>{value}</div>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--ink-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 18 };
const backBtn: React.CSSProperties = { background: "rgba(139,127,232,.12)", border: "1px solid var(--line)", color: "var(--white)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" };
const btnPrimary: React.CSSProperties = { background: "var(--amber)", color: "var(--on-amber)", border: "none", borderRadius: 12, padding: "0 22px", minHeight: 48, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
const shareBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "var(--white)", border: "1.5px solid var(--lavender)", borderRadius: 12, padding: "10px 18px", fontSize: 14, fontWeight: 700, textDecoration: "none" };
