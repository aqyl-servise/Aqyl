"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";

type Teacher = Awaited<ReturnType<typeof api.getAdminTeachers>>[number];

const CATEGORY_KEYS: Record<string, string> = {
  "stazher": "attest_category_second",
  "pedagog": "attest_category_first",
  "moderator": "attest_category_highest",
  "expert": "attest_category_expert",
  "researcher": "attest_category_researcher",
  "master": "attest_category_master",
};

export function TeacherListPanel({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Teacher | null>(null);

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
                <th>{t.fullNameLabel}</th><th>{t.teacher_subject}</th><th>{t.teacher_experience_years}</th><th>{t.category}</th>
                <th>{t.classes}</th><th>{t.students}</th><th>{t.averageScore}</th><th>{t.documents}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tc) => (
                <tr key={tc.id} style={{ cursor: "pointer" }} onClick={() => setSelected(tc)}>
                  <td className="table-name">
                    <div>{tc.fullName}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{tc.email}</div>
                  </td>
                  <td>{tc.subject ?? "—"}</td>
                  <td>{tc.experience != null ? `${tc.experience} л.` : "—"}</td>
                  <td>{tc.category ? (t[CATEGORY_KEYS[tc.category]] ?? tc.category) : "—"}</td>
                  <td>{tc.classCount}</td>
                  <td>{tc.studentCount}</td>
                  <td>
                    <span className={`score-chip ${tc.avgScore < 60 ? "score-low" : tc.avgScore < 80 ? "score-mid" : "score-high"}`}>
                      {tc.avgScore}%
                    </span>
                  </td>
                  <td>{tc.docCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <TeacherProfileModal teacher={selected} token={token} t={t} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function TeacherProfileModal({ teacher, token, t, onClose }: {
  teacher: Teacher;
  token: string;
  t: Record<string, string>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"info" | "docs">("info");
  const fmLabels = {
    home: t.fm_home, newFolder: t.fm_new_folder,
    upload: t.fm_upload, uploading: t.fm_uploading,
    search: t.fm_search, folderName: t.fm_folder_name,
    create: t.fm_create, cancel: t.cancel,
    noFiles: t.fm_no_files, download: t.fm_download,
    delete: t.fm_delete, loading: t.loading,
    sort: t.fm_sort, sortDate: t.fm_sort_date,
    sortName: t.fm_sort_name, sortAuthor: t.fm_sort_author,
    pin: t.fm_pin, unpin: t.fm_unpin,
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 640, width: "95%", maxHeight: "90vh", overflow: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: "0 0 4px" }}>{teacher.fullName}</h2>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>{teacher.email}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="sc-tabs" style={{ marginBottom: 0 }}>
          <button className={`sc-tab${tab === "info" ? " sc-tab-active" : ""}`} onClick={() => setTab("info")}>
            👤 {t.tab_info}
          </button>
          <button className={`sc-tab${tab === "docs" ? " sc-tab-active" : ""}`} onClick={() => setTab("docs")}>
            📂 {t.documents}
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          {tab === "info" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
              <InfoRow label={t.teacher_subject} value={teacher.subject} />
              <InfoRow label={t.teacher_experience_years} value={teacher.experience != null ? String(teacher.experience) : undefined} />
              <InfoRow label={t.category} value={teacher.category ? (t[CATEGORY_KEYS[teacher.category]] ?? teacher.category) : undefined} />
              <InfoRow label={t.classes} value={String(teacher.classCount)} />
              <InfoRow label={t.students} value={String(teacher.studentCount)} />
              <InfoRow label={t.documents} value={String(teacher.docCount)} />
              <InfoRow label={t.averageScore} value={`${teacher.avgScore}%`} />
            </div>
          )}

          {tab === "docs" && (
            <div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>{t.nav_ktp_storage}</p>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t.ktp_tab_ktp}</p>
                <FileManager token={token} section={`teacher-ktp-${teacher.id}`} canEdit={false} canUpload={false} labels={fmLabels} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t.ktp_tab_ksp}</p>
                <FileManager token={token} section={`teacher-ksp-${teacher.id}`} canEdit={false} canUpload={false} labels={fmLabels} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      <span className="muted" style={{ fontSize: 12 }}>{label}</span>
      <div style={{ fontWeight: 600, marginTop: 2 }}>{value ?? "—"}</div>
    </div>
  );
}
