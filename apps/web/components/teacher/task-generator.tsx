"use client";
import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

const SUBJECTS = ["Математика","Физика","Химия","Биология","История","Казахский язык","Русский язык","Английский язык","Информатика"];

export function TaskGenerator({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api.generateTaskSet(token, {
        topic: fd.get("topic"), subject: fd.get("subject"),
        grade: Number(fd.get("grade")), language,
        type: fd.get("type"), questionCount: Number(fd.get("questionCount")),
      });
      setResult(res);
    } catch { setError("Ошибка генерации"); }
    finally { setBusy(false); }
  }

  async function handleExport() {
    if (!result) return;
    try {
      const blob = await api.exportPdf(token, { title: String(result.title), type: "task-set", language, data: result });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${String(result.title)}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { setError("Ошибка экспорта"); }
  }

  const questions = (result?.questions as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <div className="page">
      <h1 className="page-title">✏️ {t.taskSet}</h1>
      <div className="main-grid">
        <div className="card">
          <h3 className="card-title">Параметры</h3>
          <form onSubmit={handleGenerate} className="form-stack">
            <Field label={t.topic} name="topic" defaultValue="Геометрия" />
            <div className="form-row">
              <div className="field">
                <label className="field-label">{t.subject}</label>
                <select name="subject" className="input">{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              <Field label={t.grade} name="grade" type="number" defaultValue="7" />
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field-label">{t.taskType}</label>
                <select name="type" className="input">
                  <option value="exercise">Упражнение</option>
                  <option value="quiz">Квиз</option>
                  <option value="test">Тест</option>
                  <option value="speaking">Speaking task</option>
                  <option value="writing">Writing task</option>
                </select>
              </div>
              <Field label={t.questions} name="questionCount" type="number" defaultValue="5" />
            </div>
            {error && <div className="alert alert-error">⚠ {error}</div>}
            <button className="btn btn-primary" disabled={busy}>
              {busy ? <><span className="spinner" /> Генерирую...</> : `✦ ${t.generate}`}
            </button>
          </form>
        </div>

        {result && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{String(result.title)}</h3>
              <button className="btn btn-outline btn-sm" onClick={handleExport}>↓ {t.exportPdf}</button>
            </div>
            <ol className="question-list">
              {questions.map((q, i) => (
                <li key={i} className="question-item">
                  <p className="question-prompt">{String(q.prompt)}</p>
                  <p className="question-answer">→ {String(q.answer)}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, type, defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input name={name} type={type ?? "text"} defaultValue={defaultValue} required className="input" />
    </div>
  );
}
