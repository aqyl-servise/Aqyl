"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type ClassHour = Awaited<ReturnType<typeof api.getAllClassHours>>[number];
type MyClassHour = Awaited<ReturnType<typeof api.getMyClassHours>>[number];

const TOPICS = ["education", "law", "circle", "apko", "other"];
const TOPIC_LABELS: Record<string, string> = {
  education: "Тәрбие", law: "Құқық", circle: "Үйірме", apko: "АПҚО", other: "Прочее",
};
const TOPIC_COLORS: Record<string, string> = {
  education: "stat-blue", law: "stat-purple", circle: "stat-green", apko: "stat-orange", other: "",
};

export function ClassHoursPanel({ token, language, t, isAdmin }: { token: string; language: Language; t: Record<string, string>; isAdmin: boolean }) {
  const [hours, setHours] = useState<(ClassHour | MyClassHour)[]>([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetch = isAdmin ? api.getAllClassHours(token) : api.getMyClassHours(token);
    fetch.then(setHours).catch(console.error);
    if (!isAdmin) {
      api.getDashboard(token).then((d) => setClassrooms(d.classes)).catch(console.error);
    }
  }, [token, isAdmin]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.createClassHour(token, {
        title: fd.get("title"),
        topic: fd.get("topic"),
        date: fd.get("date") || undefined,
        duration: Number(fd.get("duration") || 45),
        notes: fd.get("notes"),
        classroomId: fd.get("classroomId"),
      });
      const updated = isAdmin ? await api.getAllClassHours(token) : await api.getMyClassHours(token);
      setHours(updated);
      setAdding(false);
    } finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🕐 {t.nav_class_hours}</h1>
        {!isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Создать</button>}
      </div>

      {adding && !isAdmin && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">{t.createClassHour}</h3>
          <form onSubmit={handleCreate} className="form-stack">
            <Field label={t.title} name="title" />
            <div className="form-row">
              <div className="field">
                <label className="field-label">Тема</label>
                <select name="topic" className="input" required>
                  {TOPICS.map((tp) => <option key={tp} value={tp}>{TOPIC_LABELS[tp]}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Класс</label>
                <select name="classroomId" className="input" required>
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <Field label={t.date} name="date" type="date" />
              <Field label={t.duration} name="duration" type="number" defaultValue="45" />
            </div>
            <div className="field">
              <label className="field-label">{t.notes}</label>
              <textarea name="notes" className="textarea" />
            </div>
            <div className="form-row">
              <button className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : t.save}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>{t.cancel}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {hours.length === 0 ? <p className="empty-state">{t.noData}</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.title}</th><th>Тема</th><th>Класс</th><th>Дата</th>
                {isAdmin && <th>Кл. рук.</th>}
                <th>Мин.</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h.id}>
                  <td className="table-name">{h.title}</td>
                  <td>
                    <span className={`topic-chip ${TOPIC_COLORS[h.topic] ?? ""}`}>{TOPIC_LABELS[h.topic] ?? h.topic}</span>
                  </td>
                  <td>{h.classroom?.name ?? "—"}</td>
                  <td>{h.date ? new Date(h.date).toLocaleDateString("ru-RU") : "—"}</td>
                  {isAdmin && <td>{(h as ClassHour).classTeacher?.fullName ?? "—"}</td>}
                  <td>{(h as MyClassHour).duration ?? "—"}</td>
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
