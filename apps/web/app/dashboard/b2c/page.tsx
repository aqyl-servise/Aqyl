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

const cardStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "22px 20px", boxShadow: "0 4px 18px rgba(13,14,26,0.08)",
  cursor: "pointer", border: "1px solid #ececf3",
};

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
      if (!token) { router.replace("/login-teacher"); return; }
      try {
        const [me, sub] = await Promise.all([
          api.getB2CMe(token),
          api.getSubscription(token).catch(() => null),
        ]);
        if (!active) return;
        setProfile(me);
        setSubscription(sub);
      } catch {
        if (active) router.replace("/login-teacher");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  // Обработка ?payment=success | failed после возврата с Kaspi.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      setToast({ kind: "success", text: "Оплата прошла успешно. Подписка активирована." });
    } else if (payment === "failed") {
      setToast({ kind: "error", text: "Оплата не прошла. Попробуйте ещё раз." });
    }
    if (payment) {
      window.history.replaceState({}, "", "/dashboard/b2c");
    }
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/login-teacher");
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>Загрузка…</div>;
  }
  if (!profile) return null;

  // Источник истины о доступе: подписка (если есть) либо триал из профиля.
  const status = subscription?.status ?? profile.subscriptionStatus;
  const trialLeft = daysLeft(subscription?.trialEndsAt ?? profile.trialEndsAt);
  const isActive = status === "active";
  const isTrial = status === "trial" && trialLeft > 0;
  const isExpired = status === "expired" || status === "cancelled" || (status === "trial" && trialLeft <= 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: DARK, color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ color: BRAND, fontWeight: 800, fontSize: 20 }}>Aqyl</span>
          <span style={{ marginLeft: 14, fontSize: 14, opacity: 0.85 }}>{profile.fullName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(107,92,231,0.25)" }}>
            {isActive ? "Подписка активна" : isTrial ? "Пробный период" : "Доступ ограничен"}
          </span>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>
            Выйти
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>
        {toast && (
          <div style={{
            background: toast.kind === "success" ? "#e7f8f1" : "#fdeaea",
            border: `1px solid ${toast.kind === "success" ? GREEN : "#e05757"}55`,
            color: DARK, padding: "14px 18px", borderRadius: 12, marginBottom: 20, fontSize: 14,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b7280" }}>✕</button>
          </div>
        )}

        {isTrial && (
          <div style={{ background: "#efeaff", border: `1px solid ${BRAND}33`, color: DARK, padding: "16px 18px", borderRadius: 12, marginBottom: 24, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span>Пробный период: осталось <strong>{trialLeft}</strong> {trialLeft === 1 ? "день" : trialLeft < 5 ? "дня" : "дней"}.</span>
            <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              Оформить подписку
            </button>
          </div>
        )}

        {isActive && subscription && (
          <div style={{ background: "#e7f8f1", border: `1px solid ${GREEN}33`, color: DARK, padding: "16px 18px", borderRadius: 12, marginBottom: 24, fontSize: 14 }}>
            Подписка активна. Следующее списание: <strong>{formatDate(subscription.currentPeriodEnd)}</strong>.
          </div>
        )}

        {isExpired ? (
          <div style={{ background: "#fff", borderRadius: 14, padding: "40px 24px", textAlign: "center", boxShadow: "0 4px 18px rgba(13,14,26,0.08)" }}>
            <h2 style={{ color: DARK, fontSize: 20, margin: "0 0 8px" }}>
              {status === "trial" ? "Пробный период завершён" : "Подписка истекла"}
            </h2>
            <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px" }}>Оформите подписку, чтобы продолжить пользоваться Aqyl.</p>
            <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 10, padding: "12px 26px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              Продлить подписку
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
            <div style={cardStyle} onClick={() => router.push("/dashboard/b2c")}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
              <div style={{ fontWeight: 700, color: DARK }}>Создать КМЖ</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Краткосрочный план урока</div>
            </div>
            <div style={cardStyle} onClick={() => router.push("/dashboard/b2c")}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📚</div>
              <div style={{ fontWeight: 700, color: DARK }}>Мои материалы</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Презентации и задания</div>
            </div>
            <div style={cardStyle} onClick={() => router.push("/dashboard/b2c/subscribe")}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💳</div>
              <div style={{ fontWeight: 700, color: DARK }}>Подписка</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Тарифы и оплата</div>
            </div>
            <div style={cardStyle} onClick={() => router.push("/dashboard/b2c")}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
              <div style={{ fontWeight: 700, color: DARK }}>Профиль</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{profile.email}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
