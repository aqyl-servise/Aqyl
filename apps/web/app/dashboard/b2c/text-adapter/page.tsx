"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getValidAccessToken } from "../../../../lib/auth";
import { TextAdapterPanel } from "../../../../components/teacher/text-adapter-panel";
import { Icon } from "../../../../components/ui/icon";

export default function B2CTextAdapterPage() {
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
      <div className="aqyl-b2c" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
        Загрузка…
      </div>
    );
  }

  return (
    <div className="aqyl-b2c" style={{ minHeight: "100vh" }}>
      <header style={{ background: "var(--ink-2)", color: "var(--white)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--line)" }}>
        <button
          onClick={() => router.push("/dashboard/b2c")}
          style={{ background: "rgba(139,127,232,.12)", border: "1px solid var(--line)", color: "var(--white)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
        >
          ← Назад
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="book" size={18} /> Адаптация текста</span>
      </header>
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px" }}>
        <TextAdapterPanel token={token} language="ru" />
      </main>
    </div>
  );
}
