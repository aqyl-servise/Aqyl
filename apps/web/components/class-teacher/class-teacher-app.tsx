"use client";
import { useState } from "react";
import { AuthUser } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { AppLayout } from "../layout/app-layout";
import { ClassHoursSchedulePanel } from "../admin/class-hours-schedule";
import { OpenLessonsPanel } from "../teacher/open-lessons-panel";

export function ClassTeacherApp({ token, user, language, setLanguage, onLogout }: {
  token: string; user: AuthUser; language: Language;
  setLanguage: (l: Language) => void; onLogout: () => void;
}) {
  const [section, setSection] = useState("class-hours");
  const t = translations[language];

  const navItems = [
    { key: "class-hours", label: t.nav_class_hours, icon: "🕐" },
    { key: "open-lessons", label: t.nav_lessons, icon: "🎓" },
  ];

  return (
    <AppLayout user={user} token={token} language={language} setLanguage={setLanguage}
      onLogout={onLogout} navItems={navItems} activeSection={section} onNav={setSection}>
      {section === "class-hours" && (
        <div className="page">
          <div className="page-header">
            <h1 className="page-title">🕐 {t.nav_class_hours}</h1>
          </div>
          <div className="card">
            <ClassHoursSchedulePanel token={token} language={language} isAdmin={false} />
          </div>
        </div>
      )}
      {section === "open-lessons" && <OpenLessonsPanel token={token} language={language} t={t} isAdmin={false} />}
    </AppLayout>
  );
}
