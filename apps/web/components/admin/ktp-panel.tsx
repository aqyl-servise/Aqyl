"use client";
import { useEffect, useState } from "react";
import { api, API_URL } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";

type KtpFile = Awaited<ReturnType<typeof api.getKtpFiles>>[number];
type KtpStatus = "unchecked" | "reviewing" | "approved" | "revision";
type MainTab = "ktp" | "ksp" | "review" | "teacher-uploads";
type TeacherUploadTab = "ktp" | "ksp";
type TeacherItem = { id: string; fullName: string; subject?: string };

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

interface Props { token: string; language: Language; userRole: string }

function fmLabels(t: Record<string, string>) {
  return {
    home: t.fm_home, newFolder: t.fm_new_folder, upload: t.fm_upload,
    uploading: t.fm_uploading, search: t.fm_search, folderName: t.fm_folder_name,
    create: t.fm_create, cancel: t.cancel, noFiles: t.fm_no_files,
    download: t.fm_download, delete: t.fm_delete, loading: t.loading,
  };
}

function statusBadge(status: string, t: Record<string, string>) {
  const map: Record<string, { label: string; color: string }> = {
    unchecked: { label: t.ktp_status_unchecked, color: "var(--muted)" },
    reviewing: { label: t.ktp_status_reviewing, color: "#f59e0b" },
    approved: { label: t.ktp_status_approved, color: "var(--success)" },
    revision: { label: t.ktp_status_revision, color: "var(--warn)" },
  };
  const s = map[status] ?? map.unchecked;
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: s.color, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function GradeGrid({ onSelect, t }: { onSelect: (g: number) => void; t: Record<string, string> }) {
  return (
    <div className="card" style={{ marginTop: 0 }}>
      <p style={{ color: "var(--muted)", marginBottom: 16, fontSize: 14 }}>{t.ktp_select_grade}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
        {GRADES.map((g) => (
          <button
            key={g}
            className="btn btn-outline"
            style={{ padding: "18px 8px", fontSize: 16, fontWeight: 700, borderRadius: 10 }}
            onClick={() => onSelect(g)}
          >
            {g} {t.ktp_grade_n}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewPane({
  token, grade, t, isAdmin,
}: {
  token: string; grade: number; t: Record<string, string>; isAdmin: boolean;
}) {
  const section = `ktp-grade-${grade}`;
  const [files, setFiles] = useState<KtpFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [localReviews, setLocalReviews] = useState<Record<string, { status: string; comment: string }>>({});

  useEffect(() => {
    setLoading(true);
    api.getKtpFiles(token, section)
      .then((data) => {
        setFiles(data);
        const init: Record<string, { status: string; comment: string }> = {};
        data.forEach((f) => {
          init[f.id] = { status: f.review?.status ?? "unchecked", comment: f.review?.comment ?? "" };
        });
        setLocalReviews(init);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, section]);

  async function handleSave(fileId: string) {
    const rev = localReviews[fileId];
    if (!rev) return;
    setSaving((s) => ({ ...s, [fileId]: true }));
    try {
      await api.saveKtpReview(token, fileId, { status: rev.status, comment: rev.comment || undefined });
      setSaved((s) => ({ ...s, [fileId]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [fileId]: false })), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving((s) => ({ ...s, [fileId]: false })); }
  }

  function setField(fileId: string, field: "status" | "comment", value: string) {
    setLocalReviews((prev) => ({ ...prev, [fileId]: { ...prev[fileId], [field]: value } }));
  }

  if (loading) return <p className="empty-state">{t.loading}</p>;
  if (files.length === 0) return <p className="empty-state">{t.ktp_no_files}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {files.map((f) => {
        const isPdf = f.mimetype === "application/pdf";
        const fileUrl = `${API_URL}/files/${f.filename}`;
        const rev = localReviews[f.id] ?? { status: "unchecked", comment: "" };

        return (
          <div key={f.id} style={{
            background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 16,
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            {/* File info row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 22 }}>{isPdf ? "📄" : "📎"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, wordBreak: "break-word" }}>{f.originalName}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {f.uploadedBy?.fullName ?? "—"} · {formatSize(f.size)} · {new Date(f.createdAt).toLocaleDateString("ru-RU")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                {statusBadge(rev.status, t)}
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                  {isPdf ? `👁 ${t.ktp_open_pdf}` : `⬇ ${t.fm_download}`}
                </a>
              </div>
            </div>

            {/* Review controls (admin only) */}
            {isAdmin && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: "0 0 auto" }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Статус</label>
                  <select
                    className="input"
                    style={{ fontSize: 13, padding: "6px 10px", minWidth: 160 }}
                    value={rev.status}
                    onChange={(e) => setField(f.id, "status", e.target.value)}
                  >
                    <option value="unchecked">{t.ktp_status_unchecked}</option>
                    <option value="reviewing">{t.ktp_status_reviewing}</option>
                    <option value="approved">{t.ktp_status_approved}</option>
                    <option value="revision">{t.ktp_status_revision}</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>{t.ktp_comment_label}</label>
                  <input
                    className="input"
                    style={{ fontSize: 13 }}
                    value={rev.comment}
                    onChange={(e) => setField(f.id, "comment", e.target.value)}
                    placeholder="Комментарий..."
                  />
                </div>
                <button
                  className={`btn btn-sm ${saved[f.id] ? "btn-ghost" : "btn-primary"}`}
                  style={{ alignSelf: "flex-end" }}
                  onClick={() => handleSave(f.id)}
                  disabled={saving[f.id]}
                >
                  {saving[f.id] ? t.loading : saved[f.id] ? `✓ ${t.ktp_review_saved}` : t.ktp_save_review}
                </button>
              </div>
            )}

            {/* Show existing comment to non-admins */}
            {!isAdmin && f.review?.comment && (
              <div style={{ fontSize: 13, color: "var(--muted)", background: "var(--surface)", borderRadius: 6, padding: "8px 12px" }}>
                💬 {f.review.comment}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeacherUploadsTab({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const labels = fmLabels(t);
  const [subTab, setSubTab] = useState<TeacherUploadTab>("ktp");
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeacherItem | null>(null);

  useEffect(() => {
    api.getAdminTeachers(token)
      .then(data => setTeachers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (selected) {
    const section = subTab === "ktp" ? `teacher-ktp-${selected.id}` : `teacher-ksp-${selected.id}`;
    return (
      <div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>← {t.attest_back}</button>
          <span style={{ fontWeight: 600 }}>{selected.fullName}</span>
        </div>
        <div className="sc-tabs" style={{ marginBottom: 16 }}>
          <button className={`sc-tab${subTab === "ktp" ? " sc-tab-active" : ""}`} onClick={() => setSubTab("ktp")}>{t.ktp_tab_ktp}</button>
          <button className={`sc-tab${subTab === "ksp" ? " sc-tab-active" : ""}`} onClick={() => setSubTab("ksp")}>{t.ktp_tab_ksp}</button>
        </div>
        <FileManager token={token} section={section} canEdit={false} canUpload={false} labels={labels} />
      </div>
    );
  }

  return (
    <div>
      {loading ? (
        <p className="fm-empty">{t.loading}</p>
      ) : teachers.length === 0 ? (
        <p className="fm-empty">{t.noData}</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>{t.name}</th><th>{t.subject}</th><th>{t.actions}</th></tr>
          </thead>
          <tbody>
            {teachers.map(tc => (
              <tr key={tc.id}>
                <td>{tc.fullName}</td>
                <td>{tc.subject ?? "—"}</td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => setSelected(tc)}>
                    📁 {t.sc_documents_btn}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function KtpPanel({ token, language, userRole }: Props) {
  const t = translations[language];
  const labels = fmLabels(t);
  const isAdmin = ["admin", "principal", "vice_principal"].includes(userRole);

  const [tab, setTab] = useState<MainTab>("ktp");
  const [ktpGrade, setKtpGrade] = useState<number | null>(null);
  const [reviewGrade, setReviewGrade] = useState<number | null>(null);

  const TABS: { key: MainTab; label: string }[] = [
    { key: "ktp", label: t.ktp_tab_ktp },
    { key: "ksp", label: t.ktp_tab_ksp },
    ...(isAdmin ? [{ key: "review" as MainTab, label: t.ktp_tab_review }] : []),
    { key: "teacher-uploads", label: t.nav_teachers },
  ];

  return (
    <div className="page">
      <h1 className="page-title">📝 {t.nav_ktp_plans}</h1>

      <div className="sc-tabs">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            className={`sc-tab${tab === tb.key ? " sc-tab-active" : ""}`}
            onClick={() => { setTab(tb.key); setKtpGrade(null); setReviewGrade(null); }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── КТП tab ── */}
      {tab === "ktp" && (
        ktpGrade === null ? (
          <GradeGrid onSelect={setKtpGrade} t={t} />
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setKtpGrade(null)}>
                {t.ktp_back_grades}
              </button>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{ktpGrade} {t.ktp_grade_n}</h2>
            </div>
            <div className="card" style={{ marginTop: 0 }}>
              <FileManager
                token={token}
                section={`ktp-grade-${ktpGrade}`}
                canEdit={isAdmin}
                canUpload={true}
                labels={labels}
              />
            </div>
          </div>
        )
      )}

      {/* ── КСП/ҚМЖ tab ── */}
      {tab === "ksp" && (
        <div className="card" style={{ marginTop: 0 }}>
          <FileManager
            token={token}
            section="ksp"
            canEdit={isAdmin}
            canUpload={true}
            labels={labels}
          />
        </div>
      )}

      {/* ── Review tab (admin/VP only) ── */}
      {tab === "review" && isAdmin && (
        reviewGrade === null ? (
          <GradeGrid onSelect={setReviewGrade} t={t} />
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setReviewGrade(null)}>
                {t.ktp_back_grades}
              </button>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{reviewGrade} {t.ktp_grade_n} — {t.ktp_tab_review}</h2>
            </div>
            <ReviewPane token={token} grade={reviewGrade} t={t} isAdmin={isAdmin} />
          </div>
        )
      )}

      {/* ── Загрузки учителей ── */}
      {tab === "teacher-uploads" && (
        <TeacherUploadsTab token={token} language={language} t={t} />
      )}
    </div>
  );
}
