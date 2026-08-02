"use client";
import { useState } from "react";
import { AuthUser } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { AppLayout, type NavItem } from "../layout/app-layout";
import { SchoolProvider } from "../../contexts/school-context";
import { SchoolSwitcher } from "./school-switcher";
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
import { SorSochPanel } from "../teacher/sor-soch-panel";
import { FLAdminPanel } from "./fl-panel";
import { RatingAdminPanel } from "./rating-panel";
import { AiUsagePanelAdmin } from "./ai-usage-panel";
import { ScheduleAdminPanel } from "./schedule-panel";
import { QuestionnairesPanel } from "./questionnaires-panel";

export function AdminApp(props: {
  token: string; user: AuthUser; language: Language;
  setLanguage: (l: Language) => void; onLogout: () => void;
}) {
  return (
    <SchoolProvider>
      <AdminAppContent {...props} />
    </SchoolProvider>
  );
}

function AdminAppContent({ token, user, language, setLanguage, onLogout }: {
  token: string; user: AuthUser; language: Language;
  setLanguage: (l: Language) => void; onLogout: () => void;
}) {
  const [section, setSection] = useState("dashboard");
  const t = translations[language];
  const isGlobalAdmin = user.role === "admin" && !user.schoolId;

  const navItems = getNavItemsForRole(user.role, t, isGlobalAdmin);

  return (
    <AppLayout user={user} token={token} language={language} setLanguage={setLanguage}
      onLogout={onLogout} navItems={navItems} activeSection={section} onNav={setSection}
      schoolSwitcher={isGlobalAdmin ? <SchoolSwitcher token={token} language={language} /> : undefined}>
      {section === "dashboard" && <AdminDashboard token={token} language={language} t={t} />}
      {section === "classrooms" && <ClassroomsPanel token={token} language={language} t={t} userRole={user.role} />}
      {section === "students" && <StudentsPanel token={token} language={language} t={t} userRole={user.role} />}
      {section === "teachers" && <TeacherListPanel token={token} language={language} t={t} />}
      {section === "school-analytics" && <SchoolAnalyticsPanel token={token} language={language} t={t} />}
      {section === "open-lessons" && <OpenLessonsPanel token={token} language={language} t={t} isAdmin={true} />}
      {section === "school-control" && <SchoolControlPanel token={token} language={language} userRole={user.role} />}
      {section === "class-hours" && <ClassHoursPanel token={token} language={language} t={t} isAdmin={true} />}
      {section === "gifted" && <GiftedPanel token={token} language={language} userRole={user.role} />}
      {section === "welfare" && <WelfarePanel token={token} language={language} userRole={user.role} />}
      {section === "household" && <HouseholdPanel token={token} language={language} userRole={user.role} />}
      {section === "bbjm" && <ModoPanel token={token} language={language} userRole={user.role} />}
      {section === "ktp-plans" && <KtpPanel token={token} language={language} userRole={user.role} />}
      {section === "attestation" && <AttestationPanel token={token} language={language} userRole={user.role} />}
      {section === "final-attestation" && <FinalAttestationPanel token={token} language={language} userRole={user.role} />}
      {section === "psychologist" && <PsychologistPanel token={token} language={language} userRole={user.role} />}
      {section === "social-pedagogue" && <SocialPedagoguePanel token={token} language={language} userRole={user.role} />}
      {section === "school-info" && <SchoolInfoPanel token={token} language={language} userRole={user.role} />}
      {section === "users" && (user.role === "admin" || user.role === "principal") && <UsersPanel token={token} language={language} t={t} currentUserId={user.id} />}
      {section === "registrations" && (user.role === "admin" || user.role === "principal") && <RegistrationsPanel token={token} language={language} t={t} />}
      {section === "schools" && user.role === "admin" && <SchoolsPanel token={token} language={language} t={t} />}
      {section === "sor-soch" && <SorSochPanel token={token} language={language} t={t} isAdmin={true} userRole={user.role} />}
      {section === "fl" && <FLAdminPanel token={token} language={language} userRole={user.role} />}
      {section === "rating" && <RatingAdminPanel token={token} language={language} userRole={user.role} />}
      {section === "ai-usage" && <AiUsagePanelAdmin token={token} language={language} />}
      {section === "schedule-admin" && <ScheduleAdminPanel token={token} language={language} userRole={user.role} />}
      {section === "questionnaires" && <QuestionnairesPanel token={token} language={language} userRole={user.role} />}
    </AppLayout>
  );
}

