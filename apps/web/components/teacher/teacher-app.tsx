"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { api, AuthUser, StudentRow, ClassroomItem, ClassroomFullInfo, GiftedAssignment } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { AppLayout } from "../layout/app-layout";
import { TeacherDashboard } from "./teacher-dashboard";
import { LessonGenerator } from "./lesson-generator";
import { TaskGenerator } from "./task-generator";
import { AnalyticsPanel } from "./analytics-panel";
import { TeacherProfile } from "./teacher-profile";
import { OpenLessonsPanel } from "./open-lessons-panel";
import { AssignmentsPanel } from "./assignments-panel";
import { StudentsPanel } from "../admin/students-panel";
import { FileManager } from "../ui/file-manager";
import { ClassHoursSchedulePanel } from "../admin/class-hours-schedule";
import { SorSochPanel } from "./sor-soch-panel";
import { FLTeacherPanel } from "./fl-panel";
import { MyRatingPanel } from "./my-rating-panel";
import { MaterialsPanel } from "./materials-panel";
import { KmzhPanel } from "./kmzh-panel";
import { MalimetPanel } from "./malimet-panel";

const CONTACT_WHATSAPP = "77000000000";
const CONTACT_EMAIL = "support@aqyl.kz";

type TeacherNotification = { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string };

