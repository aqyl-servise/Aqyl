"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type B2CProfile, type Subscription, type LpLesson, type BalanceInfo } from "../../../lib/api";
import { getValidAccessToken, logout } from "../../../lib/auth";
import { useLang, LT } from "../../../lib/lesson-translations";
import { LangSwitcher } from "../../../components/lang-switcher";
import { Icon, type IconName } from "../../../components/ui/icon";
import { useIsIosApp } from "../../../lib/platform";

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
  const iosApp = useIsIosApp();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  const [profile, setProfile] = useState<B2CProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [topupBusy, setTopupBusy] = useState(false);
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
        const bal = await api.getBalance(token).catch(() => null);
        const list = await api.lpList(token).catch(() => [] as LpLesson[]);
        if (!active) return;
        setProfile(me); setSubscription(sub); setBalance(bal); setLessons(list);
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
  const isActive = status === "active" || balance?.subscriptionActive === true;
  // Доступ меряется уроками на балансе: триал + купленные пакеты (ТЗ №3).
  // Если остаток не удалось получить (сеть) — не запираем экран: настоящая
  // проверка всё равно на сервере, а ложная блокировка хуже лишнего показа.
  const totalLeft = balance?.total ?? null;
  const isTrial = !isActive && totalLeft !== null && totalLeft > 0;
  const isExpired = !isActive && totalLeft !== null && totalLeft <= 0;
  const hasPaid = (balance?.paidBalance ?? 0) > 0;
  // Апселл (ТЗ №3, п. 6.3): докупка появляется при остатке 1–2 платных уроков.
  const topup = balance?.packages.find((p) => p.upsellOnly);
  const showTopup = hasPaid && totalLeft !== null && totalLeft <= 2 && !!topup;
  const firstName = (profile.fullName || "").trim().split(" ")[0] || "";

  async function handleTopup() {
    if (!topup || topupBusy) return;
    setTopupBusy(true);
    try {
      const token = await getValidAccessToken();
      if (!token) { router.replace("/login"); return; }
      const { paymentUrl } = await api.createPackageSession(token, topup.code);
      window.location.href = paymentUrl;
    } catch { setTopupBusy(false); }
  }

  const pipeline = [t.pipeTopic, t.pipePlan, t.pipeWarmup, t.pipeExplain, t.pipeTask, t.pipeQuiz, t.pipeReflect];
  // Пункт подписки скрыт в iOS-обёртке: см. lib/platform.ts.
  const tools: { key: string; icon: IconName; label: string; href: string }[] = [
    { key: "materials", icon: "books", label: t.materials, href: "/dashboard/b2c/materials" },
    { key: "fl", icon: "chart", label: t.fl, href: "/dashboard/b2c/literacy" },
    ...(iosApp === false
      ? [{ key: "subscribe", icon: "card" as IconName, label: t.subscription, href: "/dashboard/b2c/subscribe" }]
      : []),
    { key: "help", icon: "help", label: t.help, href: "/dashboard/b2c/help" },
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
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", maxWidth: 1180, margin: "0 auto", padding: "26px 32px 0" }}>
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
          <button onClick={() => router.push("/dashboard/b2c/profile")} className="b2c-pill" style={{ ...ghost, display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="user" size={16} /> {t.profile}</button>
          <button onClick={handleLogout} className="b2c-pill" style={ghost}>{t.logout}</button>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 32px 80px" }}>
        {toast && (
          <div style={{ ...banner, borderColor: toast.kind === "success" ? "var(--mint)" : "var(--danger)", marginBottom: 22 }}>
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} aria-label={t.closeBtn} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "inline-flex", padding: 2 }}><Icon name="x-circle" size={17} /></button>
          </div>
        )}

        {isTrial && (
          <div style={{ ...banner, marginBottom: 24 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 11, color: "var(--muted)", fontSize: 15 }}>
              <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--amber)", boxShadow: "0 0 10px var(--amber)", flex: "none" }} />
              {hasPaid
                ? `${t.balLeft.replace("{n}", String(totalLeft ?? 0))}${balance?.expiresAt ? ` · ${t.balUntil.replace("{d}", new Date(balance.expiresAt).toLocaleDateString("ru-RU"))}` : ""}`
                : t.trialLeft.replace("{n}", String(totalLeft ?? 0))}
            </span>
            {/* Вторичное действие — не янтарь: единственный янтарь на экране закреплён за «Собрать урок». */}
            {iosApp === false && (
              showTopup && topup ? (
                <button onClick={handleTopup} disabled={topupBusy} style={{ ...btnSecondary, opacity: topupBusy ? 0.6 : 1 }}>
                  {t.balTopupHint.replace("{n}", String(topup.lessons)).replace("{p}", topup.priceKzt.toLocaleString("ru-RU"))}
                </button>
              ) : (
                <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={btnSecondary}>{t.getSub}</button>
              )
            )}
          </div>
        )}

        {isExpired ? (
          <section style={{ ...card, textAlign: "center", padding: "48px 24px" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 26, margin: "0 0 8px" }}>{t.balEmpty}</h2>
            <p style={{ color: "var(--muted)", fontSize: 15, margin: "0 0 22px" }}>{t.balEmptyHint}</p>
            {iosApp === false && (
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={btnPrimary}>{t.balBuy}</button>
                {/* Докупка в момент «всё кончилось» — главный апселл (ТЗ №3, п. 6.3). */}
                {hasPaid === false && topup && (
                  <button onClick={handleTopup} disabled={topupBusy} style={{ ...btnSecondary, opacity: topupBusy ? 0.6 : 1 }}>
                    {t.balTopup} +{topup.lessons} · {topup.priceKzt.toLocaleString("ru-RU")} ₸
                  </button>
                )}
              </div>
            )}
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
              {/* Постоянная подсказка: содержимое запроса уходит поставщику модели
                  за пределы РК. Без идентификаторов это не передача персональных
                  данных — поэтому просим не вписывать имена учеников. */}
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "10px auto 0", maxWidth: 820, textAlign: "left" }}>
                {t.noStudentNames}
              </p>
            </section>

            {/* ── Фирменный конвейер ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", overflowX: "auto", margin: "34px auto 0", maxWidth: 960, padding: "2px 2px 6px" }}>
              {/* Стрелка склеена со СЛЕДУЮЩИМ узлом: при переносе строки они
                  уезжают вместе, поэтому стрелка никогда не висит в конце строки. */}
              {pipeline.map((step, i) => (
                <span key={step} style={{ display: "inline-flex", alignItems: "center", flex: "none" }}>
                  {i > 0 && <span aria-hidden style={{ color: "var(--lavender)", opacity: 0.6, padding: "0 11px", fontSize: 15 }}>→</span>}
                  <span style={{
                    background: "var(--ink-2)", border: `1px solid ${i === 0 ? "var(--mint)" : "var(--line)"}`,
                    color: i === 0 ? "var(--mint)" : "var(--white)", borderRadius: 12, padding: "12px 18px",
                    fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
                    boxShadow: i === 0 ? "0 0 0 3px rgba(63,191,143,.12)" : undefined,
                  }}>{step}</span>
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
                  <div style={{ marginBottom: 10, color: "var(--lavender)" }}><Icon name="pencil" size={30} strokeWidth={1.4} /></div>
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
                    <Icon name={tool.icon} size={17} /> {tool.label}
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
