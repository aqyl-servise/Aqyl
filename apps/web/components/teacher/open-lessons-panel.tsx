"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type Lesson = Awaited<ReturnType<typeof api.getMyLessons>>[number];
type AdminLesson = Awaited<ReturnType<typeof api.getAllLessons>>[number];

const STATUS_LABELS: Record<string, string> = { planned: "Запланирован", conducted: "Проведён", reviewed: "Проверен" };
const STATUS_COLORS: Record<string, string> = { planned: "score-mid", conducted: "score-high", reviewed: "badge" };

export function OpenLessonsPanel({ token, language, t, isAdmin }: { token: string; language: Language; t: Record<string, string>; isAdmin: boolean }) {
  const [lessons, setLessons] = useState<(Lesson | AdminLesson)[]>([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Lesson | null>(null);

  useEffect(() => {
    const fetch = isAdmin ? api.getAllLessons(token) : api.getMyLessons(token);
    fetch.then((l) => setLessons(l)).catch(console.error);
  }, [token, isAdmin]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.createLesson(token, {
        title: fd.get("title"), subject: fd.get("subject"),
        grade: Number(fd.get("grade")), date: fd.get("date") || undefined,
        description: fd.get("description"),
      });
      const updated = isAdmin ? await api.getAllLessons(token) : await api.getMyLessons(token);
      setLessons(updated); setAdding(false);
    } finally { setBusy(false); }
  }

  async function handleComment(id: string, comment: string) {
    await api.updateLesson(token, id, { directorComment: comment, status: "reviewed" });
    const updated = await api.getAllLessons(token);
    setLessons(updated);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🎓 {t.nav_lessons}</h1>
        {!isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Добавить</button>}
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Новый открытый урок</h3>
          <form onSubmit={handleCreate} className="form-stack">
            <Field label="Название" name="title" />
            <div className="form-row">
              <Field label={t.subject} name="subject" />
              <Field label={t.grade} name="grade" type="number" defaultValue="8" />
            </div>
            <Field label={t.date} name="date" type="date" />
            <div className="field"><label className="field-label">{t.description}</label>
              <textarea name="description" className="textarea" /></div>
            <div className="form-row">
              <button className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : "Сохранить"}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {lessons.length === 0 ? <p className="empty-state">{t.noData}</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Название</th><th>{t.subject}</th><th>Класс</th><th>Дата</th>
                {isAdmin && <th>Учитель</th>}
                <th>Статус</th>
                {isAdmin && <th>Действие</th>}
              </tr>
            </thead>
            <tbody>
              {lessons.map((l) => (
                <tr key={l.id}>
                  <td className="table-name">{l.title}</td>
                  <td>{l.subject}</td>
                  <td>{l.grade}</td>
                  <td>{l.date ? new Date(l.date).toLocaleDateString("ru-RU") : "—"}</td>
                  {isAdmin && <td>{(l as AdminLesson).teacher?.fullName ?? "—"}</td>}
                  <td><span className={`score-chip ${STATUS_COLORS[l.status] ?? "badge"}`}>{STATUS_LABELS[l.status] ?? l.status}</span></td>
                  {isAdmin && (
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => setSelected(l as Lesson)}>
                        Комментарий
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && isAdmin && (
        <CommentModal lesson={selected} onSave={handleComment} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function CommentModal({ lesson, onSave, onClose }: { lesson: Lesson; onSave: (id: string, comment: string) => void; onClose: () => void }) {
  const [text, setText] = useState(lesson.directorComment ?? "");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Комментарий директора</h3>
        <p className="muted" style={{ marginBottom: 12 }}>{lesson.title}</p>
        <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 120 }} />
        <div className="form-row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => { onSave(lesson.id, text); onClose(); }}>Сохранить</button>
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
        </div>
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
