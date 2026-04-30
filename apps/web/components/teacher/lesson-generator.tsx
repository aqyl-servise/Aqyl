"use client";
import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";

const CONTACT_WHATSAPP = "77000000000";
const CONTACT_EMAIL = "support@aqyl.kz";

function PremiumModal({ onClose, t }: { onClose: () => void; t: Record<string, string> }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h3 style={{ marginBottom: 12 }}>Premium</h3>
          <p style={{ color: "var(--muted)", marginBottom: 24, lineHeight: 1.6, maxWidth: 340, margin: "0 auto 24px" }}>
            {t.premium_message ?? "Эта функция доступна в Premium версии. Свяжитесь с нами для подключения."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`https://wa.me/${CONTACT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              💬 WhatsApp
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-outline">
              ✉️ Email
            </a>
            <button className="btn btn-ghost" onClick={onClose}>{t.cancel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const SUBJECTS = ["Математика","Физика","Химия","Биология","История","Казахский язык","Русский язык","Русская литература","Английский язык","Информатика","География","Казахская литература"];
const GRADES = Array.from({ length: 11 }, (_, i) => i + 1);

export function LessonGenerator({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const tFull = translations[language];
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPremium, setShowPremium] = useState(false);

  async function handleGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setShowPremium(true);
    return;
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api.generateLessonPlan(token, {
        topic: fd.get("topic"), subject: fd.get("subject"),
        grade: Number(fd.get("grade")), language,
        objectives: fd.get("objectives"), duration: Number(fd.get("duration")),
      });
      setResult(res);
    } catch { setError("Ошибка генерации"); }
    finally { setBusy(false); }
  }

  async function handleExport() {
    if (!result) return;
    try {
      const blob = await api.exportPdf(token, { title: String(result.title), type: "lesson-plan", language, data: result });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${String(result.title)}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { setError("Ошибка экспорта"); }
  }

  const stages = (result?.stages as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <div className="page">
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} t={tFull} />}
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
              🔒 {t.generate}
            </button>
          </form>
        </div>

        {result && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{String(result.title)}</h3>
              <button className="btn btn-outline btn-sm" onClick={handleExport}>↓ {t.exportPdf}</button>
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
