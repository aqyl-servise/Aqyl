"use client";
import { useState, useEffect } from "react";
import { api, StudentRow } from "../../lib/api";
import { Language } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";
import { fmLabels } from "./teacher-sections-utils";

type FinalTab = "students" | "materials" | "monitoring";
type FinalGrade = 9 | 11;

export function TeacherFinalSection({ token, userId, language, t }: {
  token: string; userId: string; language: Language; t: Record<string, string>;
}) {
  const [tab, setTab] = useState<FinalTab>("students");
  const [grade, setGrade] = useState<FinalGrade>(9);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const labels = fmLabels(t);

  useEffect(() => {
    if (tab !== "students") return;
    setLoading(true);
    api.getFinalStudents(token, grade)
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [tab, grade, token]);

  const TABS: { key: FinalTab; label: string }[] = [
    { key: "students", label: t.teacher_final_students ?? "Список учеников" },
    { key: "materials", label: t.teacher_final_materials_tab ?? "Материалы" },
    { key: "monitoring", label: t.teacher_final_monitoring_tab ?? "Мониторинг" },
  ];

  return (
    <div className="page">
      <h1 className="page-title">🎓 {t.nav_final_attestation}</h1>
      <div className="sc-tabs">
        {TABS.map(tb => (
          <button key={tb.key} className={`sc-tab${tab === tb.key ? " sc-tab-active" : ""}`} onClick={() => setTab(tb.key)}>
            {tb.label}
          </button>
        ))}
      </div>
      <div className="card" style={{ marginTop: 0 }}>
        {tab === "students" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {([9, 11] as FinalGrade[]).map((g) => (
                <button
                  key={g}
                  className={`btn btn-sm ${grade === g ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setGrade(g)}
                >
                  {g} класс
                </button>
              ))}
            </div>
            {loading ? (
              <p className="fm-empty">{t.loading}</p>
            ) : students.length === 0 ? (
              <p className="fm-empty">{t.noData}</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>ФИО</th>
                    <th>Класс</th>
                    <th>ИИН</th>
                    <th>ФИО родителей</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ color: "var(--muted)", width: 40 }}>{idx + 1}</td>
                      <td>{s.fullName}</td>
                      <td>{s.classroom.name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 13 }}>{s.iin ?? "—"}</td>
                      <td>{s.parentName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
        {tab === "materials" && (
          <FileManager
            token={token}
            section={`teacher-final-materials-${userId}`}
            canEdit={true}
            canUpload={true}
            labels={labels}
          />
        )}
        {tab === "monitoring" && (
          <FileManager
            token={token}
            section={`teacher-final-monitoring-${userId}`}
            canEdit={true}
            canUpload={true}
            labels={labels}
          />
        )}
      </div>
    </div>
  );
}
