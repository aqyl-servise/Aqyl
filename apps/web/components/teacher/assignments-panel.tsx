"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type Assignment = Awaited<ReturnType<typeof api.getMyAssignments>>[number];
type Classroom = { id: string; name: string };
type View = "list" | "create";

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  published: "Опубликовано",
  active: "Активно",
  closed: "Закрыто",
};

const STATUS_CLASS: Record<string, string> = {
  draft: "score-mid",
  published: "score-high",
  active: "score-high",
  closed: "score-low",
};

const TYPE_LABELS: Record<string, string> = {
  test: "Тест",
  essay: "Эссе",
  homework: "Домашнее задание",
  project: "Проект",
};

export function AssignmentsPanel({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const [view, setView] = useState<View>("list");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [detail, setDetail] = useState<Assignment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterClassroom, setFilterClassroom] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [a, d] = await Promise.all([
      api.getMyAssignments(token),
      api.getDashboard(token),
    ]);
    setAssignments(a);
    setClassrooms(d.classes);
  }

  useEffect(() => {
    reload().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handlePublish(id: string) {
    setBusy(true);
    try {
      await api.publishAssignment(token, id);
      await reload();
      if (detail?.id === id) setDetail(assignments.find(a => a.id === id) ?? null);
    } finally { setBusy(false); }
  }

  async function handleClose(id: string) {
    setBusy(true);
    try {
      await api.closeAssignment(token, id);
      await reload();
      if (detail?.id === id) setDetail(null);
    } finally { setBusy(false); }
  }

  const filtered = assignments.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterClassroom && a.classroom.id !== filterClassroom) return false;
    return true;
  });

  if (view === "create") {
    return (
      <CreateAssignmentView
        token={token}
        classrooms={classrooms}
        t={t}
        onSaved={async () => { await reload(); setView("list"); }}
        onCancel={() => setView("list")}
      />
    );
  }

  if (detail) {
    return (
      <AssignmentDetail
        assignment={detail}
        busy={busy}
        t={t}
        onPublish={() => handlePublish(detail.id)}
        onClose={() => handleClose(detail.id)}
        onBack={() => setDetail(null)}
      />
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📋 {t.nav_assignments}</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setView("create")}>
          + Создать задание
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="input" style={{ width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="published">Опубликовано</option>
          <option value="active">Активно</option>
          <option value="closed">Закрыто</option>
        </select>
        <select className="input" style={{ width: "auto" }} value={filterClassroom} onChange={e => setFilterClassroom(e.target.value)}>
          <option value="">Все классы</option>
          {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <p className="empty-state" style={{ padding: 24 }}>{t.noData}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Предмет</th>
                <th>Класс</th>
                <th>Срок</th>
                <th>Статус</th>
                <th style={{ textAlign: "center" }}>Сдано</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => setDetail(a)}>
                  <td className="table-name">{a.title}</td>
                  <td>{a.subject}</td>
                  <td>{a.classroom.name}</td>
                  <td>{a.dueDate ? new Date(a.dueDate).toLocaleDateString("ru-RU") : "—"}</td>
                  <td>
                    <span className={`score-chip ${STATUS_CLASS[a.status] ?? "score-mid"}`}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="role-chip role-teacher">{a.submissions.length}</span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {(a.status === "draft") && (
                        <button className="btn btn-primary btn-sm" disabled={busy}
                          onClick={() => handlePublish(a.id)}>
                          Отправить
                        </button>
                      )}
                      {(a.status === "published" || a.status === "active") && (
                        <button className="btn btn-ghost btn-sm" disabled={busy}
                          onClick={() => handleClose(a.id)}>
                          Закрыть
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Create Assignment View ────────────────────────────────────────────────────
function CreateAssignmentView({ token, classrooms, t, onSaved, onCancel }: {
  token: string;
  classrooms: Classroom[];
  t: Record<string, string>;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSubject, setAiSubject] = useState("");
  const [aiGrade, setAiGrade] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiType, setAiType] = useState("homework");

  async function handleAiGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const res = await api.aiGenerateAssignment(token, {
        subject: aiSubject, grade: aiGrade, topic: aiTopic, type: aiType,
      });
      setAiResult(res.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка генерации");
    } finally { setGenerating(false); }
  }

  async function handleManualSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const desc = aiResult ? `${aiResult}\n\n${String(fd.get("description") ?? "")}`.trim() : String(fd.get("description") ?? "");
      await api.createAssignment(token, {
        title: fd.get("title"),
        description: desc || undefined,
        subject: fd.get("subject"),
        dueDate: fd.get("dueDate") || undefined,
        maxScore: Number(fd.get("maxScore") || 100),
        classroomId: fd.get("classroomId"),
        assignmentType: fd.get("assignmentType") || undefined,
        status: "draft",
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally { setSaving(false); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📋 Создать задание</h1>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>← Назад</button>
      </div>

      <div className="sc-tabs" style={{ marginBottom: 0 }}>
        <button className={`sc-tab${mode === "manual" ? " sc-tab-active" : ""}`} onClick={() => setMode("manual")}>
          ✏️ Вручную
        </button>
        <button className={`sc-tab${mode === "ai" ? " sc-tab-active" : ""}`} onClick={() => setMode("ai")}>
          🤖 AI-генерация
        </button>
      </div>

      <div className="card" style={{ marginTop: 0 }}>
        {mode === "ai" && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Сгенерировать с помощью AI</h3>
            <form onSubmit={handleAiGenerate} className="form-stack">
              <div className="form-row">
                <div className="field">
                  <label className="field-label">Предмет</label>
                  <input className="input" value={aiSubject} onChange={e => setAiSubject(e.target.value)} placeholder="Математика" required />
                </div>
                <div className="field">
                  <label className="field-label">Класс</label>
                  <input className="input" value={aiGrade} onChange={e => setAiGrade(e.target.value)} placeholder="7" required />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label className="field-label">Тема</label>
                  <input className="input" value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Квадратные уравнения" required />
                </div>
                <div className="field">
                  <label className="field-label">Тип задания</label>
                  <select className="input" value={aiType} onChange={e => setAiType(e.target.value)}>
                    <option value="test">Тест</option>
                    <option value="essay">Эссе</option>
                    <option value="homework">Домашнее задание</option>
                    <option value="project">Проект</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-outline btn-sm" type="submit" disabled={generating}>
                {generating ? <span className="spinner" /> : "🤖 Сгенерировать"}
              </button>
            </form>
            {aiResult && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {aiResult}
              </div>
            )}
            {aiResult && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>AI-контент будет добавлен к описанию задания ниже.</p>}
          </div>
        )}

        <h3 style={{ marginBottom: 12, fontSize: 15 }}>Параметры задания</h3>
        <form onSubmit={handleManualSubmit} className="form-stack">
          <div className="form-row">
            <div className="field">
              <label className="field-label">Название *</label>
              <input name="title" className="input" required placeholder="Контрольная работа №1" />
            </div>
            <div className="field">
              <label className="field-label">Предмет *</label>
              <input name="subject" className="input" required defaultValue={aiSubject || ""} placeholder="Математика" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label className="field-label">Класс *</label>
              <select name="classroomId" className="input" required>
                <option value="">— Выберите класс —</option>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Тип</label>
              <select name="assignmentType" className="input" defaultValue={aiType}>
                <option value="homework">Домашнее задание</option>
                <option value="test">Тест</option>
                <option value="essay">Эссе</option>
                <option value="project">Проект</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label className="field-label">Срок сдачи</label>
              <input name="dueDate" type="date" className="input" />
            </div>
            <div className="field">
              <label className="field-label">Макс. балл</label>
              <input name="maxScore" type="number" className="input" defaultValue="100" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Описание{aiResult ? " (необязательно — AI-контент уже будет добавлен)" : ""}</label>
            <textarea name="description" className="textarea" rows={4} placeholder="Описание задания..." />
          </div>
          {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
          <div className="form-row">
            <button className="btn btn-outline" type="submit" disabled={saving}>
              {saving ? <span className="spinner" /> : "💾 Сохранить как черновик"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Assignment Detail ─────────────────────────────────────────────────────────
function AssignmentDetail({ assignment, busy, t, onPublish, onClose, onBack }: {
  assignment: Assignment;
  busy: boolean;
  t: Record<string, string>;
  onPublish: () => void;
  onClose: () => void;
  onBack: () => void;
}) {
  const submitted = assignment.submissions.filter(s => s.status === "submitted" || s.status === "graded");
  const notSubmitted = assignment.submissions.filter(s => s.status === "pending");

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Назад</button>
        <div style={{ display: "flex", gap: 8 }}>
          {(assignment.status === "draft") && (
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={onPublish}>
              📤 Отправить ученикам
            </button>
          )}
          {(assignment.status === "published" || assignment.status === "active") && (
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={onClose}>
              Закрыть
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 8 }}>{assignment.title}</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, fontSize: 14 }}>
          <span className="muted">Предмет: <strong>{assignment.subject}</strong></span>
          <span className="muted">Класс: <strong>{assignment.classroom.name}</strong></span>
          {assignment.dueDate && <span className="muted">Срок: <strong>{new Date(assignment.dueDate).toLocaleDateString("ru-RU")}</strong></span>}
          <span className={`score-chip ${STATUS_CLASS[assignment.status] ?? "score-mid"}`}>
            {STATUS_LABELS[assignment.status] ?? assignment.status}
          </span>
          {assignment.assignmentType && (
            <span className="role-chip role-admin">{TYPE_LABELS[assignment.assignmentType] ?? assignment.assignmentType}</span>
          )}
        </div>

        {assignment.description && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {assignment.description}
          </div>
        )}

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{assignment.submissions.length}</div>
            <div className="muted" style={{ fontSize: 12 }}>Всего сдали</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#22c55e" }}>{submitted.length}</div>
            <div className="muted" style={{ fontSize: 12 }}>Сдано</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#f97316" }}>{notSubmitted.length}</div>
            <div className="muted" style={{ fontSize: 12 }}>В ожидании</div>
          </div>
        </div>
      </div>

      {assignment.submissions.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 12 }}>Ответы учеников</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ученик</th>
                <th>Статус</th>
                <th>Балл</th>
              </tr>
            </thead>
            <tbody>
              {assignment.submissions.map(s => (
                <tr key={s.id}>
                  <td>{s.student?.fullName ?? "—"}</td>
                  <td>
                    <span className={`score-chip ${s.status === "graded" ? "score-high" : s.status === "submitted" ? "score-mid" : "score-low"}`}>
                      {s.status === "graded" ? "Проверено" : s.status === "submitted" ? "Сдано" : "Не сдано"}
                    </span>
                  </td>
                  <td>{(s as { score?: number }).score ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
