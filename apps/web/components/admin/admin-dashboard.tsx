"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type Overview = Awaited<ReturnType<typeof api.getAdminOverview>>;

export function AdminDashboard({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    api.getAdminOverview(token).then(setData).catch(console.error);
  }, [token]);

  if (!data) return <div className="page-loading">{t.loading}</div>;

  return (
    <div className="page">
      <h1 className="page-title">{t.nav_dashboard}</h1>
      <div className="stats-row">
        <StatCard icon="👨‍🏫" label={t.nav_teachers} value={data.teachers} color="blue" />
        <StatCard icon="🏫" label={t.classes} value={data.classrooms} color="purple" />
        <StatCard icon="👩‍🎓" label={t.students} value={data.students} color="green" />
        <StatCard icon="📊" label={t.averageScore} value={`${data.avgScore}%`} color="orange" />
      </div>
      <div className="stats-row" style={{ marginTop: 0 }}>
        <StatCard icon="📄" label={t.documents} value={data.documents} color="blue" />
        <StatCard icon="🎓" label={t.nav_lessons} value={data.openLessons} color="purple" />
        <StatCard icon="📋" label={t.nav_protocols} value={data.protocols} color="green" />
        <div className="stat-card" style={{ background: "var(--accent-light)", border: "2px dashed var(--accent)" }}>
          <span style={{ fontSize: 28 }}>📱</span>
          <div>
            <p className="stat-label">Всего пользователей</p>
            <p className="stat-value">{data.teachers + data.students}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <span className="stat-icon">{icon}</span>
      <div><p className="stat-label">{label}</p><p className="stat-value">{value}</p></div>
    </div>
  );
}
