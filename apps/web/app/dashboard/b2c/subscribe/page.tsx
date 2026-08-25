"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type BalanceInfo, type LessonPackage, type PackageSessionResponse } from "../../../../lib/api";
import { getValidAccessToken } from "../../../../lib/auth";
import { useLang, LT } from "../../../../lib/lesson-translations";
import { LangSwitcher } from "../../../../components/lang-switcher";
import { useIsIosApp } from "../../../../lib/platform";

// Бренд-токены применяются через класс .aqyl-b2c на корне (см. globals.css).
const GREEN = "var(--mint)";

/**
 * Витрина пакетов уроков (ТЗ №3, п. 6.1). Каталог и цены приходят с сервера
 * (GET /billing/balance) — фронт ничего не хардкодит. Докупка (upsellOnly)
 * на витрине не показывается: она живёт в апселл-моментах на дашборде.
 */

function formatTenge(n: number): string {
  return n.toLocaleString("ru-RU") + " ₸";
}

/** «3 урока / 10 уроков»: русские формы, у kz/en — единая форма из словаря. */
function lessonsWord(n: number, t: Record<string, string>): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return t.pkgLessons1;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return t.pkgLessons234;
  return t.pkgLessons;
}

export default function SubscribePage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  const [info, setInfo] = useState<BalanceInfo | null>(null);
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [order, setOrder] = useState<PackageSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iosApp = useIsIosApp();

  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getValidAccessToken();
      if (!token) { router.replace("/login"); return; }
      const data = await api.getBalance(token).catch(() => null);
      if (active) setInfo(data);
    })();
    return () => { active = false; };
  }, [router]);

  async function handlePay(code: string) {
    setError(null);
    setLoadingCode(code);
    try {
      const token = await getValidAccessToken();
      if (!token) { router.replace("/login"); return; }
      const session = await api.createPackageSession(token, code);
      // Ручная схема (у Kaspi нет API-интеграции при нашем обороте): показываем
      // инструкцию с номером заказа, а не уводим на несуществующий шлюз.
      if (session.manual) {
        setOrder(session);
        setLoadingCode(null);
        return;
      }
      window.location.href = session.paymentUrl;
    } catch {
      setError(t.subPayError);
      setLoadingCode(null);
    }
  }

  // В iOS-обёртке страница не показывает ни цен, ни кнопок оплаты (App Store).
  if (iosApp === true) {
    return (
      <div className="aqyl-b2c" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 10 }}>{t.balEmpty}</h1>
          <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            Управление пакетами доступно в веб-версии Aqyl.
          </p>
          <button
            onClick={() => router.push("/dashboard/b2c")}
            style={{ marginTop: 18, background: "transparent", border: "1px solid var(--line)", color: "var(--white)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit" }}
          >
            ← {t.back}
          </button>
        </div>
      </div>
    );
  }

  // Заявка создана: показываем инструкцию оплаты вместо витрины.
  if (order) {
    return (
      <div className="aqyl-b2c" style={{ minHeight: "100vh" }}>
        <header style={{ background: "var(--ink-2)", color: "var(--white)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }}>aqy<span style={{ color: "var(--amber)" }}>l</span></span>
          <button onClick={() => setOrder(null)} style={{ background: "rgba(139,127,232,.12)", border: "1px solid var(--line)", color: "var(--white)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            ← {t.back}
          </button>
        </header>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "36px 24px" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 26, margin: "0 0 8px" }}>{t.payTitle}</h1>
          <p style={{ color: "var(--muted)", fontSize: 15, margin: "0 0 24px" }}>{t.paySub}</p>

          <div style={{ background: "var(--ink-2)", border: "1px solid var(--line)", borderRadius: 16, padding: "22px 24px", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "var(--muted)", fontSize: 14 }}>{t.payAmount}</span>
              <b style={{ fontSize: 20 }}>{formatTenge(order.amount)}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "var(--muted)", fontSize: 14 }}>{t.payLessons}</span>
              <b>{order.lessons}</b>
            </div>
            <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 12 }}>
              <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 6 }}>{t.payOrder}</div>
              <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "var(--mint)", wordBreak: "break-all" }}>{order.orderId}</div>
            </div>
          </div>

          <ol style={{ color: "var(--white)", fontSize: 15, lineHeight: 1.7, paddingLeft: 20, margin: "0 0 22px" }}>
            <li>{t.payStep1}</li>
            <li>{t.payStep2.replace("{o}", order.orderId)}</li>
            <li>{t.payStep3}</li>
          </ol>

          <a
            href={order.paymentUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", textAlign: "center", background: "var(--amber)", color: "var(--on-amber)", borderRadius: 11, padding: "14px", fontWeight: 800, fontSize: 16, textDecoration: "none" }}
          >
            {t.payOpen}
          </a>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 18, textAlign: "center" }}>{t.payWait}</p>
        </main>
      </div>
    );
  }

  const packages = (info?.packages ?? []).filter((p) => !p.upsellOnly);
  const whoKey = (p: LessonPackage) => (t as Record<string, string>)[`pkgWho_${p.code}`] ?? "";

  return (
    <div className="aqyl-b2c" style={{ minHeight: "100vh" }}>
      <header style={{ background: "var(--ink-2)", color: "var(--white)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }}>aqy<span style={{ color: "var(--amber)" }}>l</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LangSwitcher lang={lang} setLang={setLang} />
          <button onClick={() => router.push("/dashboard/b2c")} style={{ background: "rgba(139,127,232,.12)", border: "1px solid var(--line)", color: "var(--white)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            ← {t.back}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "36px 24px 60px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--white)", fontSize: 30, margin: "0 0 6px", textAlign: "center" }}>{t.subTitle}</h1>
        <p style={{ color: "var(--muted)", fontSize: 15, margin: "0 0 10px", textAlign: "center", maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
          {t.subSubtitle}
        </p>

        {info && info.total > 0 && (
          <p style={{ textAlign: "center", color: "var(--mint)", fontSize: 14, fontWeight: 700, margin: "0 0 26px" }}>
            {t.balLeft.replace("{n}", String(info.total))}
            {info.expiresAt ? ` · ${t.balUntil.replace("{d}", new Date(info.expiresAt).toLocaleDateString("ru-RU"))}` : ""}
          </p>
        )}

        {error && (
          <div style={{ background: "var(--ink-2)", border: "1px solid var(--danger)", color: "var(--white)", padding: "12px 16px", borderRadius: 10, margin: "0 0 22px", fontSize: 14, textAlign: "center" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, marginTop: 18 }}>
          {packages.map((pkg) => {
            const popular = pkg.code === "p30";
            const perLesson = Math.round(pkg.priceKzt / pkg.lessons);
            return (
              <div
                key={pkg.code}
                style={{
                  position: "relative",
                  background: "var(--ink-2)",
                  borderRadius: 16,
                  padding: "26px 22px",
                  display: "flex",
                  flexDirection: "column",
                  border: `2px solid ${popular ? "var(--lavender)" : "var(--line)"}`,
                  boxShadow: popular ? "0 10px 28px rgba(139,127,232,0.22)" : "none",
                }}
              >
                {popular && (
                  <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: GREEN, color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 999, whiteSpace: "nowrap" }}>
                    {t.subPopular}
                  </span>
                )}
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--white)", marginBottom: 8 }}>
                  {pkg.lessons} {lessonsWord(pkg.lessons, t)}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: "var(--white)" }}>{formatTenge(pkg.priceKzt)}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
                  {perLesson.toLocaleString("ru-RU")} ₸ {t.subPerLesson}
                </div>
                <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5, borderTop: "1px dashed var(--line)", paddingTop: 10, marginBottom: 18, flexGrow: 1 }}>
                  {whoKey(pkg)}
                </div>
                <button
                  onClick={() => handlePay(pkg.code)}
                  disabled={loadingCode !== null}
                  style={{
                    width: "100%",
                    background: popular ? "var(--amber)" : "transparent",
                    color: popular ? "var(--on-amber)" : "var(--white)",
                    opacity: loadingCode !== null ? 0.6 : 1,
                    border: popular ? "none" : "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "12px",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: loadingCode !== null ? "not-allowed" : "pointer",
                  }}
                >
                  {loadingCode === pkg.code ? t.subPaying : t.subPay}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 34 }}>
          {[t.pkgRule1, t.pkgRule2, t.pkgRule3].map((rule, i) => (
            <div key={i} style={{ borderLeft: "2px solid var(--lavender)", paddingLeft: 14, color: "var(--muted)", fontSize: 13.5, lineHeight: 1.55 }}>
              {rule}
            </div>
          ))}
        </div>

        <p style={{ color: "var(--muted)", fontSize: 12, margin: "28px 0 0", textAlign: "center" }}>
          {t.subFooter}
        </p>
      </main>
    </div>
  );
}
