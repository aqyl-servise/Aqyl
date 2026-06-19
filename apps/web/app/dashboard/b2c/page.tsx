"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type B2CProfile } from "../../../lib/api";
import { getValidAccessToken, logout } from "../../../lib/auth";

const BRAND = "#6B5CE7";
const DARK = "#0D0E1A";

function daysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

const cardStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "22px 20px", boxShadow: "0 4px 18px rgba(13,14,26,0.08)",
  cursor: "pointer", border: "1px solid #ececf3",
};

export default function B2CDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<B2CProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getValidAccessToken();
      if (!token) { router.replace("/login-teacher"); return; }
      try {
        const me = await api.getB2CMe(token);
        if (active) setProfile(me);
      } catch {
        if (active) router.replace("/login-teacher");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  async function handleLogout() {
    await logout();
    router.replace("/login-teacher");
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>Загрузка…</div>;
  }
  if (!profile) return null;

  const left = daysLeft(profile.trialEndsAt);
  const trialExpired = profile.subscriptionStatus === "expired" || (profile.subscriptionStatus === "trial" && left <= 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: DARK, color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ color: BRAND, fontWeight: 800, fontSize: 20 }}>Aqyl</span>
          <span style={{ marginLeft: 14, fontSize: 14, opacity: 0.85 }}>{profile.fullName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(107,92,231,0.25)" }}>
            {profile.subscriptionStatus === "trial" ? "Пробный период" : profile.subscriptionStatus}
          </span>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>
            Выйти
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>
        {profile.subscriptionStatus === "trial" && !trialExpired && (
          <div style={{ background: "#efeaff", border: `1px solid ${BRAND}33`, color: DARK, padding: "14px 18px", borderRadius: 12, marginBottom: 24, fontSize: 14 }}>
            Пробный период: осталось <strong>{left}</strong> {left === 1 ? "день" : left < 5 ? "дня" : "дней"}.
          </div>
        )}

        {trialExpired ? (
          <div style={{ background: "#fff", borderRadius: 14, padding: "40px 24px", textAlign: "center", boxShadow: "0 4px 18px rgba(13,14,26,0.08)" }}>
            <h2 style={{ color: DARK, fontSize: 20, margin: "0 0 8px" }}>Пробный период завершён</h2>
            <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px" }}>Оформите подписку, чтобы продолжить пользоваться Aqyl.</p>
            {/* TODO: PAYMENT — кнопка пока неактивна, подключить платёжный провайдер */}
            <button disabled style={{ background: "#c7c2e8", color: "#fff", border: "none", borderRadius: 10, padding: "12px 26px", fontSize: 15, fontWeight: 600, cursor: "not-allowed" }}>
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
