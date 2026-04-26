"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api, AssignmentWithSubmission } from "../../lib/api";

type Filter = "all" | "new" | "submitted" | "graded";

function isOverdue(dueDate?: string) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function getStatus(a: AssignmentWithSubmission): string {
  if (a.submission?.status === "graded") return "graded";
  if (a.submission?.status === "submitted") return "submitted";
  if (!a.submission) {
    if (isOverdue(a.dueDate)) return "overdue";
    return "new";
  }
  return "new";
}

export function StudentAssignmentsPanel({ token, t }: { token: string; t: Record<string, string> }) {
  const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [submitting, setSubmitting] = useState<AssignmentWithSubmission | null>(null);
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getStudentAssignments(token)
      .then(setAssignments)
      .catch(() => setError(t.student_no_profile))
      .finally(() => setLoading(false));
  }, [token]);

  function refresh() {
    api.getStudentAssignments(token).then(setAssignments).catch(console.error);
  }

  const filtered = assignments.filter((a) => {
    if (filter === "all") return true;
    const s = getStatus(a);
    if (filter === "new") return s === "new" || s === "overdue";
    if (filter === "submitted") return s === "submitted";
    if (filter === "graded") return s === "graded";
    return true;
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!submitting) return;
    setBusy(true);
    setSuccessMsg(null);

    const fd = new FormData(e.currentTarget);
    const content = String(fd.get("content") ?? "").trim();
    let fileUrl: string | undefined;

    const file = fileRef.current?.files?.[0];
    if (file) {
      setUploadProgress(true);
      try {
        const uploaded = await api.uploadFile(token, file);
        fileUrl = uploaded.url;
      } catch {
        setBusy(false);
        setUploadProgress(false);
        alert("Ошибка загрузки файла");
        return;
      }
      setUploadProgress(false);
    }

    try {
      await api.submitStudentAssignment(token, submitting.id, { content: content || undefined, fileUrl });
      setSuccessMsg(t.assignment_done);
      setSubmitting(null);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">{t.loading}</p>;
  if (error) return <div className="alert alert-error"><span>⚠</span> {error}</div>;

  const filterBtns: { key: Filter; label: string }[] = [
    { key: "all", label: t.filter_all },
    { key: "new", label: t.filter_new },
    { key: "submitted", label: t.filter_submitted },
    { key: "graded", label: t.filter_graded },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📝 {t.nav_student_assignments}</h1>
      </div>

      {successMsg && (
        <div className="alert" style={{ background: "var(--success-light, #d4edda)", color: "var(--success, #155724)", marginBottom: 16 }}>
          ✅ {successMsg}
        </div>
      )}

      <div className="filter-row" style={{ marginBottom: 16, gap: 6 }}>
        {filterBtns.map((btn) => (
          <button
            key={btn.key}
            className={`btn btn-sm ${filter === btn.key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(btn.key)}
          >
            {btn.label}
            {btn.key === "all" && ` (${assignments.length})`}
            {btn.key === "new" && ` (${assignments.filter((a) => { const s = getStatus(a); return s === "new" || s === "overdue"; }).length})`}
            {btn.key === "submitted" && ` (${assignments.filter((a) => getStatus(a) === "submitted").length})`}
            {btn.key === "graded" && ` (${assignments.filter((a) => getStatus(a) === "graded").length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">{t.no_assignments}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((a) => {
            const st = getStatus(a);
            const overdue = st === "overdue";
            return (
              <div
                key={a.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    st === "graded" ? "var(--success, #28a745)" :
                    st === "submitted" ? "var(--primary)" :
                    overdue ? "var(--danger)" : "var(--border)"
                  }`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{a.title}</h3>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>📚 {a.subject}</span>
                      {a.teacher && <span>👤 {a.teacher.fullName}</span>}
                      {a.dueDate && (
                        <span style={{ color: overdue ? "var(--danger)" : undefined }}>
                          ⏰ {t.deadline}: {new Date(a.dueDate).toLocaleDateString("ru-RU")}
                          {overdue && " (!"}
                        </span>
                      )}
                      <span>🏆 {t.maxScore}: {a.maxScore}</span>
                    </div>
                    {a.description && (
                      <p style={{ marginTop: 8, fontSize: 13, color: "var(--text-secondary, #555)" }}>
                        {a.description}
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <StatusChip status={st} t={t} />
                    {a.submission?.score != null && (
                      <span style={{ fontWeight: 700, fontSize: 15, color: "var(--primary)" }}>
                        {a.submission.score} / {a.maxScore}
                      </span>
                    )}
                    {(st === "new" || st === "overdue") && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setSubmitting(a); setSuccessMsg(null); }}
                      >
                        {t.submit_assignment}
                      </button>
                    )}
                    {st === "submitted" && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setSubmitting(a); setSuccessMsg(null); }}
                      >
                        ✏️ Изменить
                      </button>
                    )}
                  </div>
                </div>

                {a.submission?.content && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--surface, #f8f9fa)", borderRadius: 6, fontSize: 13 }}>
                    <strong>{t.your_answer}:</strong> {a.submission.content}
                  </div>
                )}
                {a.submission?.fileUrl && (
                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    📎 <a href={a.submission.fileUrl} target="_blank" rel="noreferrer">Прикреплённый файл</a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {submitting && (
        <div className="modal-overlay" onClick={() => setSubmitting(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4 }}>{t.submit_assignment}</h3>
            <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
              {submitting.subject} — {submitting.title}
            </p>
            <form method="POST" onSubmit={handleSubmit} className="form-stack">
              <div className="field">
                <label className="field-label">{t.text_answer}</label>
                <textarea
                  name="content"
                  className="input"
                  rows={5}
                  style={{ resize: "vertical" }}
                  defaultValue={submitting.submission?.content ?? ""}
                  placeholder="Введите ваш ответ..."
                />
              </div>
              <div className="field">
                <label className="field-label">{t.attach_file}</label>
                <input
                  ref={fileRef}
                  type="file"
                  className="input"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic"
                />
                <span className="muted" style={{ fontSize: 11 }}>PDF, Word, Фото (макс. 20 МБ)</span>
              </div>
              {uploadProgress && <p className="muted" style={{ fontSize: 12 }}>Загрузка файла...</p>}
              <div className="form-row">
                <button className="btn btn-primary" type="submit" disabled={busy || uploadProgress}>
                  {busy ? <span className="spinner" /> : t.send_for_review}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setSubmitting(null)}>
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status, t }: { status: string; t: Record<string, string> }) {
  const map: Record<string, { label: string; color: string }> = {
    new: { label: t.status_new, color: "var(--text-muted, #888)" },
    in_progress: { label: t.status_in_progress, color: "var(--primary)" },
    submitted: { label: t.status_submitted, color: "var(--primary)" },
    graded: { label: t.status_graded, color: "var(--success, #28a745)" },
    overdue: { label: t.status_overdue, color: "var(--danger)" },
  };
  const cfg = map[status] ?? { label: status, color: "#888" };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, padding: "2px 8px", border: `1px solid ${cfg.color}`, borderRadius: 10 }}>
      {cfg.label}
    </span>
  );
}
