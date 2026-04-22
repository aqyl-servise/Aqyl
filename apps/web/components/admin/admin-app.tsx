"use client";
import { useState } from "react";
import { AuthUser } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { AppLayout } from "../layout/app-layout";
import { AdminDashboard } from "./admin-dashboard";
import { TeacherListPanel } from "./teacher-list-panel";
import { SchoolAnalyticsPanel } from "./school-analytics-panel";
import { OpenLessonsPanel } from "../teacher/open-lessons-panel";
import { ProtocolsPanel } from "./protocols-panel";
import { ClassHoursPanel } from "./class-hours-panel";
import { UsersPanel } from "./users-panel";
import { GiftedPanel } from "./gifted-panel";

export function AdminApp({ token, user, language, setLanguage, onLogout }: {
  token: string; user: AuthUser; language: Language;
  setLanguage: (l: Language) => void; onLogout: () => void;
}) {
  const [section, setSection] = useState("dashboard");
  const t = translations[language];

  const academicNav = [
    { key: "dashboard", label: t.nav_dashboard, icon: "⊞" },
    { key: "teachers", label: t.nav_teachers, icon: "👨‍🏫" },
    { key: "school-analytics", label: t.nav_school_analytics, icon: "📈" },
    { key: "open-lessons", label: t.nav_lessons, icon: "🎓" },
    { key: "protocols", label: t.nav_protocols, icon: "📋" },
    { key: "class-hours", label: t.nav_class_hours, icon: "🕐" },
    { key: "gifted", label: t.nav_gifted, icon: "⭐" },
  ];
  const adminNav = user.role === "admin"
    ? [...academicNav, { key: "users", label: t.nav_users, icon: "👥" }]
    : academicNav;

  return (
    <AppLayout user={user} token={token} language={language} setLanguage={setLanguage}
      onLogout={onLogout} navItems={adminNav} activeSection={section} onNav={setSection}>
      {section === "dashboard" && <AdminDashboard token={token} language={language} t={t} />}
      {section === "teachers" && <TeacherListPanel token={token} language={language} t={t} />}
      {section === "school-analytics" && <SchoolAnalyticsPanel token={token} language={language} t={t} />}
      {section === "open-lessons" && <OpenLessonsPanel token={token} language={language} t={t} isAdmin={true} />}
      {section === "protocols" && <ProtocolsPanel token={token} language={language} t={t} />}
      {section === "class-hours" && <ClassHoursPanel token={token} language={language} t={t} isAdmin={true} />}
      {section === "users" && user.role === "admin" && <UsersPanel token={token} language={language} t={t} />}
      {section === "gifted" && <GiftedPanel token={token} language={language} t={t} />}
    </AppLayout>
  );
}
