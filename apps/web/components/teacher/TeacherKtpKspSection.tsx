"use client";
import { useState, useEffect, useRef } from "react";
import { api, ClassroomItem } from "../../lib/api";
import { Language } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";
import { fmLabels } from "./teacher-sections-utils";

type KtpReviewRow = { fileId: string; fileName: string; section: string | null; status: string; comment: string | null; reviewedAt: string | null };

const STATUS_STYLE: Record<string, { bg: string; color: string; label: (t: Record<string, string>) => string }> = {
  unchecked: { bg: "#f0f0f0", color: "#666", label: (t) => t.ktp_status_unchecked ?? "Не проверено" },
  reviewing:  { bg: "#dbeafe", color: "#1d4ed8", label: (t) => t.ktp_status_reviewing ?? "На проверке" },
  approved:   { bg: "#dcfce7", color: "#15803d", label: (t) => t.ktp_status_approved ?? "Одобрено" },
  revision:   { bg: "#fee2e2", color: "#b91c1c", label: (t) => t.ktp_status_revision ?? "Требует доработки" },
};

function KtpReviewBadge({ status, t }: { status: string; t: Record<string, string> }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.unchecked;
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label(t)}
    </span>
  );
}

export function TeacherKtpKspSection({ token, userId, language, t }: {
  token: string; userId: string; language: Language; t: Record<string, string>;
}) {
  const [tab, setTab] = useState<"ktp" | "ksp" | "status">("ktp");
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>([]);
  const [showClassroomPicker, setShowClassroomPicker] = useState(false);
  const [reviews, setReviews] = useState<KtpReviewRow[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const selectedRef = useRef<string[]>([]);
  const labels = fmLabels(t);

  useEffect(() => {
    if (tab !== "ksp" || classrooms.length > 0) return;
    api.getClassrooms(token).then(setClassrooms).catch(() => {});
  }, [tab, token, classrooms.length]);

  useEffect(() => {
    if (tab !== "status") return;
    setReviewsLoading(true);
    api.getMyKtpReviews(token)
      .then(setReviews)
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [tab, token]);

  const toggleClassroom = (id: string) => {
    setSelectedClassrooms(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      selectedRef.current = next;
      return next;
    });
  };

  const getExtraUploadData = (): Record<string, string> => {
    if (selectedRef.current.length === 0) return {};
    return { assignedClassrooms: JSON.stringify(selectedRef.current) };
  };

  return (
    <div className="page">
      <h1 className="page-title">📂 {t.nav_my_ktp_ksp ?? "Мои КТП/КСП"}</h1>
      <div className="sc-tabs">
        <button className={`sc-tab${tab === "ktp" ? " sc-tab-active" : ""}`} onClick={() => setTab("ktp")}>
          {t.ktp_tab_ktp}
        </button>
        <button className={`sc-tab${tab === "ksp" ? " sc-tab-active" : ""}`} onClick={() => setTab("ksp")}>
          {t.ktp_tab_ksp}
        </button>
        <button className={`sc-tab${tab === "status" ? " sc-tab-active" : ""}`} onClick={() => setTab("status")}>
          ✅ {t.ktp_my_reviews ?? "Статус проверки"}
        </button>
      </div>
      <div className="card" style={{ marginTop: 0 }}>
        {tab === "ktp" && (
          <FileManager
            token={token}
            section={`teacher-ktp-${userId}`}
            canEdit={true}
            canUpload={true}
            labels={labels}
          />
        )}
        {tab === "ksp" && (
          <>
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
                  {t.ksp_assign_to_class ?? "Привязать к классам при загрузке:"}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowClassroomPicker(v => !v)}
                >
                  🏫 {selectedClassrooms.length > 0
                    ? classrooms.filter(c => selectedClassrooms.includes(c.id)).map(c => c.name).join(", ")
                    : (t.ksp_select_classes ?? "Выбрать классы")}
                </button>
                {selectedClassrooms.length > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedClassrooms([]); selectedRef.current = []; }}>✕</button>
                )}
              </div>
              {showClassroomPicker && classrooms.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {classrooms.map(c => (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 13, padding: "4px 8px", borderRadius: 6, background: selectedClassrooms.includes(c.id) ? "var(--primary-light, #e0f0ff)" : "var(--bg)", border: "1px solid var(--border)" }}>
                      <input
                        type="checkbox"
                        checked={selectedClassrooms.includes(c.id)}
                        onChange={() => toggleClassroom(c.id)}
                        style={{ margin: 0 }}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <FileManager
              token={token}
              section={`teacher-ksp-${userId}`}
              canEdit={true}
              canUpload={true}
              labels={labels}
              getExtraUploadData={getExtraUploadData}
            />
          </>
        )}
        {tab === "status" && (
          <div>
            {reviewsLoading ? (
              <p className="fm-empty">{t.loading ?? "Загрузка..."}</p>
            ) : reviews.length === 0 ? (
              <p className="fm-empty">{t.ktp_no_files ?? "Нет загруженных документов"}</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", fontWeight: 600 }}>{t.fm_uploaded_by ?? "Файл"}</th>
                    <th style={{ padding: "8px 10px", fontWeight: 600 }}>{t.ktp_tab_review ?? "Статус"}</th>
                    <th style={{ padding: "8px 10px", fontWeight: 600 }}>{t.ktp_comment_label ?? "Комментарий"}</th>
                    <th style={{ padding: "8px 10px", fontWeight: 600 }}>{t.ktp_review_date ?? "Дата"}</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.fileId} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 10px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span title={r.fileName}>{r.fileName}</span>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <KtpReviewBadge status={r.status} t={t} />
                      </td>
                      <td style={{ padding: "8px 10px", color: r.status === "revision" ? "#b91c1c" : "inherit", maxWidth: 260 }}>
                        {r.comment ?? "—"}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