function NotificationBell({ token, t }: { token: string; t: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<TeacherNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.getUnreadNotificationCount(token);
      setUnread(res.count);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  useEffect(() => {
    if (!open || loaded) return;
    api.getMyNotifications(token)
      .then(data => { setItems(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [open, loaded, token]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleMarkRead(id: string) {
    await api.markNotificationRead(token, id).catch(() => {});
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  }

  async function handleMarkAll() {
    await api.markAllNotificationsRead(token).catch(() => {});
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "только что";
    if (mins < 60) return `${mins} мин. назад`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ч. назад`;
    return `${Math.floor(hrs / 24)} дн. назад`;
  }

  return (
    <div ref={dropdownRef} style={{ position: "fixed", top: 16, right: 72, zIndex: 300 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: "relative", width: 40, height: 40, borderRadius: "50%",
          border: "1px solid var(--border)", background: "var(--surface)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
        title={t.notifications_title ?? "Уведомления"}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "var(--danger, #ef4444)", color: "#fff",
            borderRadius: "50%", minWidth: 18, height: 18,
            fontSize: 11, fontWeight: 700, display: "flex",
            alignItems: "center", justifyContent: "center", padding: "0 3px",
            lineHeight: 1,
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 48, right: 0, width: 340,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          maxHeight: 420, display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{t.notifications_title ?? "Уведомления"}</span>
            {items.some(n => !n.isRead) && (
              <button
                onClick={handleMarkAll}
                style={{ fontSize: 12, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {t.notifications_mark_all ?? "Отметить все прочитанными"}
              </button>
            )}
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {!loaded ? (
              <p style={{ padding: 16, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>Загрузка...</p>
            ) : items.length === 0 ? (
              <p style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
                {t.notifications_empty ?? "Нет новых уведомлений"}
              </p>
            ) : (
              items.map(n => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.isRead) handleMarkRead(n.id); }}
                  style={{
                    padding: "10px 14px", borderBottom: "1px solid var(--border)",
                    cursor: n.isRead ? "default" : "pointer",
                    background: n.isRead ? "transparent" : "var(--primary-light, rgba(46,39,128,0.05))",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: n.isRead ? 400 : 600, color: "var(--text)", flex: 1 }}>
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", flexShrink: 0, marginTop: 4 }} />
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>
                    {n.message.length > 80 ? n.message.slice(0, 80) + "…" : n.message}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PremiumModal({ onClose, t }: { onClose: () => void; t: Record<string, string> }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h3 style={{ marginBottom: 12 }}>Premium</h3>
          <p style={{ color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
            {t.premium_message ?? "Эта функция доступна в Premium версии. Свяжитесь с нами для подключения."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`https://wa.me/${CONTACT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              💬 WhatsApp
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-outline">
              ✉️ Email
            </a>
            <button className="btn btn-ghost" onClick={onClose}>{t.cancel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmLabels(t: Record<string, string>) {
  return {
    home: t.fm_home, newFolder: t.fm_new_folder, upload: t.fm_upload,
    uploading: t.fm_uploading, search: t.fm_search, folderName: t.fm_folder_name,
    create: t.fm_create, cancel: t.cancel, noFiles: t.fm_no_files,
    download: t.fm_download, delete: t.fm_delete, loading: t.loading,
    sort: t.fm_sort, sortDate: t.fm_sort_date, sortName: t.fm_sort_name,
    sortAuthor: t.fm_sort_author, pin: t.fm_pin, unpin: t.fm_unpin,
  };
}

export function TeacherApp({ token, user, language, setLanguage, onLogout }: {
  token: string; user: AuthUser; language: Language;
  setLanguage: (l: Language) => void; onLogout: () => void;
}) {
  const [section, setSection] = useState("dashboard");
  const [premiumModal, setPremiumModal] = useState(false);
  const t = translations[language];
  const isClassTeacher = user.isClassTeacher === true;

  const nav = [
    { key: "dashboard", label: t.nav_dashboard, icon: "⊞" },
    { key: "profile", label: t.nav_profile, icon: "👤" },
    { key: "students", label: t.nav_students, icon: "👩‍🎓" },
    { key: "ktp", label: t.nav_ktp, icon: "📝" },
    { key: "tasks", label: t.nav_tasks, icon: "✏️" },
    { key: "assignments", label: t.nav_assignments, icon: "📋" },
    { key: "lessons", label: t.nav_lessons, icon: "🎓" },
    { key: "my-ktp-ksp", label: t.nav_my_ktp_ksp ?? "Мои КТП/КСП", icon: "📂" },
    { key: "materials", label: t.nav_materials ?? "Учебные материалы", icon: "🎨" },
    ...(isClassTeacher ? [{ key: "my-class", label: t.nav_my_class ?? "Мой класс", icon: "🏫" }] : []),
    ...(isClassTeacher ? [{ key: "analytics", label: t.nav_analytics, icon: "📊" }] : []),
    ...(isClassTeacher ? [{ key: "class-hours", label: t.nav_class_hours, icon: "🕐" }] : []),
    { key: "teacher-modo", label: t.nav_bbjm, icon: "📑" },
    { key: "teacher-final", label: t.nav_final_attestation, icon: "🎓" },
    { key: "gifted", label: t.nav_gifted, icon: "⭐" },
    { key: "fl", label: t.nav_fl ?? "Функц. грамотность", icon: "📚" },
    { key: "my-rating", label: t.nav_my_rating ?? "Мой рейтинг", icon: "🏆" },
    { key: "sor-soch", label: t.nav_sor_soch ?? "СОР/СОЧ", icon: "📄" },
    { key: "kmzh-generator", label: t.nav_kmzh ?? "КМЖ Генератор", icon: "📋" },
    ...(isClassTeacher ? [{ key: "malimet", label: t.nav_malimet ?? "Мәлімет", icon: "📄" }] : []),
  ];

  function handleNav(key: string) {
    setSection(key);
  }

  return (
    <AppLayout user={user} token={token} language={language} setLanguage={setLanguage}
      onLogout={onLogout} navItems={nav} activeSection={section} onNav={handleNav}>
      <NotificationBell token={token} t={t} />
      {premiumModal && <PremiumModal onClose={() => setPremiumModal(false)} t={t} />}
      {section === "dashboard" && <TeacherDashboard token={token} language={language} t={t} />}
      {section === "profile" && <TeacherProfile token={token} user={user} language={language} t={t} />}
      {section === "students" && <StudentsPanel token={token} language={language} t={t} userRole={user.role} />}
      {section === "ktp" && <LessonGenerator token={token} language={language} t={t} />}
      {section === "tasks" && <TaskGenerator token={token} language={language} t={t} />}
      {section === "assignments" && <AssignmentsPanel token={token} language={language} t={t} />}
      {section === "lessons" && <OpenLessonsPanel token={token} language={language} t={t} isAdmin={false} />}
      {section === "my-ktp-ksp" && <TeacherKtpKspSection token={token} userId={user.id} language={language} t={t} />}
      {section === "my-class" && isClassTeacher && (
        <TeacherMyClassSection token={token} user={user} language={language} t={t} />
      )}
      {section === "analytics" && isClassTeacher && (
        <TeacherAnalyticsSection token={token} user={user} language={language} t={t} />
      )}
      {section === "class-hours" && isClassTeacher && (
        <div className="page">
          <h1 className="page-title">🕐 {t.nav_class_hours}</h1>
          {user.managedClassroomName && (
            <p className="muted" style={{ marginTop: -8, marginBottom: 12, fontSize: 14 }}>
              Класс: <strong>{user.managedClassroomName}</strong>
            </p>
          )}
          <div className="card">
            <ClassHoursSchedulePanel token={token} language={language} isAdmin={false} />
          </div>
        </div>
      )}
      {section === "teacher-modo" && (
        <TeacherModoSection token={token} userId={user.id} language={language} t={t} />
      )}
      {section === "teacher-final" && (
        <TeacherFinalSection token={token} userId={user.id} language={language} t={t} />
      )}
      {section === "gifted" && <TeacherGiftedSection token={token} userId={user.id} language={language} t={t} user={user} />}
      {section === "materials" && <MaterialsPanel token={token} language={language} teacher={user} />}
      {section === "presentations" && <MaterialsPanel token={token} language={language} teacher={user} initialTab="presentations" />}
      {section === "illustrations" && <MaterialsPanel token={token} language={language} teacher={user} initialTab="illustrations" />}
      {section === "fl" && <FLTeacherPanel token={token} language={language} />}
      {section === "my-rating" && <MyRatingPanel token={token} language={language} />}
      {section === "sor-soch" && <SorSochPanel token={token} language={language} t={t} />}
      {section === "kmzh-generator" && <KmzhPanel token={token} language={language} teacher={user} />}
      {section === "malimet" && isClassTeacher && (
        <MalimetPanel token={token} language={language} teacher={user} />
      )}
    </AppLayout>
  );
}

// ── Мои КТП/КСП ─────────────────────────────────────────────────────────────
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

function TeacherKtpKspSection({ token, userId, language, t }: {
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
            {/* Classroom assignment selector */}
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

// ── Аналитика (только для классного руководителя) ────────────────────────────
type AnalyticsView = "quality" | "class" | "by-subject" | "classroom-subjects";
type SubjectTeacherRow = { id: string; subject: string; teacher: { id: string; fullName: string } };

function TeacherAnalyticsSection({ token, user, language, t }: {
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

// ── МОДО ─────────────────────────────────────────────────────────────────────
type ModoTab = "students" | "materials" | "corrections";

function TeacherModoSection({ token, userId, language, t }: {
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

// ── Итоговая аттестация ───────────────────────────────────────────────────────
type FinalTab = "students" | "materials" | "monitoring";
type FinalGrade = 9 | 11;

function TeacherFinalSection({ token, userId, language, t }: {
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

// ── Одарённые учащиеся ────────────────────────────────────────────────────────
function TeacherGiftedSection({ token, userId, language, t, user }: {
  token: string; userId: string; language: Language; t: Record<string, string>; user: AuthUser;
}) {
  const [active, setActive] = useState<"achievements" | "workplan" | "my-students" | null>(null);
  const [classStudents, setClassStudents] = useState<StudentRow[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [giftedList, setGiftedList] = useState<GiftedAssignment[]>([]);
  const [giftedLoaded, setGiftedLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalStudents, setModalStudents] = useState<StudentRow[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const labels = fmLabels(t);

  useEffect(() => {
    if (active !== "my-students" || studentsLoaded) return;
    api.getStudents(token)
      .then(data => { setClassStudents(data); setStudentsLoaded(true); })
      .catch(() => setStudentsLoaded(true));
  }, [active, token, studentsLoaded]);

  useEffect(() => {
    if (active !== "my-students" || giftedLoaded) return;
    api.getMyGiftedStudents(token)
      .then(data => { setGiftedList(data); setGiftedLoaded(true); })
      .catch(() => setGiftedLoaded(true));
  }, [active, token, giftedLoaded]);

  useEffect(() => {
    if (!showAddModal) return;
    setModalLoading(true);
    api.searchAllStudents(token, modalSearch || undefined)
      .then(setModalStudents)
      .catch(() => setModalStudents([]))
      .finally(() => setModalLoading(false));
  }, [showAddModal, modalSearch, token]);

  const filteredClassStudents = classStudents.filter(s =>
    s.fullName.toLowerCase().includes(studentSearch.toLowerCase())
  );
  const giftedStudentIds = new Set(giftedList.map(g => g.student?.id));

  async function handleAddGifted(studentId: string) {
    setAddBusy(true);
    try {
      const created = await api.addMyGiftedStudent(token, studentId);
      const student = modalStudents.find(s => s.id === studentId);
      if (student && created) {
        setGiftedList(prev => [...prev, { id: (created as { id: string }).id, student }]);
      }
      setShowAddModal(false);
      setModalSearch("");
    } catch { /* ignore */ } finally { setAddBusy(false); }
  }

  async function handleRemoveGifted(assignmentId: string) {
    await api.removeMyGiftedStudent(token, assignmentId);
    setGiftedList(prev => prev.filter(g => g.id !== assignmentId));
  }

  return (
    <div className="page">
      <h1 className="page-title">⭐ {t.nav_gifted}</h1>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          className={`btn ${active === "achievements" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActive(p => p === "achievements" ? null : "achievements")}
        >
          🏆 {t.gifted_my_achievements ?? "Мои достижения"}
        </button>
        <button
          className={`btn ${active === "workplan" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActive(p => p === "workplan" ? null : "workplan")}
        >
          📋 {t.gifted_my_workplan ?? "Мой план работы"}
        </button>
        <button
          className={`btn ${active === "my-students" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActive(p => p === "my-students" ? null : "my-students")}
        >
          👩‍🎓 Мои ученики
        </button>
      </div>

      {active === "achievements" && (
        <div className="card" style={{ marginTop: 0 }}>
          <FileManager token={token} section={`gifted-achievements-${userId}`} canEdit={true} canUpload={true} labels={labels} />
        </div>
      )}

      {active === "workplan" && (
        <div className="card" style={{ marginTop: 0 }}>
          <FileManager token={token} section={`gifted-workplan-${userId}`} canEdit={true} canUpload={true} labels={labels} />
        </div>
      )}

      {active === "my-students" && (
        <>
          {/* Class roster */}
          <div className="card" style={{ marginTop: 0 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: 15, flex: 1 }}>Мои ученики</h3>
              <input
                className="input" style={{ maxWidth: 220 }}
                placeholder="🔍 Поиск по имени..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                ⭐ Добавить одаренного ученика
              </button>
            </div>
            {!studentsLoaded ? (
              <p className="fm-empty">{t.loading}</p>
            ) : filteredClassStudents.length === 0 ? (
              <p className="fm-empty">{t.noData}</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>ФИО</th><th>Класс</th><th>ИИН</th><th>Родитель</th><th></th></tr>
                </thead>
                <tbody>
                  {filteredClassStudents.map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                      <td className="table-name">{s.fullName}</td>
                      <td className="muted">{s.classroom.name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 13 }}>{s.iin ?? "—"}</td>
                      <td className="muted">{s.parentName ?? "—"}</td>
                      <td>{giftedStudentIds.has(s.id) && <span title="Одарённый">⭐</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Gifted assignments list */}
          {giftedList.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 15 }}>Мои одарённые ученики</h3>
              <table className="data-table">
                <thead><tr><th>#</th><th>ФИО</th><th>Класс</th><th></th></tr></thead>
                <tbody>
                  {giftedList.map((g, idx) => (
                    <tr key={g.id}>
                      <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                      <td className="table-name">⭐ {g.student?.fullName ?? "—"}</td>
                      <td className="muted">{g.student?.classroom?.name ?? "—"}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}
                          onClick={() => handleRemoveGifted(g.id)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add gifted student modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setModalSearch(""); }}>
          <div className="modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>Добавить одаренного ученика</h3>
            <input
              className="input" style={{ marginBottom: 12 }}
              placeholder="🔍 Поиск по имени..."
              value={modalSearch}
              onChange={e => setModalSearch(e.target.value)}
              autoFocus
            />
            {modalLoading ? (
              <p className="fm-empty">{t.loading}</p>
            ) : modalStudents.length === 0 ? (
              <p className="fm-empty">{t.noData}</p>
            ) : (
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                <table className="data-table">
                  <thead><tr><th>ФИО</th><th>Класс</th><th></th></tr></thead>
                  <tbody>
                    {modalStudents.map(s => (
                      <tr key={s.id}>
                        <td className="table-name">{s.fullName}</td>
                        <td className="muted">{s.classroom.name}</td>
                        <td>
                          {giftedStudentIds.has(s.id) ? (
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>⭐ Уже добавлен</span>
                          ) : (
                            <button className="btn btn-primary btn-sm" disabled={addBusy}
                              onClick={() => handleAddGifted(s.id)}>
                              + Добавить
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddModal(false); setModalSearch(""); }}>
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Мой класс (только для классного руководителя) ────────────────────────────
function TeacherMyClassSection({ token, user, language: _language, t }: {
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
