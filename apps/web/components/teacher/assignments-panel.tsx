"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type Assignment = Awaited<ReturnType<typeof api.getMyAssignments>>[number];

export function AssignmentsPanel({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getMyAssignments(token).then(setAssignments).catch(console.error);
    api.getDashboard(token).then((d) => setClassrooms(d.classes)).catch(console.error);
  }, [token]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.createAssignment(token, {
        title: fd.get("title"), description: fd.get("description"),
        subject: fd.get("subject"), dueDate: fd.get("dueDate") || undefined,
        maxScore: Number(fd.get("maxScore") || 100),
        classroomId: fd.get("classroomId"),
      });
      setAssignments(await api.getMyAssignments(token));
      setAdding(false);
    } finally { setBusy(false); }
  }

  async function handleClose(id: string) {
    await api.updateAssignment(token, id, { status: "closed" });
    setAssignments(await api.getMyAssignments(token));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📋 {t.nav_assignments}</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Создать</button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Новое задание</h3>
          <form onSubmit={handleCreate} className="form-stack">
            <Field label={t.title} name="title" />
            <div className="form-row">
              <Field label={t.subject} name="subject" />
              <Field label={t.dueDate} name="dueDate" type="date" />
            </div>
            <div className="form-row">
              <Field label={t.maxScore} name="maxScore" type="number" defaultValue="100" />
              <div className="field">
                <label className="field-label">{t.classroom}</label>
                <select name="classroomId" className="input" required>
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="field"><label className="field-label">Описание</label>
              <textarea name="description" className="textarea" /></div>
            <div className="form-row">
              <button className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : "Сохранить"}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {assignments.length === 0 ? <p className="empty-state">{t.noData}</p> : (
          <table className="data-table">
            <thead><tr><th>Название</th><th>Предмет</th><th>Класс</th><th>Срок</th><th>Сдано</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td className="table-name">{a.title}</td>
                  <td>{a.subject}</td>
                  <td>{a.classroom.name}</td>
                  <td>{a.dueDate ? new Date(a.dueDate).toLocaleDateString("ru-RU") : "—"}</td>
                  <td>{(a.submissions as unknown[]).length}</td>
                  <td><span className={`score-chip ${a.status === "active" ? "score-high" : "score-low"}`}>{a.status === "active" ? "Активно" : "Закрыто"}</span></td>
                  <td>{a.status === "active" && <button className="btn btn-ghost btn-sm" onClick={() => handleClose(a.id)}>Закрыть</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, type, defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input name={name} type={type ?? "text"} defaultValue={defaultValue} className="input" />
    </div>
  );
}
