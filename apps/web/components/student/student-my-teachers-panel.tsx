"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type TeacherAssignment = { id: string; subject: string; teacher: { id: string; fullName: string; subject?: string; experience?: number; category?: string } };

export function StudentMyTeachersPanel({ token, t }: { token: string; t: Record<string, string> }) {
  const [items, setItems] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMySubjectTeachers(token)
      .then(setItems)
      .catch(() => setError(t.student_no_profile ?? "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="spinner" style={{ margin: "60px auto" }} />;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="page">
      <h1 className="page-title">{t.student_teachers_title}</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(item => (
          <div key={item.id} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--primary-alpha, rgba(127,119,221,0.15))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👨‍🏫</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{item.teacher.fullName}</div>
              <div style={{ fontSize: 13, color: "var(--primary)", marginTop: 2 }}>{item.subject}</div>
              {item.teacher.category && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{item.teacher.category}</div>}
            </div>
          </div>
        ))}
        {items.length === 0 && <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>{t.noData}</div>}
      </div>
    </div>
  );
}
