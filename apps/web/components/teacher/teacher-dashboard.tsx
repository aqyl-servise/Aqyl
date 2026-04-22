"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type DashData = Awaited<ReturnType<typeof api.getDashboard>>;

export function TeacherDashboard({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const [data, setData] = useState<DashData | null>(null);

  useEffect(() => {
    api.getDashboard(token).then(setData).catch(console.error);
  }, [token]);

  if (!data) return <div className="page-loading">{t.loading}</div>;

  return (
    <div className="page">
      <h1 className="page-title">{t.nav_dashboard}</h1>
      <div className="stats-row">
        <StatCard icon="🏫" label={t.classes} value={data.summary.totalClasses} color="blue" />
        <StatCard icon="👩‍🎓" label={t.students} value={data.summary.totalStudents} color="purple" />
        <StatCard icon="📊" label={t.averageScore} value={`${data.summary.averageScore}%`} color="green" />
        <StatCard icon="📄" label={t.documents} value={data.summary.generatedDocuments} color="orange" />
      </div>

      <div className="main-grid">
        <div className="card">
          <h3 className="card-title">📋 {t.classes}</h3>
          <table className="data-table">
            <thead><tr><th>{t.name}</th><th>{t.subject}</th><th>{t.students}</th></tr></thead>
            <tbody>
              {data.classes.map((c) => (
                <tr key={c.id}><td>{c.name}</td><td>{c.subject}</td><td>{c.studentCount}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 className="card-title">📉 {t.weakTopics}</h3>
          {data.topicPerformance.length === 0 ? <p className="empty-state">{t.noData}</p> : (
            <ul className="topic-list">
              {data.topicPerformance.map((tp) => (
                <li key={tp.topic} className="topic-item">
                  <span>{tp.topic}</span>
                  <span className={`score-chip ${tp.average < 60 ? "score-low" : tp.average < 80 ? "score-mid" : "score-high"}`}>
                    {tp.average}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">⚠️ {t.weakStudents}</h3>
          {data.strugglingStudents.length === 0 ? <p className="empty-state">Все успевают ✓</p> : (
            <ul className="doc-list">
              {data.strugglingStudents.map((s) => (
                <li key={s.id} className="doc-item">
                  <span className="doc-title">{s.fullName} <span className="muted">({s.classroom})</span></span>
                  <span className="score-chip score-low">{s.average}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">📄 {t.recentDocs}</h3>
          {data.recentDocuments.length === 0 ? <p className="empty-state">{t.noData}</p> : (
            <ul className="doc-list">
              {data.recentDocuments.map((d) => (
                <li key={d.id} className="doc-item">
                  <span className="doc-title">{d.title}</span>
                  <span className="badge badge-sm">{d.type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <span className="stat-icon">{icon}</span>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );
}
