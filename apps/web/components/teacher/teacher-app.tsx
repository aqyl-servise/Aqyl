"use client";
import { useState, useEffect, useRef } from "react";
import { api, AuthUser, StudentRow, ClassroomItem } from "../../lib/api";
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

const CONTACT_WHATSAPP = "77000000000";
const CONTACT_EMAIL = "support@aqyl.kz";

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
    { key: "presentations", label: t.nav_presentations ?? "Генерация презентаций", icon: "🔒" },
    { key: "illustrations", label: t.nav_illustrations ?? "Генерация иллюстраций", icon: "🔒" },
    ...(isClassTeacher ? [{ key: "analytics", label: t.nav_analytics, icon: "📊" }] : []),
    ...(isClassTeacher ? [{ key: "class-hours", label: t.nav_class_hours, icon: "🕐" }] : []),
    { key: "teacher-modo", label: t.nav_bbjm, icon: "📑" },
    { key: "teacher-final", label: t.nav_final_attestation, icon: "🎓" },
    { key: "gifted", label: t.nav_gifted, icon: "⭐" },
    { key: "sor-soch", label: t.nav_sor_soch ?? "СОР/СОЧ", icon: "📄" },
  ];

  function handleNav(key: string) {
    if (key === "presentations" || key === "illustrations") {
      setPremiumModal(true);
      return;
    }
    setSection(key);
  }

  return (
    <AppLayout user={user} token={token} language={language} setLanguage={setLanguage}
      onLogout={onLogout} navItems={nav} activeSection={section} onNav={handleNav}>
      {premiumModal && <PremiumModal onClose={() => setPremiumModal(false)} t={t} />}
      {section === "dashboard" && <TeacherDashboard token={token} language={language} t={t} />}
      {section === "profile" && <TeacherProfile token={token} user={user} language={language} t={t} />}
      {section === "students" && <StudentsPanel token={token} language={language} t={t} userRole={user.role} />}
      {section === "ktp" && <LessonGenerator token={token} language={language} t={t} />}
      {section === "tasks" && <TaskGenerator token={token} language={language} t={t} />}
      {section === "assignments" && <AssignmentsPanel token={token} language={language} t={t} />}
      {section === "lessons" && <OpenLessonsPanel token={token} language={language} t={t} isAdmin={false} />}
      {section === "my-ktp-ksp" && <TeacherKtpKspSection token={token} userId={user.id} language={language} t={t} />}
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
      {section === "sor-soch" && <SorSochPanel token={token} language={language} t={t} />}
    </AppLayout>
  );
}

// ── Мои КТП/КСП ─────────────────────────────────────────────────────────────
function TeacherKtpKspSection({ token, userId, language, t }: {
  token: string; userId: string; language: Language; t: Record<string, string>;
}) {
  const [tab, setTab] = useState<"ktp" | "ksp">("ktp");
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>([]);
  const [showClassroomPicker, setShowClassroomPicker] = useState(false);
  const selectedRef = useRef<string[]>([]);
  const labels = fmLabels(t);

  useEffect(() => {
    if (tab !== "ksp" || classrooms.length > 0) return;
    api.getClassrooms(token).then(setClassrooms).catch(() => {});
  }, [tab, token, classrooms.length]);

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
  const [loaded, setLoaded] = useState(false);
  const labels = fmLabels(t);

  useEffect(() => {
    if (tab !== "students" || loaded) return;
    setLoading(true);
    api.getStudents(token)
      .then(data => { setStudents(data); setLoaded(true); })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false));
  }, [tab, token, loaded]);

  const modoStudents = students.filter(s => s.classroom.grade === 4 || s.classroom.grade === 9);

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
            <p className="fm-empty">{loaded ? t.noData : t.loading}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t.name}</th>
                  <th>{t.nav_classrooms}</th>
                </tr>
              </thead>
              <tbody>
                {modoStudents.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--muted)", width: 40 }}>{idx + 1}</td>
                    <td>{s.fullName}</td>
                    <td>{s.classroom.name}</td>
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

function TeacherFinalSection({ token, userId, language, t }: {
  token: string; userId: string; language: Language; t: Record<string, string>;
}) {
  const [tab, setTab] = useState<FinalTab>("students");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const labels = fmLabels(t);

  useEffect(() => {
    if (tab !== "students" || loaded) return;
    setLoading(true);
    api.getStudents(token)
      .then(data => { setStudents(data); setLoaded(true); })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false));
  }, [tab, token, loaded]);

  const finalStudents = students.filter(s => s.classroom.grade === 9 || s.classroom.grade === 11);

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
          loading ? (
            <p className="fm-empty">{t.loading}</p>
          ) : finalStudents.length === 0 ? (
            <p className="fm-empty">{loaded ? t.noData : t.loading}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t.name}</th>
                  <th>{t.nav_classrooms}</th>
                </tr>
              </thead>
              <tbody>
                {finalStudents.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--muted)", width: 40 }}>{idx + 1}</td>
                    <td>{s.fullName}</td>
                    <td>{s.classroom.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
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
  const labels = fmLabels(t);

  useEffect(() => {
    if (active !== "my-students" || studentsLoaded || !user.managedClassroomId) return;
    api.getStudents(token, user.managedClassroomId)
      .then(data => { setClassStudents(data); setStudentsLoaded(true); })
      .catch(() => setStudentsLoaded(true));
  }, [active, token, user.managedClassroomId, studentsLoaded]);

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
        {user.isClassTeacher && (
          <button
            className={`btn ${active === "my-students" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActive(p => p === "my-students" ? null : "my-students")}
          >
            👩‍🎓 Мои ученики
          </button>
        )}
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
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12, fontSize: 15 }}>
            Ученики класса{user.managedClassroomName ? ` — ${user.managedClassroomName}` : ""}
          </h3>
          {!studentsLoaded ? (
            <p className="fm-empty">{t.loading}</p>
          ) : classStudents.length === 0 ? (
            <p className="fm-empty">{t.noData}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ФИО</th>
                  <th>ИИН</th>
                  <th>Дата рождения</th>
                  <th>Родитель</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                    <td className="table-name">{s.fullName}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>{s.iin ?? "—"}</td>
                    <td className="muted">{s.dateOfBirth ?? "—"}</td>
                    <td className="muted">{s.parentName ?? "—"}</td>
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
