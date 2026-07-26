"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type B2CProfile, type Subscription, type LpLesson } from "../../../lib/api";
import { getValidAccessToken, logout } from "../../../lib/auth";
import { useLang, LT } from "../../../lib/lesson-translations";
import { LangSwitcher } from "../../../components/lang-switcher";

function daysLeft(date: string | null): number {
  if (!date) return 0;
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

// Знак Aqyl — три штриха собираются в одну вершину (буква A).
function AqylMark({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 112 112" width={size} height={size} role="img" aria-label="Aqyl">
      <rect x="2" y="2" width="108" height="108" rx="26" fill="var(--indigo)" />
      <path d="M56 26 L34 84" stroke="var(--lavender)" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M56 26 L78 84" stroke="var(--mint)" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M44 60 L68 60" stroke="var(--amber)" strokeWidth="11" strokeLinecap="round" fill="none" />
      <circle cx="56" cy="26" r="6.5" fill="var(--white)" />
    </svg>
  );
}

export default function B2CDashboardPage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  const [profile, setProfile] = useState<B2CProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [lessons, setLessons] = useState<LpLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("");
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
        const list = await api.lpList(token).catch(() => [] as LpLesson[]);
        if (!active) return;
        setProfile(me); setSubscription(sub); setLessons(list);
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
  function buildLesson() {
    const q = topic.trim();
    router.push(q ? `/dashboard/b2c/lesson?topic=${encodeURIComponent(q)}` : "/dashboard/b2c/lesson");
  }

  if (loading) return <div className="aqyl-b2c" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>{t.loading}</div>;
  if (!profile) return null;

  const status = subscription?.status ?? profile.subscriptionStatus;
  const trialLeft = daysLeft(subscription?.trialEndsAt ?? profile.trialEndsAt);
  const isActive = status === "active";
  const isTrial = status === "trial" && trialLeft > 0;
  const isExpired = status === "expired" || status === "cancelled" || (status === "trial" && trialLeft <= 0);
  const firstName = (profile.fullName || "").trim().split(" ")[0] || "";

  const pipeline = [t.pipeTopic, t.pipePlan, t.pipeWarmup, t.pipeExplain, t.pipeTask, t.pipeQuiz, t.pipeReflect];
  const tools = [
    { key: "materials", icon: "📚", label: t.materials, href: "/dashboard/b2c/materials" },
    { key: "fl", icon: "📊", label: t.fl, href: "/dashboard/b2c/literacy" },
    { key: "subscribe", icon: "💳", label: t.subscription, href: "/dashboard/b2c/subscribe" },
    { key: "help", icon: "❓", label: t.help, href: "/dashboard/b2c/help" },
  ];
  const STT: Record<string, { label: string; color: string }> = {
    draft: { label: t.stt_draft, color: "var(--muted)" },
    generating: { label: t.stt_generating, color: "var(--lavender)" },
    ready: { label: t.stt_ready, color: "var(--mint)" },
    error: { label: t.stt_error, color: "var(--danger)" },
  };

  return (
    <div className="aqyl-b2c b2c-depth">
      {/* ── Шапка ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "22px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span style={{ display: "inline-flex", filter: "drop-shadow(0 6px 16px rgba(59,46,126,.5))" }}><AqylMark size={52} /></span>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-.02em" }}>aqy<span style={{ color: "var(--amber)" }}>l</span></div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 1 }}>{t.hello}{firstName ? `, ${firstName}` : ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <LangSwitcher lang={lang} setLang={setLang} dark />
          <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 999, background: "rgba(139,127,232,.16)", color: "var(--lavender)", fontWeight: 700 }}>{isActive ? t.subActive : isTrial ? t.subTrial : t.subLimited}</span>
          <button onClick={() => router.push("/dashboard/b2c/profile")} className="b2c-pill" style={ghost}>👤 {t.profile}</button>
          <button onClick={handleLogout} className="b2c-pill" style={ghost}>{t.logout}</button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" }}>
        {toast && (
          <div style={{ ...banner, borderColor: toast.kind === "success" ? "var(--mint)" : "var(--danger)", marginBottom: 22 }}>
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--muted)" }}>✕</button>
          </div>
        )}

        {isTrial && (
          <div style={{ ...banner, marginBottom: 24 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 11, color: "var(--muted)", fontSize: 15 }}>
              <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--amber)", boxShadow: "0 0 10px var(--amber)", flex: "none" }} />
              {t.trialLeft.replace("{n}", String(trialLeft))}
            </span>
            {/* Вторичное действие — не янтарь: единственный янтарь на экране закреплён за «Собрать урок». */}
            <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={btnSecondary}>{t.getSub}</button>
          </div>
        )}

        {isExpired ? (
          <section style={{ ...card, textAlign: "center", padding: "48px 24px" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 26, margin: "0 0 8px" }}>{status === "trial" ? t.trialEnded : t.subExpired}</h2>
            <p style={{ color: "var(--muted)", fontSize: 15, margin: "0 0 22px" }}>{t.subExpiredHint}</p>
            <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={btnPrimary}>{t.extendSub}</button>
          </section>
        ) : (
          <>
            {/* ── Сердце дашборда: ввод темы ── */}
            <section style={{ textAlign: "center", marginBottom: 30 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(40px,6vw,68px)", letterSpacing: "-.02em", color: "var(--white)", margin: "44px 0 0" }}>{t.heroTitle}</h1>
              <p style={{ color: "var(--muted)", fontSize: 19, lineHeight: 1.5, maxWidth: 560, margin: "16px auto 0" }}>{t.heroSub}</p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", maxWidth: 820, margin: "40px auto 0", alignItems: "stretch" }}>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") buildLesson(); }}
                  placeholder={t.topicPlaceholder}
                  aria-label={t.heroTitle}
                  className="b2c-field"
                  style={inputStyle}
                />
                <button onClick={buildLesson} className="b2c-main-btn" style={{ ...btnPrimary, flex: "none" }}>{t.buildLesson} →</button>
              </div>
            </section>

            {/* ── Фирменный конвейер ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", overflowX: "auto", margin: "34px auto 0", maxWidth: 960, padding: "2px 2px 6px" }}>
              {pipeline.map((step, i) => (
                <span key={step} style={{ display: "inline-flex", alignItems: "center", flex: "none" }}>
                  <span style={{
                    background: "var(--ink-2)", border: `1px solid ${i === 0 ? "var(--mint)" : "var(--line)"}`,
                    color: i === 0 ? "var(--mint)" : "var(--white)", borderRadius: 12, padding: "12px 18px",
                    fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
                    boxShadow: i === 0 ? "0 0 0 3px rgba(63,191,143,.12)" : undefined,
                  }}>{step}</span>
                  {i < pipeline.length - 1 && <span aria-hidden style={{ color: "var(--lavender)", opacity: 0.6, padding: "0 11px", fontSize: 15 }}>→</span>}
                </span>
              ))}
            </div>

            {/* ── Мои уроки ── */}
            <section style={{ marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "64px 0 20px" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, color: "var(--white)", margin: 0 }}>{t.myLessons}</h2>
                {lessons.length > 0 && <button onClick={() => router.push("/dashboard/b2c/materials")} style={linkBtn}>{t.materials} →</button>}
              </div>
              {lessons.length === 0 ? (
                <div style={{ ...card, textAlign: "center", padding: "36px 24px" }}>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>📝</div>
                  <p style={{ color: "var(--muted)", margin: "0 0 18px", fontSize: 15 }}>{t.myLessonsEmpty}</p>
                  {/* Вторичная кнопка: единственный янтарь на экране — «Собрать урок» в герое. */}
                  <button onClick={buildLesson} style={btnSecondary}>{t.buildLesson} →</button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 16 }}>
                  {lessons.slice(0, 6).map((l) => {
                    const st = STT[l.status] ?? STT.draft;
                    const subj = [l.subject, l.grade ? `${l.grade} ${t.gradeWord}` : null].filter(Boolean).join(" · ");
                    return (
                      <button key={l.id} onClick={() => router.push("/dashboard/b2c/materials")} className="b2c-lcard" style={{ ...card, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 0 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--mint)" }}>
                          <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--mint)", flex: "none" }} />
                          {subj || t.untitled}
                        </span>
                        <h4 style={{ fontSize: 17, fontWeight: 700, color: "var(--white)", margin: "10px 0 6px" }}>{l.lessonTitle?.trim() || t.untitled}</h4>
                        <div style={{ fontSize: 13, color: "var(--muted)", display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ color: st.color, fontWeight: 700 }}>{st.label}</span>
                          <span>{l.updatedAt ? new Date(l.updatedAt).toLocaleDateString() : ""}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Вторичные инструменты ── */}
            <section style={{ marginTop: 34 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>{t.moreTools}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {tools.map((tool) => (
                  <button key={tool.key} onClick={() => router.push(tool.href)} className="b2c-tool" style={toolBtn}>
                    <span style={{ fontSize: 16 }}>{tool.icon}</span> {tool.label}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const ghost: React.CSSProperties = { background: "rgba(139,127,232,.06)", border: "1px solid var(--line)", color: "var(--white)", borderRadius: 12, padding: "10px 17px", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit" };
const banner: React.CSSProperties = { background: "var(--ink-2)", border: "1px solid var(--line)", color: "var(--white)", padding: "20px 24px", borderRadius: 18, fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap" };
const card: React.CSSProperties = { background: "var(--ink-2)", border: "1px solid var(--line)", borderRadius: 18, padding: 20 };
// Единственное главное действие на экране — янтарь со свечением снизу.
const btnPrimary: React.CSSProperties = { background: "var(--amber)", color: "var(--on-amber)", border: "none", borderRadius: 18, padding: "0 30px", minHeight: 56, fontSize: 17, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 12px 34px rgba(245,166,35,.34)" };
const btnSecondary: React.CSSProperties = { background: "transparent", color: "var(--white)", border: "1.5px solid var(--lavender)", borderRadius: 12, padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" };
const toolBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(139,127,232,.07)", color: "var(--muted)", border: "1px solid var(--line)", borderRadius: 12, padding: "13px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "var(--lavender)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
const inputStyle: React.CSSProperties = { flex: 1, minWidth: 240, background: "var(--ink)", border: "1.5px solid var(--line)", borderRadius: 18, padding: "22px 24px", color: "var(--white)", fontFamily: "inherit", fontSize: 18 };
