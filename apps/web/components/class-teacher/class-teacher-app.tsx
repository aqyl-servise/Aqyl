"use client";
import { useState } from "react";
import { AuthUser } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { AppLayout } from "../layout/app-layout";
import { ClassHoursPanel } from "../admin/class-hours-panel";
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
      {section === "class-hours" && <ClassHoursPanel token={token} language={language} t={t} isAdmin={false} />}
      {section === "open-lessons" && <OpenLessonsPanel token={token} language={language} t={t} isAdmin={false} />}
    </AppLayout>
  );
}
