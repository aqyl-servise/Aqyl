"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, AuthUser } from "../lib/api";
import { Language, translations } from "../lib/translations";
import { TeacherApp } from "./teacher/teacher-app";
import { AdminApp } from "./admin/admin-app";
import { ClassTeacherApp } from "./class-teacher/class-teacher-app";
import { StudentApp } from "./student/student-app";

const ADMIN_ROLES = [
  "admin", "principal",
  "vice_principal", "vice_principal_academic", "vice_principal_education",
  "psychologist", "social_pedagogue",
];

export function DashboardApp() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("ru");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  async function logout() {
    localStorage.removeItem("aqyl-token");
    await fetch("/api/auth/clear-cookie", { method: "POST" });
    setToken(null);
    setUser(null);
    router.replace("/login");
  }

  // Pick up token + language on mount; bounce to /login if absent.
  useEffect(() => {
    const lang = localStorage.getItem("aqyl-lang") as Language | null;
    if (lang) setLanguage(lang);
    const tok = localStorage.getItem("aqyl-token");
    if (!tok) {
      router.replace("/login");
      return;
    }
    // Подстраховка: переустанавливаем httpOnly cookie через сервер на случай,
    // если она отсутствует (а токен в localStorage есть).
    fetch("/api/auth/set-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: tok }),
    }).catch(() => {});
    setToken(tok);
  }, [router]);

  // Load the authenticated user; on failure clear and return to /login.
  useEffect(() => {
    if (!token) return;
    api.getMe(token).then((u) => {
      setUser(u);
      setLanguage((u.preferredLanguage as Language) || "ru");
    }).catch(() => {
      localStorage.removeItem("aqyl-token");
      fetch("/api/auth/clear-cookie", { method: "POST" }).catch(() => {});
      setToken(null);
      router.replace("/login");
    });
  }, [token, router]);

  useEffect(() => { localStorage.setItem("aqyl-lang", language); }, [language]);

  const t = translations[language];

  if (!token || !user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <span className="spinner" />
      </div>
    );
  }

  const role = user.role;

  if (role === "teacher") {
    return <TeacherApp token={token} user={user} language={language} setLanguage={setLanguage} onLogout={logout} />;
  }
  if (ADMIN_ROLES.includes(role)) {
    return <AdminApp token={token} user={user} language={language} setLanguage={setLanguage} onLogout={logout} />;
  }
  if (role === "class_teacher") {
    return <ClassTeacherApp token={token} user={user} language={language} setLanguage={setLanguage} onLogout={logout} />;
  }
  if (role === "student") {
    return <StudentApp token={token} user={user} language={language} setLanguage={setLanguage} onLogout={logout} />;
  }

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>{t.app_role_unsupported.replace("{role}", role)}</h2>
      <button className="btn btn-ghost" onClick={logout}>{t.logout}</button>
    </div>
  );
}
