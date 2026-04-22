"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type Teacher = Awaited<ReturnType<typeof api.getAdminTeachers>>[number];

export function TeacherListPanel({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getAdminTeachers(token).then(setTeachers).catch(console.error);
  }, [token]);

  const filtered = teachers.filter((t) =>
    t.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (t.subject ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">👨‍🏫 {t.nav_teachers}</h1>
        <input className="input" style={{ maxWidth: 260 }} placeholder={`🔍 ${t.search}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card">
        {filtered.length === 0 ? <p className="empty-state">{t.noData}</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ФИО</th><th>Предмет</th><th>Стаж</th><th>Категория</th>
                <th>Классов</th><th>Учеников</th><th>Средний балл</th><th>Документов</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="table-name">
                    <div>{t.fullName}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{t.email}</div>
                  </td>
                  <td>{t.subject ?? "—"}</td>
                  <td>{t.experience != null ? `${t.experience} л.` : "—"}</td>
                  <td>{t.category ?? "—"}</td>
                  <td>{t.classCount}</td>
                  <td>{t.studentCount}</td>
                  <td>
                    <span className={`score-chip ${t.avgScore < 60 ? "score-low" : t.avgScore < 80 ? "score-mid" : "score-high"}`}>
                      {t.avgScore}%
                    </span>
                  </td>
                  <td>{t.docCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
