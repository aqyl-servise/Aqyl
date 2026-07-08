"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getValidAccessToken, logout } from "../../../../lib/auth";
import { api, type B2CProfile } from "../../../../lib/api";

const BRAND = "#6B5CE7";
const DARK = "#0D0E1A";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<B2CProfile | null>(null);

  useEffect(() => {
    (async () => {
      const t = await getValidAccessToken();
      if (!t) { router.replace("/login"); return; }
      try { setProfile(await api.getB2CMe(t)); } catch { router.replace("/login"); }
    })();
  }, [router]);

  const row = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee", fontSize: 15 }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ color: DARK, fontWeight: 600 }}>{value || "—"}</span>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: DARK, color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.push("/dashboard/b2c")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>← Назад</button>
        <span style={{ fontWeight: 700 }}>👤 Профиль</span>
      </header>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "28px 24px" }}>
        {!profile ? (
          <div style={{ color: "#6b7280" }}>Загрузка…</div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 4px 18px rgba(13,14,26,0.06)" }}>
            {row("Имя", profile.fullName)}
            {row("Email", profile.email)}
            {row("Предмет", profile.subject ?? "")}
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 600 }}>Подписка</button>
              <button onClick={async () => { await logout(); router.replace("/login"); }} style={{ background: "none", border: "1px solid #d9d9e3", borderRadius: 10, padding: "10px 18px", cursor: "pointer" }}>Выйти</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