function getNavItemsForRole(role: string, t: Record<string, string>, isGlobalAdmin: boolean): NavItem[] {
  const dash: NavItem = { key: "dashboard", label: t.nav_dashboard, icon: "grid" };
  const classrooms: NavItem = { key: "classrooms", label: t.nav_classrooms, icon: "school" };
  const students: NavItem = { key: "students", label: t.nav_students, icon: "graduation" };
  const teachers: NavItem = { key: "teachers", label: t.nav_teachers, icon: "users" };
  const analytics: NavItem = { key: "school-analytics", label: t.nav_school_analytics, icon: "chart-line" };
  const openLessons: NavItem = { key: "open-lessons", label: t.nav_lessons, icon: "graduation" };
  const schoolControl: NavItem = { key: "school-control", label: t.nav_protocols, icon: "clipboard" };
  const gifted: NavItem = { key: "gifted", label: t.nav_gifted, icon: "star" };
  const fl: NavItem = { key: "fl", label: t.nav_fl ?? "Функц. грамотность", icon: "books" };
  const rating: NavItem = { key: "rating", label: t.nav_rating ?? "Рейтинг учителей", icon: "trophy" };
  const aiUsage: NavItem = { key: "ai-usage", label: t.nav_ai_usage ?? "AI", icon: "ai" };
  const welfare: NavItem = { key: "welfare", label: t.nav_education, icon: "sprout" };
  const household: NavItem = { key: "household", label: t.nav_household, icon: "wrench" };
  const bbjm: NavItem = { key: "bbjm", label: t.nav_bbjm, icon: "layers" };
  const ktp: NavItem = { key: "ktp-plans", label: t.nav_ktp_plans, icon: "pencil" };
  const attest: NavItem = { key: "attestation", label: t.nav_attestation, icon: "trophy" };
  const finalAttest: NavItem = { key: "final-attestation", label: t.nav_final_attestation, icon: "pencil" };
  const psychologist: NavItem = { key: "psychologist", label: t.nav_psychologist, icon: "brain" };
  const socialPed: NavItem = { key: "social-pedagogue", label: t.nav_social_pedagogue, icon: "handshake" };
  const schoolInfo: NavItem = { key: "school-info", label: t.nav_school_info, icon: "school" };
  const sorSoch: NavItem = { key: "sor-soch", label: t.nav_sor_soch ?? "СОР/СОЧ", icon: "file" };
  const scheduleAdmin: NavItem = { key: "schedule-admin", label: t.nav_schedule_admin ?? "Расписание", icon: "calendar" };
  const questionnaires: NavItem = { key: "questionnaires", label: t.nav_questionnaires ?? "Анкеты", icon: "clipboard" };

  const baseNav = [
    dash, classrooms, students, teachers, analytics, openLessons, schoolControl,
    gifted, fl, rating, aiUsage, welfare, household, bbjm, ktp, attest, finalAttest,
    psychologist, socialPed, schoolInfo, sorSoch, scheduleAdmin, questionnaires,
  ];

  if (role === "vice_principal" || role === "vice_principal_academic") {
    return [dash, classrooms, students, teachers, analytics, openLessons, schoolControl,
      gifted, fl, rating, bbjm, ktp, attest, finalAttest, sorSoch, scheduleAdmin];
  }
  if (role === "vice_principal_education") {
    return [dash, classrooms, students, teachers, openLessons, schoolControl, rating, welfare, psychologist, socialPed];
  }
  if (role === "psychologist") {
    return [dash, classrooms, students, teachers, openLessons, schoolControl, gifted, welfare, questionnaires];
  }
  if (role === "social_pedagogue") {
    return [dash, classrooms, students, teachers, schoolControl, socialPed];
  }
  if (role === "principal") {
    return [
      ...baseNav,
      { key: "users", label: t.nav_users, icon: "users" },
      { key: "registrations", label: t.nav_registrations, icon: "inbox" },
    ];
  }

  if (role === "admin" && isGlobalAdmin) {
    return [...baseNav,
      { key: "users", label: t.nav_users, icon: "users" },
      { key: "registrations", label: t.nav_registrations, icon: "inbox" },
      { key: "schools", label: t.nav_schools, icon: "bank" },
    ];
  }
  return baseNav;
}
