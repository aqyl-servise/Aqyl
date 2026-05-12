"use client";
import { useState } from "react";
import { AuthUser } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { AppLayout } from "../layout/app-layout";
import { StudentSchedulePanel } from "./student-schedule-panel";
import { StudentAssignmentsPanel } from "./student-assignments-panel";
import { FLStudentPanel } from "./fl-student-panel";

type Section = "schedule" | "assignments" | "fl";

export function StudentApp({
  token, user, language, setLanguage, onLogout,
}: {
  token: string; user: AuthUser; language: Language;
  setLanguage: (l: Language) => void; onLogout: () => void;
}) {
  const [section, setSection] = useState<Section>("schedule");
  const t = translations[language];

  const navItems = [
    { key: "schedule", label: t.nav_student_schedule, icon: "📅" },
    { key: "assignments", label: t.nav_student_assignments, icon: "📝" },
    { key: "fl", label: t.nav_fl ?? "Функц. грамотность", icon: "📚" },
  ];

  return (
    <AppLayout
      user={user} token={token} language={language} setLanguage={setLanguage} onLogout={onLogout}
      navItems={navItems} activeSection={section} onNav={(k) => setSection(k as Section)}
    >
      {section === "schedule" && <StudentSchedulePanel token={token} t={t} />}
      {section === "assignments" && <StudentAssignmentsPanel token={token} t={t} />}
      {section === "fl" && <FLStudentPanel token={token} language={language} />}
    </AppLayout>
  );
}
