"use client";
import { useState, useEffect, useRef } from "react";
import { api, FLTask, FLAssignment, FLSubmission } from "../../lib/api";
import { translations } from "../../lib/translations";

type View = "list" | "detail" | "history";

function statusBadge(status: string, t: Record<string, string>) {
  const map: Record<string, { label: string; color: string }> = {
    new: { label: t.fl_status_new ?? "Новое", color: "#3b82f6" },
    in_progress: { label: t.fl_status_in_progress ?? "В процессе", color: "#f59e0b" },
    submitted: { label: t.fl_status_submitted ?? "Отправлено", color: "#8b5cf6" },
    graded: { label: t.fl_status_graded ?? "Оценено", color: "#10b981" },
  };
  const d = map[status] ?? { label: status, color: "#6b7280" };
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: d.color + "20", color: d.color, fontWeight: 600 }}>{d.label}</span>;
}

function dirLabel(dir?: string) {
  const m: Record<string, string> = { reading: "📖 Чтение", math: "🔢 Математика", science: "🔬 Наука" };
  return dir ? (m[dir] ?? dir) : "";
}

type AssignmentWithSub = FLAssignment & { submission: FLSubmission | null };
type DetailData = FLAssignment & { taskObjects: FLTask[]; submission: FLSubmission | null };

