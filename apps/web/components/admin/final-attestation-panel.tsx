"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";

type FinalStudent = Awaited<ReturnType<typeof api.getFinalStudents>>[number];
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
  const headers = ["ФИО", "Предмет", "ИИН", "Email", "Телефон", "ФИО родителей"];
  const rows = students.map((s) => [
    s.fullName, s.subject ?? "", s.iin ?? "", s.email ?? "", s.phone ?? "", s.parentName ?? "",
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

  // Student list state (per grade)
  const [students9, setStudents9] = useState<FinalStudent[]>([]);
  const [students11, setStudents11] = useState<FinalStudent[]>([]);
  const [loaded9, setLoaded9] = useState(false);
  const [loaded11, setLoaded11] = useState(false);
  const [loading9, setLoading9] = useState(false);
  const [loading11, setLoading11] = useState(false);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FinalStudent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinalStudent | null>(null);
  const [busy, setBusy] = useState(false);

  // Teacher database state
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [teachersLoaded, setTeachersLoaded] = useState(false);
  const [teacherView, setTeacherView] = useState<TeacherView>(null);
  const [teacherSearch, setTeacherSearch] = useState("");

  // Load grade 9 students on first open
  useEffect(() => {
    if (tab !== 9 || loaded9) return;
    setLoading9(true);
    api.getFinalStudents(token, 9)
      .then((d) => { setStudents9(d); setLoaded9(true); })
      .catch(console.error)
      .finally(() => setLoading9(false));
  }, [tab, token, loaded9]);

  // Load grade 11 students on first open
  useEffect(() => {
    if (tab !== 11 || loaded11) return;
    setLoading11(true);
    api.getFinalStudents(token, 11)
      .then((d) => { setStudents11(d); setLoaded11(true); })
      .catch(console.error)
      .finally(() => setLoading11(false));
  }, [tab, token, loaded11]);

  // Load teachers for teacher DB tab
  useEffect(() => {
    if (tab !== "teachers" || teachersLoaded) return;
    api.getAdminTeachers(token)
      .then((d) => { setTeachers(d); setTeachersLoaded(true); })
      .catch(console.error);
  }, [tab, token, teachersLoaded]);

  const currentGrade = (tab === 9 || tab === 11) ? tab : null;
  const students = currentGrade === 9 ? students9 : currentGrade === 11 ? students11 : [];
  const loading = currentGrade === 9 ? loading9 : loading11;

  function setStudents(grade: 9 | 11, data: FinalStudent[]) {
    if (grade === 9) setStudents9(data);
    else setStudents11(data);
  }

  const filtered = students.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (s.iin ?? "").includes(search)
  );

  function openAdd() { setEditing(null); setShowForm(true); }
  function openEdit(s: FinalStudent) { setEditing(s); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentGrade) return;
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      const data = {
        grade: currentGrade as number,
        fullName: String(fd.get("fullName") ?? "").trim(),
        subject: String(fd.get("subject") ?? "").trim() || undefined,
        iin: String(fd.get("iin") ?? "").trim() || undefined,
        email: String(fd.get("email") ?? "").trim() || undefined,
        phone: String(fd.get("phone") ?? "").trim() || undefined,
        parentName: String(fd.get("parentName") ?? "").trim() || undefined,
      };
      if (editing) {
        await api.updateFinalStudent(token, editing.id, data);
      } else {
        await api.createFinalStudent(token, data);
      }
      const fresh = await api.getFinalStudents(token, currentGrade as 9 | 11);
      setStudents(currentGrade as 9 | 11, fresh);
      closeForm();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !currentGrade) return;
    setBusy(true);
    try {
      await api.deleteFinalStudent(token, deleteTarget.id);
      const fresh = await api.getFinalStudents(token, currentGrade as 9 | 11);
      setStudents(currentGrade as 9 | 11, fresh);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const filteredTeachers = teachers.filter((tc) =>
    tc.fullName.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    (tc.subject ?? "").toLowerCase().includes(teacherSearch.toLowerCase())
  );

  // Teacher file manager view
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
            onClick={() => { setTab(key); setSearch(""); setShowForm(false); setDeleteTarget(null); }}
          >
            {key === 9 ? t.final_grade_9 : key === 11 ? t.final_grade_11 : t.final_teachers_db}
          </button>
        ))}
      </div>

      {/* ── Grade tabs ── */}
      {(tab === 9 || tab === 11) && (
        <div className="card" style={{ marginTop: 0 }}>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="input" style={{ maxWidth: 240 }}
              placeholder={`🔍 ${t.search}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => exportCsv(search ? filtered : students, tab as number)}
                disabled={loading || students.length === 0}
              >
                📊 {t.final_export_excel}
              </button>
              {canEdit && (
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                  + {t.final_add_student}
                </button>
              )}
            </div>
          </div>

          {/* Add/Edit form */}
          {showForm && (
            <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
              <div className="modal">
                <h2 className="modal-title">{editing ? t.final_edit_student : t.final_add_student}</h2>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label className="form-label">{t.name} *</label>
                    <input name="fullName" className="input" required defaultValue={editing?.fullName ?? ""} placeholder="Фамилия Имя Отчество" />
                  </div>
                  <div>
                    <label className="form-label">{t.final_subject}</label>
                    <input name="subject" className="input" defaultValue={editing?.subject ?? ""} />
                  </div>
                  <div>
                    <label className="form-label">{t.iin}</label>
                    <input name="iin" className="input" defaultValue={editing?.iin ?? ""} maxLength={12} />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input name="email" type="email" className="input" defaultValue={editing?.email ?? ""} />
                  </div>
                  <div>
                    <label className="form-label">{t.final_phone}</label>
                    <input name="phone" className="input" defaultValue={editing?.phone ?? ""} />
                  </div>
                  <div>
                    <label className="form-label">{t.final_parent_name}</label>
                    <input name="parentName" className="input" defaultValue={editing?.parentName ?? ""} />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      {busy ? t.loading : t.save}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={closeForm}>{t.cancel}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete confirm */}
          {deleteTarget && (
            <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
              <div className="modal">
                <p style={{ marginBottom: 16 }}>{t.final_confirm_delete}</p>
                <p style={{ fontWeight: 600, marginBottom: 20 }}>{deleteTarget.fullName}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>
                    {busy ? t.loading : t.final_delete_student}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>{t.cancel}</button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
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
                  <th>{t.final_subject}</th>
                  <th>{t.iin}</th>
                  <th>Email</th>
                  <th>{t.final_phone}</th>
                  <th>{t.final_parent_name}</th>
                  {canEdit && <th>{t.actions}</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                    <td className="table-name">{s.fullName}</td>
                    <td>{s.subject ?? "—"}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>{s.iin ?? "—"}</td>
                    <td>{s.email ?? "—"}</td>
                    <td>{s.phone ?? "—"}</td>
                    <td>{s.parentName ?? "—"}</td>
                    {canEdit && (
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(s)}>🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Teachers DB tab ── */}
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
