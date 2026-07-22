"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type B2CProfile, type Subscription } from "../../../lib/api";
import { getValidAccessToken, logout } from "../../../lib/auth";
import { useLang, LT } from "../../../lib/lesson-translations";
import { LangSwitcher } from "../../../components/lang-switcher";

const BRAND = "#6B5CE7";
const GREEN = "#2DC08E";
const DARK = "#0D0E1A";

function daysLeft(date: string | null): number {
  if (!date) return 0;
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

interface BigButton { key: string; icon: string; title: string; subtitle: string; onClick: () => void; soon?: boolean }

export default function B2CDashboardPage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  const [profile, setProfile] = useState<B2CProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getValidAccessToken();
      if (!token) { router.replace("/login"); return; }
      try {
        const me = await api.getB2CMe(token);
        if (!active) return;
        if (!me.onboardingCompleted) { router.replace("/dashboard/b2c/onboarding"); return; }
        const sub = await api.getSubscription(token).catch(() => null);
        if (!active) return;
        setProfile(me); setSubscription(sub);
      } catch { if (active) router.replace("/login"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const action = params.get("action");
    if (payment === "success") setToast({ kind: "success", text: t.subActive });
    else if (payment === "failed") setToast({ kind: "error", text: "—" });
    if (payment || action) window.history.replaceState({}, "", "/dashboard/b2c");
    if (action === "create-lesson" || action === "create-kmzh") router.push("/dashboard/b2c/lesson");
  }, [router, t]);

  async function handleLogout() { await logout(); router.replace("/login"); }

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>{t.loading}</div>;
  if (!profile) return null;

  const status = subscription?.status ?? profile.subscriptionStatus;
  const trialLeft = daysLeft(subscription?.trialEndsAt ?? profile.trialEndsAt);
  const isActive = status === "active";
  const isTrial = status === "trial" && trialLeft > 0;
  const isExpired = status === "expired" || status === "cancelled" || (status === "trial" && trialLeft <= 0);

  const buttons: BigButton[] = [
    { key: "lesson", icon: "📝", title: t.createLesson, subtitle: t.createLessonSub, onClick: () => router.push("/dashboard/b2c/lesson") },
    { key: "materials", icon: "📚", title: t.materials, subtitle: t.materialsSub, onClick: () => router.push("/dashboard/b2c/materials") },
    { key: "fl", icon: "📊", title: t.fl, subtitle: t.litTitle, onClick: () => router.push("/dashboard/b2c/literacy") },
    { key: "subscribe", icon: "💳", title: t.subscription, subtitle: t.subscriptionSub, onClick: () => router.push("/dashboard/b2c/subscribe") },
    { key: "help", icon: "❓", title: t.help, subtitle: t.helpSub, onClick: () => router.push("/dashboard/b2c/help") },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: DARK, color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span style={{ color: BRAND, fontWeight: 800, fontSize: 20 }}>Aqyl</span>
          <span style={{ marginLeft: 14, fontSize: 14, opacity: 0.85 }}>{profile.fullName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LangSwitcher lang={lang} setLang={setLang} dark />
          <button onClick={() => router.push("/dashboard/b2c/profile")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>👤 {t.profile}</button>
          <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(107,92,231,0.25)" }}>{isActive ? t.subActive : isTrial ? t.subTrial : t.subLimited}</span>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>{t.logout}</button>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px" }}>
        {toast && (
          <div style={{ background: toast.kind === "success" ? "#e7f8f1" : "#fdeaea", border: `1px solid ${toast.kind === "success" ? GREEN : "#e05757"}55`, color: DARK, padding: "14px 18px", borderRadius: 12, marginBottom: 20, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b7280" }}>✕</button>
          </div>
        )}

        {isTrial && (
          <div style={{ background: "#efeaff", border: `1px solid ${BRAND}33`, color: DARK, padding: "16px 18px", borderRadius: 12, marginBottom: 24, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span>{t.trialLeft.replace("{n}", String(trialLeft))}</span>
            <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{t.getSub}</button>
          </div>
        )}

        {isExpired ? (
          <div style={{ background: "#fff", borderRadius: 14, padding: "40px 24px", textAlign: "center", boxShadow: "0 4px 18px rgba(13,14,26,0.08)" }}>
            <h2 style={{ color: DARK, fontSize: 20, margin: "0 0 8px" }}>{status === "trial" ? t.trialEnded : t.subExpired}</h2>
            <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px" }}>{t.subExpiredHint}</p>
            <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 10, padding: "12px 26px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>{t.extendSub}</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
            {buttons.map((b) => (
              <button key={b.key} onClick={b.onClick} style={{ position: "relative", textAlign: "left", background: "#fff", border: "1px solid #ececf3", borderRadius: 16, padding: "26px 22px", cursor: "pointer", boxShadow: "0 4px 18px rgba(13,14,26,0.06)", display: "flex", flexDirection: "column", gap: 8, minHeight: 120 }}>
                {b.soon && <span style={{ position: "absolute", top: 14, right: 14, fontSize: 11, fontWeight: 700, color: "#fff", background: "#f59e0b", borderRadius: 999, padding: "3px 9px" }}>{t.soon}</span>}
                <div style={{ fontSize: 34 }}>{b.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: DARK }}>{b.title}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{b.subtitle}</div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
