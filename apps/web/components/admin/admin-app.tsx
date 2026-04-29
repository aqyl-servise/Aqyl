"use client";
import { useState } from "react";
import { AuthUser } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { AppLayout } from "../layout/app-layout";
import { AdminDashboard } from "./admin-dashboard";
import { TeacherListPanel } from "./teacher-list-panel";
import { SchoolAnalyticsPanel } from "./school-analytics-panel";
import { OpenLessonsPanel } from "../teacher/open-lessons-panel";
import { SchoolControlPanel } from "./school-control-panel";
import { ClassHoursPanel } from "./class-hours-panel";
import { UsersPanel } from "./users-panel";
import { GiftedPanel } from "./gifted-panel";
import { RegistrationsPanel } from "./registrations-panel";
import { StudentsPanel } from "./students-panel";
import { ClassroomsPanel } from "./classrooms-panel";
import { ModoPanel } from "./modo-panel";
import { AttestationPanel } from "./attestation-panel";
import { FinalAttestationPanel } from "./final-attestation-panel";
import { KtpPanel } from "./ktp-panel";
import { PsychologistPanel } from "./psychologist-panel";
import { SocialPedagoguePanel } from "./social-pedagogue-panel";
import { SchoolInfoPanel } from "./school-info-panel";
import { HouseholdPanel } from "./household-panel";
import { WelfarePanel } from "./welfare-panel";
import { SchoolsPanel } from "./schools-panel";

export function AdminApp({ token, user, language, setLanguage, onLogout }: {
  token: string; user: AuthUser; language: Language;
  setLanguage: (l: Language) => void; onLogout: () => void;
}) {
  const [section, setSection] = useState("dashboard");
  const t = translations[language];

  const baseNav = [
    { key: "dashboard", label: t.nav_dashboard, icon: "⊞" },
    { key: "classrooms", label: t.nav_classrooms, icon: "🏫" },
    { key: "students", label: t.nav_students, icon: "👩‍🎓" },
    { key: "teachers", label: t.nav_teachers, icon: "👨‍🏫" },
    { key: "school-analytics", label: t.nav_school_analytics, icon: "📈" },
    { key: "open-lessons", label: t.nav_lessons, icon: "🎓" },
    { key: "school-control", label: t.nav_protocols, icon: "📋" },
    { key: "class-hours", label: t.nav_class_hours, icon: "🕐" },
    { key: "gifted", label: t.nav_gifted, icon: "⭐" },
    { key: "education-quality", label: t.nav_education_quality, icon: "📊" },
    { key: "welfare", label: t.nav_education, icon: "🌱" },
    { key: "household", label: t.nav_household, icon: "🔧" },
    { key: "bbjm", label: t.nav_bbjm, icon: "📑" },
    { key: "ktp-plans", label: t.nav_ktp_plans, icon: "📝" },
    { key: "attestation", label: t.nav_attestation, icon: "🏆" },
    { key: "final-attestation", label: t.nav_final_attestation, icon: "📝" },
    { key: "psychologist", label: t.nav_psychologist, icon: "🧠" },
    { key: "social-pedagogue", label: t.nav_social_pedagogue, icon: "🤝" },
    { key: "school-info", label: t.nav_school_info, icon: "🏫" },
  ];

  const adminOnlyNav = [
    { key: "users", label: t.nav_users, icon: "👥" },
    { key: "registrations", label: t.nav_registrations, icon: "📬" },
    { key: "schools", label: t.nav_schools, icon: "🏛️" },
  ];

  const navItems = user.role === "admin" ? [...baseNav, ...adminOnlyNav] : baseNav;

  return (
    <AppLayout user={user} token={token} language={language} setLanguage={setLanguage}
      onLogout={onLogout} navItems={navItems} activeSection={section} onNav={setSection}>
      {section === "dashboard" && <AdminDashboard token={token} language={language} t={t} />}
      {section === "classrooms" && <ClassroomsPanel token={token} language={language} t={t} userRole={user.role} />}
      {section === "students" && <StudentsPanel token={token} language={language} t={t} userRole={user.role} />}
      {section === "teachers" && <TeacherListPanel token={token} language={language} t={t} />}
      {section === "school-analytics" && <SchoolAnalyticsPanel token={token} language={language} t={t} />}
      {section === "open-lessons" && <OpenLessonsPanel token={token} language={language} t={t} isAdmin={true} />}
      {section === "school-control" && <SchoolControlPanel token={token} language={language} userRole={user.role} />}
      {section === "class-hours" && <ClassHoursPanel token={token} language={language} t={t} isAdmin={true} />}
      {section === "gifted" && <GiftedPanel token={token} language={language} t={t} />}
      {section === "education-quality" && <div className="page"><h1 className="page-title">📊 {t.nav_education_quality}</h1><p className="empty-state">{t.coming_soon}</p></div>}
      {section === "welfare" && <WelfarePanel token={token} language={language} userRole={user.role} />}
      {section === "household" && <HouseholdPanel token={token} language={language} userRole={user.role} />}
      {section === "bbjm" && <ModoPanel token={token} language={language} userRole={user.role} />}
      {section === "ktp-plans" && <KtpPanel token={token} language={language} userRole={user.role} />}
      {section === "attestation" && <AttestationPanel token={token} language={language} userRole={user.role} />}
      {section === "final-attestation" && <FinalAttestationPanel token={token} language={language} userRole={user.role} />}
      {section === "psychologist" && <PsychologistPanel token={token} language={language} userRole={user.role} />}
      {section === "social-pedagogue" && <SocialPedagoguePanel token={token} language={language} userRole={user.role} />}
      {section === "school-info" && <SchoolInfoPanel token={token} language={language} userRole={user.role} />}
      {section === "users" && user.role === "admin" && <UsersPanel token={token} language={language} t={t} currentUserId={user.id} />}
      {section === "registrations" && user.role === "admin" && <RegistrationsPanel token={token} language={language} t={t} />}
      {section === "schools" && user.role === "admin" && <SchoolsPanel token={token} language={language} t={t} />}
    </AppLayout>
  );
}
