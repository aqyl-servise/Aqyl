"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type Student = { id: string; fullName: string; orderNum?: number };

export function StudentMyClassPanel({ token, t }: { token: string; t: Record<string, string> }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMyClassmates(token)
      .then(setStudents)
      .catch(() => setError(t.student_no_profile ?? "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="spinner" style={{ margin: "60px auto" }} />;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="page">
      <h1 className="page-title">{t.student_classmates_title}</h1>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>№</th>
              <th style={th}>{t.name}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ ...td, width: 48, color: "var(--text-muted)", textAlign: "center" }}>{s.orderNum ?? i + 1}</td>
                <td style={td}>{s.fullName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 16px", background: "var(--bg-alt)", fontWeight: 600, fontSize: 13, textAlign: "left", borderBottom: "1px solid var(--border)" };
const td: React.CSSProperties = { padding: "10px 16px", fontSize: 14 };
