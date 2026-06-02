"use client";
import { useState, useEffect } from "react";
import { api, StudentRow } from "../../lib/api";
import { Language } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";
import { fmLabels } from "./teacher-sections-utils";

type ModoTab = "students" | "materials" | "corrections";

export function TeacherModoSection({ token, userId, language, t }: {
  token: string; userId: string; language: Language; t: Record<string, string>;
}) {
  const [tab, setTab] = useState<ModoTab>("students");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const labels = fmLabels(t);

  useEffect(() => {
    setLoading(true);
    api.getModoStudents(token)
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [token]);

  const modoStudents = students;

  const TABS: { key: ModoTab; label: string }[] = [
    { key: "students", label: t.teacher_final_students ?? "Список учеников" },
    { key: "materials", label: t.teacher_modo_materials ?? "Мои материалы" },
    { key: "corrections", label: t.teacher_modo_corrections ?? "Работы над ошибками" },
  ];

  return (
    <div className="page">
      <h1 className="page-title">📑 {t.nav_bbjm}</h1>
      <div className="sc-tabs">
        {TABS.map(tb => (
          <button key={tb.key} className={`sc-tab${tab === tb.key ? " sc-tab-active" : ""}`} onClick={() => setTab(tb.key)}>
            {tb.label}
          </button>
        ))}
      </div>
      <div className="card" style={{ marginTop: 0 }}>
        {tab === "students" && (
          loading ? (
            <p className="fm-empty">{t.loading}</p>
          ) : modoStudents.length === 0 ? (
            <p className="fm-empty">{t.noData}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>ФИО</th>
                  <th>Класс</th>
                  <th>Параллель</th>
                </tr>
              </thead>
              <tbody>
                {modoStudents.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--muted)", width: 40 }}>{idx + 1}</td>
                    <td>{s.fullName}</td>
                    <td>{s.classroom.name}</td>
                    <td>{s.classroom.grade} класс</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
        {tab === "materials" && (
          <FileManager
            token={token}
            section={`teacher-modo-materials-${userId}`}
            canEdit={true}
            canUpload={true}
            labels={labels}
          />
        )}
        {tab === "corrections" && (
          <FileManager
            token={token}
            section={`teacher-modo-corrections-${userId}`}
            canEdit={true}
            canUpload={true}
            labels={labels}
          />
        )}
      </div>
    </div>
  );
}
