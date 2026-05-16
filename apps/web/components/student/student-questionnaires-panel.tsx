"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type QItem = { id: string; title: string; description?: string; status: string; content?: string; myResponse: { id: string; submittedAt?: string } | null; createdAt: string };

export function StudentQuestionnairesPanel({ token, t }: { token: string; t: Record<string, string> }) {
  const [items, setItems] = useState<QItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<(QItem & { questions: Question[] }) | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    api.getMyStudentQuestionnaires(token)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [token]);

  function openQuestionnaire(item: QItem) {
    let questions: Question[] = [];
    try { questions = JSON.parse(item.content ?? "[]") as Question[]; } catch { questions = []; }
    setActive({ ...item, questions });
    setAnswers({});
    setDone(null);
  }

  async function handleSubmit() {
    if (!active) return;
    setSubmitting(true);
    try {
      await api.submitStudentQuestionnaire(token, active.id, answers);
      setItems(prev => prev.map(q => q.id === active.id ? { ...q, myResponse: { id: "done", submittedAt: new Date().toISOString() } } : q));
      setDone(active.id);
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="spinner" style={{ margin: "60px auto" }} />;

  if (active) {
    return (
      <div className="page">
        <button className="btn btn-ghost btn-sm" onClick={() => setActive(null)} style={{ marginBottom: 16 }}>← {t.back}</button>
        <h1 className="page-title">{active.title}</h1>
        {active.description && <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>{active.description}</p>}

        {done === active.id ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 600 }}>{t.quest_done}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {active.questions.map((q, i) => (
              <div key={q.id ?? i} className="card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>{i + 1}. {q.text}</div>
                {q.type === "text" ? (
                  <textarea className="input" style={{ minHeight: 80 }} value={answers[i] ?? ""} onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))} />
                ) : q.type === "scale" ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} className={`btn btn-sm ${answers[i] === String(n) ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setAnswers(a => ({ ...a, [i]: String(n) }))}>{n}</button>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(q.options ?? []).map((opt, oi) => (
                      <label key={oi} style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                        <input type="radio" name={`q${i}`} checked={answers[i] === opt}
                          onChange={() => setAnswers(a => ({ ...a, [i]: opt }))} />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit} style={{ maxWidth: 200 }}>
              {submitting ? <span className="spinner" /> : t.send_for_review}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">{t.student_quest_title}</h1>
      {items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>{t.student_quest_no_data}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map(item => (
            <div key={item.id} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{item.title}</div>
                {item.description && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{item.description}</div>}
              </div>
              {item.myResponse ? (
                <span style={{ fontSize: 13, color: "#3DB88E", fontWeight: 600 }}>✓ {t.quest_done}</span>
              ) : (
                <button className="btn btn-sm btn-primary" onClick={() => openQuestionnaire(item)}>{t.quest_respond}</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Question = { id?: number; text: string; type: "multiple_choice" | "text" | "scale"; options?: string[] };
