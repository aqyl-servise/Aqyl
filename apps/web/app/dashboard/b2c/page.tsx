"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type B2CProfile, type Subscription } from "../../../lib/api";
import { getValidAccessToken, logout } from "../../../lib/auth";

const BRAND = "#6B5CE7";
const GREEN = "#2DC08E";
const DARK = "#0D0E1A";

function daysLeft(date: string | null): number {
  if (!date) return 0;
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

interface BigButton {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  soon?: boolean;
}

export default function B2CDashboardPage() {
  const router = useRouter();
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
        setProfile(me);
        setSubscription(sub);
      } catch {
        if (active) router.replace("/login");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  // ?payment=... (Kaspi) и ?action=create-lesson (из онбординга) → сразу к генератору.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const action = params.get("action");
    if (payment === "success") setToast({ kind: "success", text: "Оплата прошла успешно. Подписка активирована." });
    else if (payment === "failed") setToast({ kind: "error", text: "Оплата не прошла. Попробуйте ещё раз." });
    if (payment || action) window.history.replaceState({}, "", "/dashboard/b2c");
    if (action === "create-lesson" || action === "create-kmzh") router.push("/dashboard/b2c/lesson");
  }, [router]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>Загрузка…</div>;
  }
  if (!profile) return null;

  const status = subscription?.status ?? profile.subscriptionStatus;
  const trialLeft = daysLeft(subscription?.trialEndsAt ?? profile.trialEndsAt);
  const isActive = status === "active";
  const isTrial = status === "trial" && trialLeft > 0;
  const isExpired = status === "expired" || status === "cancelled" || (status === "trial" && trialLeft <= 0);

  // 5 крупных кнопок (ТЗ раздел 2). Без Визуализатора/Адаптации/Профиля на главной.
  const buttons: BigButton[] = [
    { key: "lesson", icon: "📝", title: "Создать урок", subtitle: "Краткосрочный план урока (КСП)", onClick: () => router.push("/dashboard/b2c/lesson") },
    { key: "materials", icon: "📚", title: "Мои материалы", subtitle: "Сохранённые уроки и задания", onClick: () => router.push("/dashboard/b2c/materials") },
    { key: "fl", icon: "📊", title: "Функциональная грамотность", subtitle: "Скоро", soon: true, onClick: () => setToast({ kind: "success", text: "Модуль в разработке — скоро." }) },
    { key: "subscribe", icon: "💳", title: "Подписка", subtitle: "Тарифы и оплата", onClick: () => router.push("/dashboard/b2c/subscribe") },
    { key: "help", icon: "❓", title: "Помощь", subtitle: "Справка и поддержка", onClick: () => router.push("/dashboard/b2c/help") },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: DARK, color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ color: BRAND, fontWeight: 800, fontSize: 20 }}>Aqyl</span>
          <span style={{ marginLeft: 14, fontSize: 14, opacity: 0.85 }}>{profile.fullName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => router.push("/dashboard/b2c/profile")}
            title="Профиль"
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
          >
            👤 Профиль
          </button>
          <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(107,92,231,0.25)" }}>
            {isActive ? "Подписка активна" : isTrial ? "Пробный период" : "Доступ ограничен"}
          </span>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>
            Выйти
          </button>
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
            <span>Пробный период: осталось <strong>{trialLeft}</strong> {trialLeft === 1 ? "день" : trialLeft < 5 ? "дня" : "дней"}.</span>
            <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Оформить подписку</button>
          </div>
        )}
        {isActive && subscription && (
          <div style={{ background: "#e7f8f1", border: `1px solid ${GREEN}33`, color: DARK, padding: "16px 18px", borderRadius: 12, marginBottom: 24, fontSize: 14 }}>
            Подписка активна. Следующее списание: <strong>{formatDate(subscription.currentPeriodEnd)}</strong>.
          </div>
        )}

        {isExpired ? (
          <div style={{ background: "#fff", borderRadius: 14, padding: "40px 24px", textAlign: "center", boxShadow: "0 4px 18px rgba(13,14,26,0.08)" }}>
            <h2 style={{ color: DARK, fontSize: 20, margin: "0 0 8px" }}>{status === "trial" ? "Пробный период завершён" : "Подписка истекла"}</h2>
            <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px" }}>Оформите подписку, чтобы продолжить пользоваться Aqyl.</p>
            <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 10, padding: "12px 26px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Продлить подписку</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
            {buttons.map((b) => (
              <button
                key={b.key}
                onClick={b.onClick}
                style={{
                  position: "relative", textAlign: "left", background: "#fff", border: "1px solid #ececf3",
                  borderRadius: 16, padding: "26px 22px", cursor: "pointer", boxShadow: "0 4px 18px rgba(13,14,26,0.06)",
                  display: "flex", flexDirection: "column", gap: 8, minHeight: 120, transition: "transform .08s",
                }}
              >
                {b.soon && (
                  <span style={{ position: "absolute", top: 14, right: 14, fontSize: 11, fontWeight: 700, color: "#fff", background: "#f59e0b", borderRadius: 999, padding: "3px 9px" }}>Скоро</span>
                )}
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
