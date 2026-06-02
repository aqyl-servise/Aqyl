"use client";
import { useState, useEffect } from "react";
import { api, AuthUser } from "../../lib/api";
import { Language } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";
import { fmLabels } from "./teacher-sections-utils";

type AnalyticsView = "quality" | "class" | "by-subject" | "classroom-subjects";
type SubjectTeacherRow = { id: string; subject: string; teacher: { id: string; fullName: string } };

export function TeacherAnalyticsSection({ token, user, language, t }: {
  token: string; user: AuthUser; language: Language; t: Record<string, string>;
}) {
  const userId = user.id;
  const [active, setActive] = useState<AnalyticsView | null>(null);
  const [subjectTeachers, setSubjectTeachers] = useState<SubjectTeacherRow[]>([]);
  const [selectedSubjectTeacher, setSelectedSubjectTeacher] = useState<SubjectTeacherRow | null>(null);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const labels = fmLabels(t);

  useEffect(() => {
    if (active !== "classroom-subjects" || !user.managedClassroomId) return;
    if (subjectTeachers.length > 0) return;
    setSubjectLoading(true);
    api.getClassroomSubjectTeachers(token, user.managedClassroomId)
      .then(setSubjectTeachers)
      .catch(() => {})
      .finally(() => setSubjectLoading(false));
  }, [active, token, user.managedClassroomId, subjectTeachers.length]);

  return (
    <div className="page">
      <h1 className="page-title">📊 {t.nav_analytics}</h1>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {(["quality", "class", "by-subject"] as const).map(key => {
          const labels2: Record<string, string> = {
            quality: t.teacher_analytics_quality ?? "Білім сапасы",
            class: t.teacher_analytics_class_data ?? "Сынып бойынша мәлімет",
            "by-subject": t.analytics_by_subject ?? "По предмету",
          };
          return (
            <button
              key={key}
              className={`btn ${active === key ? "btn-primary" : "btn-outline"}`}
              onClick={() => { setActive(p => p === key ? null : key); setSelectedSubjectTeacher(null); }}
            >
              {key === "quality" ? "📈" : key === "class" ? "📋" : "📚"} {labels2[key]}
            </button>
          );
        })}
        {user.isClassTeacher && user.managedClassroomId && (
          <button
            className={`btn ${active === "classroom-subjects" ? "btn-primary" : "btn-outline"}`}
            onClick={() => { setActive(p => p === "classroom-subjects" ? null : "classroom-subjects"); setSelectedSubjectTeacher(null); }}
          >
            🏫 {t.analytics_classroom_subjects ?? "Предметы класса"}
          </button>
        )}
      </div>

      {active && active !== "classroom-subjects" && (
        <div className="card" style={{ marginTop: 0 }}>
          <FileManager
            token={token}
            section={`analytics-${active === "quality" ? "quality" : active === "class" ? "class" : "subject"}-${userId}`}
            canEdit={true}
            canUpload={true}
            labels={labels}
          />
        </div>
      )}

      {active === "classroom-subjects" && (
        <div className="card" style={{ marginTop: 0 }}>
          {subjectLoading ? (
            <p className="fm-empty">{t.loading}</p>
          ) : selectedSubjectTeacher ? (
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSubjectTeacher(null)}>← {t.attest_back}</button>
                <span style={{ fontWeight: 600 }}>{selectedSubjectTeacher.subject}</span>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>· {selectedSubjectTeacher.teacher.fullName}</span>
              </div>
              <FileManager
                token={token}
                section={`analytics-quality-${selectedSubjectTeacher.teacher.id}`}
                canEdit={false}
                canUpload={false}
                labels={labels}
              />
            </div>
          ) : subjectTeachers.length === 0 ? (
            <p className="fm-empty">{t.noData}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {subjectTeachers.map(st => (
                <div key={st.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{st.subject}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{st.teacher.fullName}</div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setSelectedSubjectTeacher(st)}>
                    📂 {t.sc_documents_btn}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
