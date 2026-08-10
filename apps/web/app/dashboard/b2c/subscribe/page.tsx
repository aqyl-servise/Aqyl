"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import { getValidAccessToken } from "../../../../lib/auth";
import { useLang, LT } from "../../../../lib/lesson-translations";
import { LangSwitcher } from "../../../../components/lang-switcher";
import { useIsIosApp } from "../../../../lib/platform";

// Бренд-токены применяются через класс .aqyl-b2c на корне (см. globals.css).
const BRAND = "var(--lavender)";
const GREEN = "var(--mint)";
const DARK = "var(--white)";

type Plan = {
  months: number;
  titleKey: string;
  total: number;
  discountLabel: string | null;
  popular?: boolean;
};

// Цены совпадают с backend (computeAmount): 2990₸/мес со скидками за период.
// 3 мес = 2990×3×0.9 = 8073; 12 мес = 2990×12×0.8 = 28704.
const PLANS: Plan[] = [
  { months: 1, titleKey: "subM1", total: 2990, discountLabel: null },
  { months: 3, titleKey: "subM3", total: 8073, discountLabel: "−10%", popular: true },
  { months: 12, titleKey: "subM12", total: 28704, discountLabel: "−20%" },
];

function formatTenge(n: number): string {
  return n.toLocaleString("ru-RU") + " ₸";
}

export default function SubscribePage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  const [selected, setSelected] = useState<number>(3);
  const [loadingMonths, setLoadingMonths] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iosApp = useIsIosApp();

  async function handlePay(months: number) {
    setError(null);
    setLoadingMonths(months);
    try {
      const token = await getValidAccessToken();
      if (!token) { router.replace("/login"); return; }
      const { paymentUrl } = await api.createPaymentSession(token, months);
      window.location.href = paymentUrl;
    } catch {
      setError(t.subPayError);
      setLoadingMonths(null);
    }
  }

  // В iOS-обёртке страница не показывает ни тарифов, ни кнопок, ни ссылки на
  // оплату — только состояние подписки. См. lib/platform.ts.
  if (iosApp === true) {
    return (
      <div className="aqyl-b2c" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 10 }}>Подписка неактивна</h1>
          <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            Управление подпиской доступно в веб-версии Aqyl.
          </p>
          <button
            onClick={() => router.push("/dashboard/b2c")}
            style={{ marginTop: 18, background: "transparent", border: "1px solid var(--line)", color: "var(--white)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit" }}
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

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

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--white)", fontSize: 30, margin: "0 0 6px", textAlign: "center" }}>{t.subTitle}</h1>
        <p style={{ color: "var(--muted)", fontSize: 15, margin: "0 0 32px", textAlign: "center" }}>
          {t.subSubtitle}
        </p>

        {error && (
          <div style={{ background: "var(--ink-2)", border: "1px solid var(--danger)", color: "var(--white)", padding: "12px 16px", borderRadius: 10, marginBottom: 22, fontSize: 14, textAlign: "center" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        {/* Обязательство раздела 2.4, но по факту нашей механики: автосписания
            нет, Kaspi у нас разовый платёж. Обещать продление было бы неправдой. */}
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 18px" }}>
          Оплата разовая: деньги списываются один раз за выбранный период.
          Автоматического продления нет — повторно ничего не спишется.
          Мы напомним письмом за 3 дня до окончания.
        </p>
          {PLANS.map((plan) => {
            const active = selected === plan.months;
            const monthly = Math.round(plan.total / plan.months);
            return (
              <div
                key={plan.months}
                onClick={() => setSelected(plan.months)}
                style={{
                  position: "relative",
                  background: "var(--ink-2)",
                  borderRadius: 16,
                  padding: "26px 22px",
                  cursor: "pointer",
                  border: `2px solid ${active ? "var(--lavender)" : "var(--line)"}`,
                  boxShadow: active ? "0 10px 28px rgba(139,127,232,0.22)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {plan.popular && (
                  <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: GREEN, color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 999, whiteSpace: "nowrap" }}>
                    {t.subPopular}
                  </span>
                )}
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", marginBottom: 10 }}>{t[plan.titleKey]}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: "var(--white)" }}>{formatTenge(plan.total)}</span>
                  {plan.discountLabel && (
                    <span style={{ background: "rgba(139,127,232,.16)", color: "var(--lavender)", fontSize: 13, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>{plan.discountLabel}</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 22 }}>
                  {formatTenge(monthly)} {t.subPerMonth}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePay(plan.months); }}
                  disabled={loadingMonths !== null}
                  style={{
                    width: "100%",
                    background: "var(--amber)",
                    color: "var(--on-amber)",
                    opacity: loadingMonths !== null ? 0.6 : 1,
                    border: "none",
                    borderRadius: 10,
                    padding: "12px",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: loadingMonths !== null ? "not-allowed" : "pointer",
                  }}
                >
                  {loadingMonths === plan.months ? t.subPaying : t.subPay}
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ color: "var(--muted)", fontSize: 12, margin: "28px 0 0", textAlign: "center" }}>
          {t.subFooter}
        </p>
      </main>
    </div>
  );
}
