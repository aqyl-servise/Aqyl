"use client";
import { useEffect, useState } from "react";
import { api, StudentRow } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";

type FinalStudent = StudentRow;
type TeacherItem = { id: string; fullName: string; subject?: string };
type MainTab = 9 | 11 | "teachers";
type TeacherView = { teacher: TeacherItem; mode: "materials" | "monitoring" } | null;

interface Props {
  token: string;
  language: Language;
  userRole: string;
}

function fmLabels(t: Record<string, string>) {
  return {
    home: t.fm_home, newFolder: t.fm_new_folder, upload: t.fm_upload,
    uploading: t.fm_uploading, search: t.fm_search, folderName: t.fm_folder_name,
    create: t.fm_create, cancel: t.cancel, noFiles: t.fm_no_files,
    download: t.fm_download, delete: t.fm_delete, loading: t.loading,
  };
}

function exportCsv(students: FinalStudent[], grade: number) {
  const BOM = "﻿";
  const headers = ["ФИО", "Класс", "ИИН", "ФИО родителей"];
  const rows = students.map((s) => [
    s.fullName, s.classroom.name, s.iin ?? "", s.parentName ?? "",
  ].map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
  const csv = BOM + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `final-attestation-grade${grade}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FinalAttestationPanel({ token, language, userRole }: Props) {
  const t = translations[language];
  const labels = fmLabels(t);
  const canEdit = ["admin", "principal", "vice_principal"].includes(userRole);

  const [tab, setTab] = useState<MainTab>(9);

  const [students9, setStudents9] = useState<FinalStudent[]>([]);
  const [students11, setStudents11] = useState<FinalStudent[]>([]);
  const [loaded9, setLoaded9] = useState(false);
  const [loaded11, setLoaded11] = useState(false);
  const [loading9, setLoading9] = useState(false);
  const [loading11, setLoading11] = useState(false);

  const [search, setSearch] = useState("");

  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [teachersLoaded, setTeachersLoaded] = useState(false);
  const [teacherView, setTeacherView] = useState<TeacherView>(null);
  const [teacherSearch, setTeacherSearch] = useState("");

  useEffect(() => {
    if (tab !== 9 || loaded9) return;
    setLoading9(true);
    api.getFinalStudents(token, 9)
      .then((d) => { setStudents9(d); setLoaded9(true); })
      .catch(console.error)
      .finally(() => setLoading9(false));
  }, [tab, token, loaded9]);

  useEffect(() => {
    if (tab !== 11 || loaded11) return;
    setLoading11(true);
    api.getFinalStudents(token, 11)
      .then((d) => { setStudents11(d); setLoaded11(true); })
      .catch(console.error)
      .finally(() => setLoading11(false));
  }, [tab, token, loaded11]);

  useEffect(() => {
    if (tab !== "teachers" || teachersLoaded) return;
    api.getAdminTeachers(token)
      .then((d) => { setTeachers(d); setTeachersLoaded(true); })
      .catch(console.error);
  }, [tab, token, teachersLoaded]);

  const currentGrade = (tab === 9 || tab === 11) ? tab : null;
  const students = currentGrade === 9 ? students9 : currentGrade === 11 ? students11 : [];
  const loading = currentGrade === 9 ? loading9 : loading11;

  const filtered = students.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (s.iin ?? "").includes(search) ||
    s.classroom.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTeachers = teachers.filter((tc) =>
    tc.fullName.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    (tc.subject ?? "").toLowerCase().includes(teacherSearch.toLowerCase())
  );

  if (teacherView) {
    const adminSection = teacherView.mode === "materials"
      ? `final-attestation-materials-${teacherView.teacher.id}`
      : `final-attestation-monitoring-${teacherView.teacher.id}`;
    const teacherSection = teacherView.mode === "materials"
      ? `teacher-final-materials-${teacherView.teacher.id}`
      : `teacher-final-monitoring-${teacherView.teacher.id}`;
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => setTeacherView(null)}>
            ← {t.final_teacher_back}
          </button>
          <h1 className="page-title">
            {teacherView.mode === "materials" ? "📁" : "📊"} {teacherView.teacher.fullName}
            <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 16, fontWeight: 400 }}>
              — {teacherView.mode === "materials" ? t.final_materials_btn : t.final_monitoring_btn}
            </span>
          </h1>
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12, fontWeight: 600 }}>Загружено администрацией</p>
          <FileManager token={token} section={adminSection} canEdit={canEdit} canUpload={canEdit} labels={labels} />
        </div>
        <div className="card">
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12, fontWeight: 600 }}>Загружено учителем</p>
          <FileManager token={token} section={teacherSection} canEdit={false} canUpload={false} labels={labels} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">📝 {t.nav_final_attestation}</h1>

      <div className="sc-tabs">
        {([9, 11, "teachers"] as MainTab[]).map((key) => (
          <button
            key={String(key)}
            className={`sc-tab${tab === key ? " sc-tab-active" : ""}`}
            onClick={() => { setTab(key); setSearch(""); }}
          >
            {key === 9 ? t.final_grade_9 : key === 11 ? t.final_grade_11 : t.final_teachers_db}
          </button>
        ))}
      </div>

      {(tab === 9 || tab === 11) && (
        <div className="card" style={{ marginTop: 0 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="input" style={{ maxWidth: 240 }}
              placeholder={`🔍 ${t.search}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
              Ученики добавляются автоматически из модуля «Ученики»
            </p>
            <div style={{ marginLeft: "auto" }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => exportCsv(search ? filtered : students, tab as number)}
                disabled={loading || students.length === 0}
              >
                📊 {t.final_export_excel}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="empty-state">{t.loading}</p>
          ) : filtered.length === 0 ? (
            <p className="empty-state">{t.noData}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t.name}</th>
                  <th>{t.nav_classrooms ?? "Класс"}</th>
                  <th>{t.iin}</th>
                  <th>{t.final_parent_name}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                    <td className="table-name">{s.fullName}</td>
                    <td>{s.classroom.name}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>{s.iin ?? "—"}</td>
                    <td>{s.parentName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "teachers" && (
        <div className="card" style={{ marginTop: 0 }}>
          <input
            className="input" style={{ maxWidth: 260, marginBottom: 16 }}
            placeholder={`🔍 ${t.search}...`}
            value={teacherSearch}
            onChange={(e) => setTeacherSearch(e.target.value)}
          />
          {!teachersLoaded ? (
            <p className="empty-state">{t.loading}</p>
          ) : filteredTeachers.length === 0 ? (
            <p className="empty-state">{t.noData}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.subject}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((tc) => (
                  <tr key={tc.id}>
                    <td className="table-name">{tc.fullName}</td>
                    <td>{tc.subject ?? "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setTeacherView({ teacher: tc, mode: "materials" })}
                        >
                          📁 {t.final_materials_btn}
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setTeacherView({ teacher: tc, mode: "monitoring" })}
                        >
                          📊 {t.final_monitoring_btn}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