export function FLStudentPanel({ token, language }: { token: string; language: string }) {
  const t = translations[language as keyof typeof translations] as Record<string, string>;
  const [view, setView] = useState<View>("list");
  const [assignments, setAssignments] = useState<AssignmentWithSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.flGetStudentAssignments(token)
      .then(setAssignments)
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, [token]);

  async function openAssignment(a: AssignmentWithSub) {
    setDetailLoading(true);
    setView("detail");
    try {
      const d = await api.flGetStudentAssignmentDetail(token, a.id);
      setDetail(d);
      // Pre-fill answers from existing submission
      const answerMap: Record<string, string> = {};
      (d.submission?.answers ?? []).forEach((ans: { taskId: string; answer: string }) => { answerMap[ans.taskId] = ans.answer; });
      setAnswers(answerMap);
      // Auto-start if not started
      if (!d.submission) {
        api.flStartAssignment(token, a.id).catch(() => {});
      }
    } catch { /* ignore */ } finally { setDetailLoading(false); }
  }

  function setAnswer(taskId: string, value: string) {
    setAnswers(prev => {
      const next = { ...prev, [taskId]: value };
      // Auto-save after 2s
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(async () => {
        if (!detail?.submission) return;
        setSaving(true);
        const ansArr = Object.entries(next).map(([tid, ans]) => ({ taskId: tid, answer: ans }));
        await api.flUpdateSubmission(token, detail.submission.id, { answers: ansArr }).catch(() => {});
        setSaving(false);
      }, 2000);
      return next;
    });
  }

  async function handleSubmit() {
    if (!detail) return;
    if (!confirm("Отправить работу? После отправки изменения невозможны.")) return;
    setSubmitting(true);
    try {
      const ansArr = Object.entries(answers).map(([taskId, answer]) => ({ taskId, answer }));
      await api.flSubmitAnswers(token, detail.id, { answers: ansArr });
      // Refresh list
      const updated = await api.flGetStudentAssignments(token);
      setAssignments(updated);
      setView("list");
      setDetail(null);
    } catch { /* ignore */ } finally { setSubmitting(false); }
  }

  const submittedAssignments = assignments.filter(a => a.submission && (a.submission.status === "submitted" || a.submission.status === "graded"));

  return (
    <div className="page">
      <h1 className="page-title">📚 {t.fl_module ?? "Функциональная грамотность"}</h1>

      {/* View tabs */}
      {view === "list" && (
        <div className="sc-tabs">
          <button className="sc-tab sc-tab-active">Текущие работы</button>
          <button className="sc-tab" onClick={() => setView("history")}>История</button>
        </div>
      )}

      {/* ── List View ── */}
      {view === "list" && (
        <div style={{ marginTop: 0 }}>
          {loading ? (
            <div className="card"><p className="fm-empty">{t.loading}</p></div>
          ) : assignments.length === 0 ? (
            <div className="card"><p className="fm-empty">{t.fl_no_assignments ?? "Нет доступных работ"}</p></div>
          ) : (
            <>
              {/* Progress bar */}
              {assignments.length > 0 && (
                <div className="card" style={{ marginBottom: 12, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>Прогресс выполнения</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{submittedAssignments.length}/{assignments.length}</span>
                  </div>
                  <div style={{ background: "var(--border)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ background: "var(--primary)", height: "100%", width: `${Math.round((submittedAssignments.length / assignments.length) * 100)}%`, borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {assignments.map(a => {
                  const subStatus = !a.submission ? "new" : a.submission.status;
                  return (
                    <div key={a.id} className="card" style={{ padding: 14, cursor: "pointer" }} onClick={() => openAssignment(a)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{a.title}</div>
                          {a.description && <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>{a.description}</div>}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {a.dueDate && <span style={{ fontSize: 12, color: "var(--muted)" }}>📅 До: {new Date(a.dueDate).toLocaleDateString()}</span>}
                            {a.timeLimit && <span style={{ fontSize: 12, color: "var(--muted)" }}>⏱ {a.timeLimit} мин</span>}
                            {a.submission?.totalScore !== undefined && a.submission?.totalScore !== null && (
                              <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✓ {a.submission.totalScore} {t.fl_score ?? "баллов"}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0 }}>{statusBadge(subStatus, t)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Detail View ── */}
      {view === "detail" && (
        <div style={{ marginTop: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setView("list"); setDetail(null); setAnswers({}); }}>← Назад</button>
            {saving && <span style={{ fontSize: 12, color: "var(--muted)" }}>Сохранение...</span>}
          </div>

          {detailLoading || !detail ? (
            <div className="card"><p className="fm-empty">{t.loading}</p></div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>{detail.title}</h2>
                {detail.description && <p style={{ fontSize: 13, color: "var(--muted)" }}>{detail.description}</p>}
                <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  {detail.dueDate && <span style={{ fontSize: 12, color: "var(--muted)" }}>📅 Срок: {new Date(detail.dueDate).toLocaleDateString()}</span>}
                  {detail.timeLimit && <span style={{ fontSize: 12, color: "var(--muted)" }}>⏱ {detail.timeLimit} мин</span>}
                </div>
              </div>

              {detail.submission?.status === "submitted" || detail.submission?.status === "graded" ? (
                <div className="card" style={{ marginBottom: 12 }}>
                  <p style={{ fontWeight: 600, color: "#10b981", marginBottom: 8 }}>✓ Работа отправлена</p>
                  {detail.submission.totalScore !== undefined && detail.submission.totalScore !== null && (
                    <p style={{ fontSize: 15 }}>Итоговый балл: <strong>{detail.submission.totalScore}</strong></p>
                  )}
                  {detail.submission.answers?.map((a: { taskId: string; answer: string; score?: number; teacherComment?: string }, i: number) => (
                    <div key={a.taskId} style={{ marginTop: 12, padding: 10, background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Задание {i + 1}</div>
                      <div style={{ fontSize: 13, marginBottom: 6 }}>Ваш ответ: {a.answer || "—"}</div>
                      {a.score !== undefined && <div style={{ fontSize: 13, color: "#10b981" }}>Балл: {a.score}</div>}
                      {a.teacherComment && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, fontStyle: "italic" }}>💬 {a.teacherComment}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Task list */}
                  {detail.taskObjects.length === 0 ? (
                    <div className="card"><p className="fm-empty">Задания не добавлены</p></div>
                  ) : (
                    detail.taskObjects.map((task, i) => (
                      <div key={task.id} className="card" style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Задание {i + 1}</span>
                          {task.direction && <span style={{ fontSize: 11, color: "var(--muted)" }}>{dirLabel(task.direction)}</span>}
                        </div>
                        <div style={{ fontWeight: 500, marginBottom: 10, fontSize: 15, lineHeight: 1.5 }}>{task.description}</div>

                        {task.taskType === "test" && task.options ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {task.options.map((opt, oi) => (
                              <label key={oi} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", borderRadius: 8, border: `2px solid ${answers[task.id] === opt.text ? "var(--primary)" : "var(--border)"}`, background: answers[task.id] === opt.text ? "var(--primary-light, #e0f0ff)" : undefined }}>
                                <input type="radio" name={`task-${task.id}`} value={opt.text} checked={answers[task.id] === opt.text} onChange={() => setAnswer(task.id, opt.text)} style={{ margin: 0 }} />
                                <span style={{ fontSize: 14 }}>{opt.text}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            className="input"
                            placeholder="Введите ваш ответ..."
                            rows={4}
                            style={{ resize: "vertical", width: "100%" }}
                            value={answers[task.id] ?? ""}
                            onChange={e => setAnswer(task.id, e.target.value)}
                          />
                        )}
                      </div>
                    ))
                  )}

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                    <button className="btn btn-outline" disabled={saving} onClick={async () => {
                      if (!detail.submission) return;
                      setSaving(true);
                      const ansArr = Object.entries(answers).map(([taskId, answer]) => ({ taskId, answer }));
                      await api.flUpdateSubmission(token, detail.submission.id, { answers: ansArr }).catch(() => {});
                      setSaving(false);
                    }}>
                      {t.fl_save_draft ?? "Сохранить"}
                    </button>
                    <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
                      {submitting ? "Отправка..." : (t.fl_submit ?? "Отправить работу")}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── History View ── */}
      {view === "history" && (
        <div style={{ marginTop: 0 }}>
          <div className="sc-tabs">
            <button className="sc-tab" onClick={() => setView("list")}>Текущие работы</button>
            <button className="sc-tab sc-tab-active">История</button>
          </div>
          {submittedAssignments.length === 0 ? (
            <div className="card"><p className="fm-empty">Нет завершённых работ</p></div>
          ) : (
            <div className="card" style={{ marginTop: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Работа</th>
                    <th>Статус</th>
                    <th>Балл</th>
                    <th>Отправлено</th>
                  </tr>
                </thead>
                <tbody>
                  {submittedAssignments.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500 }}>{a.title}</td>
                      <td>{statusBadge(a.submission?.status ?? "submitted", t)}</td>
                      <td>{a.submission?.totalScore !== undefined && a.submission?.totalScore !== null ? a.submission.totalScore : "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{a.submission?.submittedAt ? new Date(a.submission.submittedAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
