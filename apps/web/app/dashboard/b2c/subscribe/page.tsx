"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import { getValidAccessToken } from "../../../../lib/auth";

const BRAND = "#6B5CE7";
const GREEN = "#2DC08E";
const DARK = "#0D0E1A";

type Plan = {
  months: number;
  title: string;
  total: number;
  discountLabel: string | null;
  popular?: boolean;
};

// Цены совпадают с backend (computeAmount): 4000₸/мес со скидками за период.
const PLANS: Plan[] = [
  { months: 1, title: "1 месяц", total: 4000, discountLabel: null },
  { months: 3, title: "3 месяца", total: 10800, discountLabel: "−10%", popular: true },
  { months: 12, title: "12 месяцев", total: 38400, discountLabel: "−20%" },
];

function formatTenge(n: number): string {
  return n.toLocaleString("ru-RU") + " ₸";
}

export default function SubscribePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<number>(3);
  const [loadingMonths, setLoadingMonths] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePay(months: number) {
    setError(null);
    setLoadingMonths(months);
    try {
      const token = await getValidAccessToken();
      if (!token) { router.replace("/login-teacher"); return; }
      const { paymentUrl } = await api.createPaymentSession(token, months);
      window.location.href = paymentUrl;
    } catch {
      setError("Не удалось создать платёж. Попробуйте позже.");
      setLoadingMonths(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: DARK, color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: BRAND, fontWeight: 800, fontSize: 20 }}>Aqyl</span>
        <button onClick={() => router.push("/dashboard/b2c")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>
          ← Назад
        </button>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px" }}>
        <h1 style={{ color: DARK, fontSize: 26, margin: "0 0 6px", textAlign: "center" }}>Оформление подписки</h1>
        <p style={{ color: "#6b7280", fontSize: 15, margin: "0 0 32px", textAlign: "center" }}>
          Полный доступ к генерации КМЖ, презентаций и материалов. Оплата через Kaspi.
        </p>

        {error && (
          <div style={{ background: "#fdeaea", border: "1px solid #e0575755", color: DARK, padding: "12px 16px", borderRadius: 10, marginBottom: 22, fontSize: 14, textAlign: "center" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {PLANS.map((plan) => {
            const active = selected === plan.months;
            const monthly = Math.round(plan.total / plan.months);
            return (
              <div
                key={plan.months}
                onClick={() => setSelected(plan.months)}
                style={{
                  position: "relative",
                  background: "#fff",
                  borderRadius: 16,
                  padding: "26px 22px",
                  cursor: "pointer",
                  border: `2px solid ${active ? BRAND : "#ececf3"}`,
                  boxShadow: active ? "0 10px 28px rgba(107,92,231,0.22)" : "0 4px 18px rgba(13,14,26,0.06)",
                  transition: "all 0.15s ease",
                }}
              >
                {plan.popular && (
                  <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: GREEN, color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 999, whiteSpace: "nowrap" }}>
                    Популярный
                  </span>
                )}
                <div style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 10 }}>{plan.title}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: DARK }}>{formatTenge(plan.total)}</span>
                  {plan.discountLabel && (
                    <span style={{ background: "#efeaff", color: BRAND, fontSize: 13, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>{plan.discountLabel}</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 22 }}>
                  {formatTenge(monthly)} в месяц
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePay(plan.months); }}
                  disabled={loadingMonths !== null}
                  style={{
                    width: "100%",
                    background: loadingMonths !== null ? "#c7c2e8" : BRAND,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: loadingMonths !== null ? "not-allowed" : "pointer",
                  }}
                >
                  {loadingMonths === plan.months ? "Переход к оплате…" : "Оплатить через Kaspi"}
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ color: "#9aa0ac", fontSize: 12, margin: "28px 0 0", textAlign: "center" }}>
          Оплата производится через сайт. Подписка продлевается вручную после каждого периода.
        </p>
      </main>
    </div>
  );
}
