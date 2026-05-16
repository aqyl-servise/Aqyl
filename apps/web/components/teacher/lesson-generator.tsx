"use client";
import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";

const SUBJECTS = ["Математика","Физика","Химия","Биология","История","Казахский язык","Русский язык","Русская литература","Английский язык","Информатика","География","Казахская литература"];
const GRADES = Array.from({ length: 11 }, (_, i) => i + 1);

export function LessonGenerator({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  translations[language]; // ensure correct language is loaded
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [lastParams, setLastParams] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const params: Record<string, unknown> = {
      topic: fd.get("topic"),
      subject: fd.get("subject"),
      grade: Number(fd.get("grade")),
      language,
      objectives: fd.get("objectives"),
      duration: Number(fd.get("duration")),
    };
    setLastParams(params);
    try {
      const res = await api.generateLessonPlan(token, params);
      setResult(res);
      setFromCache(Boolean(res.fromCache));
    } catch {
      setError("Ошибка генерации");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    if (!lastParams || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.generateLessonPlan(token, { ...lastParams, bypassCache: true });
      setResult(res);
      setFromCache(false);
    } catch {
      setError("Ошибка генерации");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    if (!result) return;
    try {
      const blob = await api.exportPdf(token, { title: String(result.title), type: "lesson-plan", language, data: result });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${String(result.title)}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Ошибка экспорта");
    }
  }

  const stages = (result?.stages as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <div className="page">
      <h1 className="page-title">📝 {t.lessonPlan}</h1>
      <div className="main-grid">
        <div className="card">
          <h3 className="card-title">Параметры</h3>
          <form onSubmit={handleGenerate} className="form-stack">
            <Field label={t.topic} name="topic" defaultValue="Линейные уравнения" />
            <div className="form-row">
              <div className="field">
                <label className="field-label">{t.subject}</label>
                <select name="subject" className="input">
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">{t.grade}</label>
                <select name="grade" className="input">
                  {GRADES.map((g) => <option key={g} value={g}>{g} класс</option>)}
                </select>
              </div>
            </div>
            <Field label={t.duration} name="duration" type="number" defaultValue="45" />
            <div className="field">
              <label className="field-label">{t.objective}</label>
              <textarea name="objectives" className="textarea" defaultValue="Ученики научатся решать линейные уравнения." />
            </div>
            {error && <div className="alert alert-error">⚠ {error}</div>}
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? "⏳ Генерация..." : `✨ ${t.generate}`}
            </button>
          </form>
        </div>

        {result && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3 className="card-title" style={{ margin: 0 }}>{String(result.title)}</h3>
                {fromCache && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "#e8f5e9", color: "#2e7d32",
                    fontSize: 12, padding: "2px 8px", borderRadius: 12,
                    fontWeight: 500, whiteSpace: "nowrap",
                  }}>
                    ⚡ {t.kmzh_from_cache}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleRegenerate}
                  disabled={busy}
                  type="button"
                  title={t.kmzh_regenerate}
                >
                  🔄 {t.kmzh_regenerate}
                </button>
                <button className="btn btn-outline btn-sm" onClick={handleExport}>↓ {t.exportPdf}</button>
              </div>
            </div>
            <div className="result-meta" style={{ marginBottom: 16 }}>
              <span className="badge">{String(result.subject)}</span>
              <span className="badge">{String(result.grade)} кл.</span>
              <span className="badge">{String(result.duration)} мин</span>
            </div>
            {((result.materials as string[] | undefined) ?? []).length > 0 && (
              <div className="result-section">
                <p className="result-section-title">{t.materials}</p>
                <ul className="result-list">{((result.materials as string[]) ?? []).map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              {stages.map((stage, i) => (
                <div key={i} className="stage-item">
                  <div className="stage-num">{i + 1}</div>
                  <div className="stage-body">
                    <p className="stage-name">{String(stage.name)} · {String(stage.duration)}</p>
                    <p className="stage-desc">{String(stage.teacherActivity)}</p>
                    <p className="stage-desc muted">{String(stage.studentActivity)}</p>
                  </div>
                </div>
              ))}
            </div>
            {result.homework != null && (
              <div className="hw-box"><span className="hw-label">📚 {t.homework}:</span><span>{String(result.homework)}</span></div>
            )}
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
