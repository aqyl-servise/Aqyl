"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getValidAccessToken } from "../../../../lib/auth";
import { VisualizerPanel } from "../../../../components/teacher/visualizer-panel";

export default function B2CVisualizerPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const t = await getValidAccessToken();
      if (!active) return;
      if (!t) { router.replace("/login"); return; }
      setToken(t);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [router]);

  if (loading || !token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
        Загрузка…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: "#0D0E1A", color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={() => router.push("/dashboard/b2c")}
          style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
        >
          ← Назад
        </button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>🗺️ Визуализатор</span>
      </header>
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px" }}>
        <VisualizerPanel token={token} language="ru" />
      </main>
    </div>
  );
}
