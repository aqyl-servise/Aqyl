"use client";
import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

export function AnalyticsPanel({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (!(file instanceof File)) return;
    setBusy(true); setError(null);
    try {
      setResult(await api.uploadAnalytics(token, file));
    } catch { setError("Ошибка загрузки файла"); }
    finally { setBusy(false); }
  }

  const summary = result?.summary as Record<string, unknown> | undefined;
  const topicAnalytics = (result?.topicAnalytics as Array<{ topic: string; average: number }> | undefined) ?? [];

  return (
    <div className="page">
      <h1 className="page-title">📊 {t.analytics}</h1>
      <div className="main-grid">
        <div className="card">
          <h3 className="card-title">Загрузка данных</h3>
          <form onSubmit={handleUpload} className="form-stack">
            <div className="file-drop-zone">
              <span>📁</span>
              <p>Excel / CSV файл с данными успеваемости</p>
              <input name="file" type="file" accept=".xlsx,.xls,.csv" required className="input file-input" />
            </div>
            <p className="hint">{t.analyticsHint}</p>
            {error && <div className="alert alert-error">⚠ {error}</div>}
            <button className="btn btn-primary" disabled={busy}>
              {busy ? <><span className="spinner" /> Анализирую...</> : "↑ Загрузить и анализировать"}
            </button>
          </form>
        </div>

        {summary && (
          <div className="card">
            <h3 className="card-title">Результаты анализа</h3>
            <div className="mini-stats">
              <MiniStat label="Строк" value={Number(summary.totalRows ?? 0)} />
              <MiniStat label="Классов" value={Number(summary.uniqueClasses ?? 0)} />
              <MiniStat label="Учеников" value={Number(summary.uniqueStudents ?? 0)} />
              <MiniStat label={t.averageScore} value={`${String(summary.averageScore)}%`} />
            </div>
            {topicAnalytics.length > 0 && (
              <>
                <p className="result-section-title" style={{ marginTop: 16 }}>Успеваемость по темам</p>
                <ul className="topic-list">
                  {topicAnalytics.map((item) => (
                    <li key={item.topic} className="topic-item">
                      <span>{item.topic}</span>
                      <span className={`score-chip ${item.average < 60 ? "score-low" : item.average < 80 ? "score-mid" : "score-high"}`}>
                        {item.average}%
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="mini-stat">
      <p className="mini-stat-val">{value}</p>
      <p className="mini-stat-label">{label}</p>
    </div>
  );
}
