"use client";
import { useState, useEffect } from "react";
import { api, AuthUser, ClassroomFullInfo } from "../../lib/api";
import { Language } from "../../lib/translations";

export function TeacherMyClassSection({ token, user, language: _language, t }: {
  token: string; user: AuthUser; language: Language; t: Record<string, string>;
}) {
  const [info, setInfo] = useState<ClassroomFullInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user.managedClassroomId) { setLoading(false); return; }
    api.getClassroomFullInfo(token, user.managedClassroomId)
      .then(setInfo)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, user.managedClassroomId]);

  function exportCsv() {
    if (!info) return;
    const BOM = "﻿";
    const headers = ["№", "ФИО", "ИИН", "Родитель", "Контакт"];
    const rows = info.students.map((s, idx) =>
      [String(idx + 1), s.fullName, s.iin ?? "", s.parentName ?? "", s.parentContact ?? ""]
        .map(v => `"${v.replace(/"/g, '""')}"`).join(",")
    );
    const csv = BOM + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `class-${info.name}-students.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!user.managedClassroomId) {
    return (
      <div className="page">
        <h1 className="page-title">🏫 {t.nav_my_class ?? "Мой класс"}</h1>
        <div className="card"><p className="fm-empty">Вы не являетесь классным руководителем.</p></div>
      </div>
    );
  }
  if (loading) return <div className="page"><h1 className="page-title">🏫 {t.nav_my_class ?? "Мой класс"}</h1><div className="card"><p className="fm-empty">{t.loading}</p></div></div>;
  if (!info) return <div className="page"><h1 className="page-title">🏫 {t.nav_my_class ?? "Мой класс"}</h1><div className="card"><p className="fm-empty">{t.noData}</p></div></div>;

  const filtered = info.students.filter(s =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (s.iin ?? "").includes(search)
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🏫 {info.name} — {info.grade} класс</h1>
        <button className="btn btn-outline btn-sm" onClick={exportCsv}>📊 Экспорт CSV</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="card" style={{ flex: "0 0 auto", padding: "12px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--primary)" }}>{info.statistics.total}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Учеников</div>
        </div>
        {info.classTeacher && (
          <div className="card" style={{ flex: "0 0 auto", padding: "12px 16px" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Классный руководитель</div>
            <div style={{ fontWeight: 600 }}>{info.classTeacher.fullName}</div>
          </div>
        )}
        {info.academicYear && (
          <div className="card" style={{ flex: "0 0 auto", padding: "12px 16px" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Учебный год</div>
            <div style={{ fontWeight: 600 }}>{info.academicYear}</div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 0 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 15, flex: 1 }}>Список учеников</h3>
          <input className="input" style={{ maxWidth: 240 }} placeholder="🔍 Поиск..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {filtered.length === 0 ? <p className="fm-empty">{t.noData}</p> : (
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>ФИО</th><th>ИИН</th><th>Родитель</th><th>Контакт</th></tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr key={s.id}>
                  <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                  <td className="table-name">{s.fullName}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 13 }}>{s.iin ?? "—"}</td>
                  <td className="muted">{s.parentName ?? "—"}</td>
                  <td className="muted">{s.parentContact ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {info.subjectTeachers.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 15 }}>Учителя-предметники</h3>
          <table className="data-table">
            <thead><tr><th>Предмет</th><th>Учитель</th></tr></thead>
            <tbody>
              {info.subjectTeachers.map(st => (
                <tr key={st.id}>
                  <td style={{ fontWeight: 500 }}>{st.subject}</td>
                  <td>{st.teacher.fullName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
