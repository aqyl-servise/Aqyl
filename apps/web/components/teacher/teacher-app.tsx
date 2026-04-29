"use client";
import { useState } from "react";
import { AuthUser } from "../../lib/api";
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

export function TeacherApp({ token, user, language, setLanguage, onLogout }: {
  token: string; user: AuthUser; language: Language;
  setLanguage: (l: Language) => void; onLogout: () => void;
}) {
  const [section, setSection] = useState("dashboard");
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
    { key: "analytics", label: t.nav_analytics, icon: "📊" },
    ...(isClassTeacher ? [{ key: "class-hours", label: t.nav_class_hours, icon: "🕐" }] : []),
    { key: "gifted", label: t.nav_gifted, icon: "⭐" },
  ];

  return (
    <AppLayout user={user} token={token} language={language} setLanguage={setLanguage}
      onLogout={onLogout} navItems={nav} activeSection={section} onNav={setSection}>
      {section === "dashboard" && <TeacherDashboard token={token} language={language} t={t} />}
      {section === "profile" && <TeacherProfile token={token} user={user} language={language} t={t} />}
      {section === "students" && <StudentsPanel token={token} language={language} t={t} userRole={user.role} />}
      {section === "ktp" && <LessonGenerator token={token} language={language} t={t} />}
      {section === "tasks" && <TaskGenerator token={token} language={language} t={t} />}
      {section === "assignments" && <AssignmentsPanel token={token} language={language} t={t} />}
      {section === "lessons" && <OpenLessonsPanel token={token} language={language} t={t} isAdmin={false} />}
      {section === "analytics" && <AnalyticsPanel token={token} language={language} t={t} />}
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
      {section === "gifted" && <TeacherGiftedSection token={token} userId={user.id} language={language} t={t} />}
    </AppLayout>
  );
}

function TeacherGiftedSection({ token, userId, language, t }: {
  token: string; userId: string; language: Language; t: Record<string, string>;
}) {
  const [active, setActive] = useState<"achievements" | "workplan" | null>(null);

  const labels = {
    home: t.fm_home, newFolder: t.fm_new_folder, upload: t.fm_upload,
    uploading: t.fm_uploading, search: t.fm_search, folderName: t.fm_folder_name,
    create: t.fm_create, cancel: t.cancel, noFiles: t.fm_no_files,
    download: t.fm_download, delete: t.fm_delete, loading: t.loading,
    sort: t.fm_sort, sortDate: t.fm_sort_date, sortName: t.fm_sort_name,
    sortAuthor: t.fm_sort_author, pin: t.fm_pin, unpin: t.fm_unpin,
  };

  return (
    <div className="page">
      <h1 className="page-title">⭐ {t.nav_gifted}</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
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
      </div>

      {active && (
        <div className="card" style={{ marginTop: 0 }}>
          <FileManager
            token={token}
            section={`gifted-${active}-${userId}`}
            canEdit={true}
            canUpload={true}
            labels={labels}
          />
        </div>
      )}
    </div>
  );
}
