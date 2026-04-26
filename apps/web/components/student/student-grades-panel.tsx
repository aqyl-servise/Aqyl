"use client";
import { useEffect, useState } from "react";
import { api, GradeRow } from "../../lib/api";

export function StudentGradesPanel({ token, t }: { token: string; t: Record<string, string> }) {
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStudentGrades(token)
      .then(setGrades)
      .catch(() => setError(t.student_no_profile))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="muted">{t.loading}</p>;
  if (error) return <div className="alert alert-error"><span>⚠</span> {error}</div>;
  if (grades.length === 0) return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">🏆 {t.nav_student_grades}</h1></div>
      <p className="empty-state">{t.no_grades}</p>
    </div>
  );

  // Group by subject, compute averages
  const graded = grades.filter((g) => g.status === "graded" && g.score != null);
  const subjectMap = new Map<string, { scores: number[]; maxes: number[] }>();
  for (const g of graded) {
    const sub = g.assignment.subject;
    if (!subjectMap.has(sub)) subjectMap.set(sub, { scores: [], maxes: [] });
    subjectMap.get(sub)!.scores.push(g.score!);
    subjectMap.get(sub)!.maxes.push(g.assignment.maxScore);
  }

  const subjectAverages = [...subjectMap.entries()].map(([subject, { scores, maxes }]) => ({
    subject,
    avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    maxAvg: Math.round((maxes.reduce((a, b) => a + b, 0) / maxes.length) * 10) / 10,
    count: scores.length,
  })).sort((a, b) => a.subject.localeCompare(b.subject));

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🏆 {t.nav_student_grades}</h1>
      </div>

      {subjectAverages.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {subjectAverages.map((s) => (
            <div key={s.subject} className="card" style={{ minWidth: 140, textAlign: "center", padding: "12px 16px" }}>
              <div style={{ fontSize: 12, color: "var(--text-secondary, #666)", marginBottom: 4 }}>{s.subject}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--primary)" }}>{s.avg}</div>
              <div className="muted" style={{ fontSize: 11 }}>{t.avg_score} / {s.maxAvg}</div>
              <div className="muted" style={{ fontSize: 10 }}>{s.count} заданий</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t.subject}</th>
              <th>{t.title}</th>
              <th>{t.teacher_label}</th>
              <th>{t.status}</th>
              <th>Балл</th>
              <th>{t.date}</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g) => (
              <tr key={g.id}>
                <td>
                  <span className="role-chip role-teacher">{g.assignment.subject}</span>
                </td>
                <td className="table-name">{g.assignment.title}</td>
                <td className="muted">{g.assignment.teacher?.fullName ?? "—"}</td>
                <td>
                  {g.status === "graded" ? (
                    <span style={{ color: "var(--success, #28a745)", fontWeight: 600 }}>{t.status_graded}</span>
                  ) : (
                    <span style={{ color: "var(--primary)" }}>{t.status_submitted}</span>
                  )}
                </td>
                <td style={{ fontWeight: 700 }}>
                  {g.score != null ? (
                    <span style={{ color: "var(--primary)" }}>
                      {g.score} <span className="muted" style={{ fontWeight: 400 }}>/ {g.assignment.maxScore}</span>
                    </span>
                  ) : "—"}
                </td>
                <td className="muted">
                  {g.submittedAt ? new Date(g.submittedAt).toLocaleDateString("ru-RU") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
