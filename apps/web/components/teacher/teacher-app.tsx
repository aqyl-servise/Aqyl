"use client";
import { useState } from "react";
import { AuthUser } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { AppLayout, type NavItem } from "../layout/app-layout";
import { TeacherDashboard } from "./teacher-dashboard";
import { LessonGenerator } from "./lesson-generator";
import { TaskGenerator } from "./task-generator";
import { TeacherProfile } from "./teacher-profile";
import { OpenLessonsPanel } from "./open-lessons-panel";
import { AssignmentsPanel } from "./assignments-panel";
import { StudentsPanel } from "../admin/students-panel";
import { ClassHoursSchedulePanel } from "../admin/class-hours-schedule";
import { SorSochPanel } from "./sor-soch-panel";
import { FLTeacherPanel } from "./fl-panel";
import { MyRatingPanel } from "./my-rating-panel";
import { MaterialsPanel } from "./materials-panel";
import { KmzhPanel } from "./kmzh-panel";
import { VisualizerPanel } from "./visualizer-panel";
import { TextAdapterPanel } from "./text-adapter-panel";
import { MalimetPanel } from "./malimet-panel";
import { NotificationBell } from "./NotificationBell";
import { PremiumModal } from "./PremiumModal";
import { TeacherKtpKspSection } from "./TeacherKtpKspSection";
import { TeacherAnalyticsSection } from "./TeacherAnalyticsSection";
import { TeacherModoSection } from "./TeacherModoSection";
import { TeacherFinalSection } from "./TeacherFinalSection";
import { TeacherGiftedSection } from "./TeacherGiftedSection";
import { TeacherMyClassSection } from "./TeacherMyClassSection";
import { Icon } from "../ui/icon";

export function TeacherApp({ token, user, language, setLanguage, onLogout }: {
  token: string; user: AuthUser; language: Language;
  setLanguage: (l: Language) => void; onLogout: () => void;
}) {
  const [section, setSection] = useState("dashboard");
  const [premiumModal, setPremiumModal] = useState(false);
  const t = translations[language];
  const isClassTeacher = user.isClassTeacher === true;

  const nav: NavItem[] = [
    { key: "dashboard", label: t.nav_dashboard, icon: "grid" },
    { key: "profile", label: t.nav_profile, icon: "user" },
    { key: "students", label: t.nav_students, icon: "graduation" },
    { key: "ktp", label: t.nav_ktp, icon: "pencil" },
    { key: "tasks", label: t.nav_tasks, icon: "pencil" },
    { key: "assignments", label: t.nav_assignments, icon: "clipboard" },
    { key: "lessons", label: t.nav_lessons, icon: "graduation" },
    { key: "my-ktp-ksp", label: t.nav_my_ktp_ksp ?? "Мои КТП/КСП", icon: "folder-open" },
    { key: "materials", label: t.nav_materials ?? "Учебные материалы", icon: "palette" },
    ...(isClassTeacher ? [{ key: "my-class", label: t.nav_my_class ?? "Мой класс", icon: "school" } as NavItem] : []),
    ...(isClassTeacher ? [{ key: "analytics", label: t.nav_analytics, icon: "chart" } as NavItem] : []),
    ...(isClassTeacher ? [{ key: "class-hours", label: t.nav_class_hours, icon: "clock" } as NavItem] : []),
    { key: "teacher-modo", label: t.nav_bbjm, icon: "layers" },
    { key: "teacher-final", label: t.nav_final_attestation, icon: "graduation" },
    { key: "gifted", label: t.nav_gifted, icon: "star" },
    { key: "fl", label: t.nav_fl ?? "Функц. грамотность", icon: "books" },
    { key: "my-rating", label: t.nav_my_rating ?? "Мой рейтинг", icon: "trophy" },
    { key: "sor-soch", label: t.nav_sor_soch ?? "СОР/СОЧ", icon: "file" },
    { key: "kmzh-generator", label: t.nav_kmzh ?? "КМЖ Генератор", icon: "clipboard" },
    { key: "visualizer", label: t.nav_visualizer ?? "Визуализатор", icon: "map" },
    { key: "text-adapter", label: t.nav_text_adapter ?? "Адаптация текста", icon: "book" },
    ...(isClassTeacher ? [{ key: "malimet", label: t.nav_malimet ?? "Мәлімет", icon: "file" } as NavItem] : []),
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
          <h1 className="page-title"><Icon name="clock" size={16} /> {t.nav_class_hours}</h1>
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
      {section === "visualizer" && <VisualizerPanel token={token} language={language} />}
      {section === "text-adapter" && <TextAdapterPanel token={token} language={language} />}
      {section === "malimet" && isClassTeacher && (
        <MalimetPanel token={token} language={language} teacher={user} />
      )}
    </AppLayout>
  );
}
