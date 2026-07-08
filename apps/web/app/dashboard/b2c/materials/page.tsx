"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getValidAccessToken } from "../../../../lib/auth";
import { api, API_URL, type LpLesson } from "../../../../lib/api";
import { useLang, LT } from "../../../../lib/lesson-translations";
import { LangSwitcher } from "../../../../components/lang-switcher";

const BRAND = "#6B5CE7";
const DARK = "#0D0E1A";

const STATUS_COLOR: Record<string, string> = { draft: "#6b7280", generating: "#f59e0b", ready: "#2DC08E", error: "#e05757" };

export default function MaterialsPage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  const [token, setToken] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LpLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const tk = await getValidAccessToken();
      if (!tk) { router.replace("/login"); return; }
      setToken(tk);
      try { setLessons(await api.lpList(tk)); } catch { /* empty */ }
      setLoading(false);
    })();
  }, [router]);

  async function download(l: LpLesson) {
    if (!token) return;
    const res = await fetch(`${API_URL}/lesson-plans/${l.id}/export`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ksp-${l.id}.docx`; a.click();
    URL.revokeObjectURL(url);
  }

  const statusText = (s: string) => t[`stt_${s}`] ?? t.stt_draft;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: DARK, color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.push("/dashboard/b2c")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>← {t.back}</button>
        <span style={{ fontWeight: 700 }}>📚 {t.materials}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <LangSwitcher lang={lang} setLang={setLang} dark />
          <button onClick={() => router.push("/dashboard/b2c/lesson")} style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ {t.createLesson}</button>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px" }}>
        {loading ? (
          <div style={{ color: "#6b7280" }}>{t.loading}</div>
        ) : lessons.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 14, padding: "40px 24px", textAlign: "center", boxShadow: "0 4px 18px rgba(13,14,26,0.06)" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>📭</div>
            <div style={{ color: DARK, fontWeight: 700, marginBottom: 6 }}>{t.noLessons}</div>
            <button onClick={() => router.push("/dashboard/b2c/lesson")} style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 600 }}>{t.createFirst}</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {lessons.map((l) => (
              <div key={l.id} style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 4px 18px rgba(13,14,26,0.06)", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: DARK }}>{l.lessonTitle || t.noTopic}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{l.subject || "—"} · {l.grade ? `${l.grade} ${t.gradeWord}` : "—"} · {l.date || new Date(l.updatedAt).toLocaleDateString()}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR[l.status] ?? "#6b7280" }}>{statusText(l.status)}</span>
                {l.status === "ready" && <button onClick={() => download(l)} style={{ background: "none", border: "1px solid #d9d9e3", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>{t.download}</button>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
