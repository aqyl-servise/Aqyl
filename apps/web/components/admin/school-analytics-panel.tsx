"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type Row = Awaited<ReturnType<typeof api.getAdminAnalytics>>[number];

export function SchoolAnalyticsPanel({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    api.getAdminAnalytics(token).then(setRows).catch(console.error);
  }, [token]);

  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.avgScore, 0) / rows.length) : 0;

  return (
    <div className="page">
      <h1 className="page-title">📈 {t.nav_school_analytics}</h1>
      <div className="stats-row" style={{ marginBottom: 24 }}>
        <div className="stat-card stat-blue">
          <span className="stat-icon">🏫</span>
          <div><p className="stat-label">Классов</p><p className="stat-value">{rows.length}</p></div>
        </div>
        <div className="stat-card stat-green">
          <span className="stat-icon">📊</span>
          <div><p className="stat-label">Средний балл по школе</p><p className="stat-value">{avg}%</p></div>
        </div>
      </div>
      <div className="card">
        {rows.length === 0 ? <p className="empty-state">{t.noData}</p> : (
          <table className="data-table">
            <thead><tr><th>Класс</th><th>Предмет</th><th>Учитель</th><th>Учеников</th><th>Средний балл</th><th>Рейтинг</th></tr></thead>
            <tbody>
              {[...rows].sort((a, b) => b.avgScore - a.avgScore).map((r) => (
                <tr key={r.id}>
                  <td className="table-name">{r.name}</td>
                  <td>{r.subject}</td>
                  <td>{r.teacher}</td>
                  <td>{r.studentCount}</td>
                  <td>
                    <span className={`score-chip ${r.avgScore < 60 ? "score-low" : r.avgScore < 80 ? "score-mid" : "score-high"}`}>
                      {r.avgScore}%
                    </span>
                  </td>
                  <td>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{ width: `${r.avgScore}%`, background: r.avgScore < 60 ? "var(--warn)" : r.avgScore < 80 ? "#f59e0b" : "var(--success)" }} />
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
