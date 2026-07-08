"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getValidAccessToken } from "../../../../lib/auth";
import { api, API_URL, type LpLesson } from "../../../../lib/api";

const BRAND = "#6B5CE7";
const DARK = "#0D0E1A";

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  draft: { text: "Черновик", color: "#6b7280" },
  generating: { text: "Генерация…", color: "#f59e0b" },
  ready: { text: "Готов", color: "#2DC08E" },
  error: { text: "Ошибка", color: "#e05757" },
};

export default function MaterialsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LpLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await getValidAccessToken();
      if (!t) { router.replace("/login"); return; }
      setToken(t);
      try { setLessons(await api.lpList(t)); } catch { /* empty */ }
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

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: DARK, color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.push("/dashboard/b2c")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>← Назад</button>
        <span style={{ fontWeight: 700 }}>📚 Мои материалы</span>
        <button onClick={() => router.push("/dashboard/b2c/lesson")} style={{ marginLeft: "auto", background: BRAND, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ Создать урок</button>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px" }}>
        {loading ? (
          <div style={{ color: "#6b7280" }}>Загрузка…</div>
        ) : lessons.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 14, padding: "40px 24px", textAlign: "center", boxShadow: "0 4px 18px rgba(13,14,26,0.06)" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>📭</div>
            <div style={{ color: DARK, fontWeight: 700, marginBottom: 6 }}>Пока нет сохранённых уроков</div>
            <button onClick={() => router.push("/dashboard/b2c/lesson")} style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 600 }}>Создать первый урок</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {lessons.map((l) => {
              const st = STATUS_LABEL[l.status] ?? STATUS_LABEL.draft;
              return (
                <div key={l.id} style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 4px 18px rgba(13,14,26,0.06)", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: DARK }}>{l.lessonTitle || "Без темы"}</div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                      {l.subject || "—"} · {l.grade ? `${l.grade} класс` : "—"} · {l.date || new Date(l.updatedAt).toLocaleDateString("ru-RU")}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{st.text}</span>
                  {l.status === "ready" && (
                    <button onClick={() => download(l)} style={{ background: "none", border: "1px solid #d9d9e3", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>Скачать</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
