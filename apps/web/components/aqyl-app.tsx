"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, AuthUser } from "../lib/api";
import { Language, translations } from "../lib/translations";
import { TeacherApp } from "./teacher/teacher-app";
import { AdminApp } from "./admin/admin-app";
import { ClassTeacherApp } from "./class-teacher/class-teacher-app";

export function AqylApp() {
  const [language, setLanguage] = useState<Language>("ru");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = translations[language];

  useEffect(() => {
    const tok = localStorage.getItem("aqyl-token");
    const lang = localStorage.getItem("aqyl-lang") as Language | null;
    if (lang) setLanguage(lang);
    if (tok) setToken(tok);
  }, []);

  useEffect(() => { localStorage.setItem("aqyl-lang", language); }, [language]);

  useEffect(() => {
    if (!token) return;
    api.getMe(token).then((u) => {
      setUser(u);
      setLanguage((u.preferredLanguage as Language) || "ru");
    }).catch(() => {
      localStorage.removeItem("aqyl-token");
      setToken(null);
    });
  }, [token]);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api.login(String(fd.get("email")), String(fd.get("password")));
      localStorage.setItem("aqyl-token", res.accessToken);
      setToken(res.accessToken);
      setUser(res.user);
      setLanguage((res.user.preferredLanguage as Language) || "ru");
    } catch {
      setError(t.loginTitle + " — ошибка входа. Проверьте email и пароль.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("aqyl-token");
    setToken(null); setUser(null);
  }

  if (!token || !user) {
    return <LoginPage language={language} setLanguage={setLanguage} onLogin={handleLogin} busy={busy} error={error} t={t} />;
  }

  const role = user.role;

  if (role === "teacher") {
    return <TeacherApp token={token} user={user} language={language} setLanguage={setLanguage} onLogout={logout} />;
  }
  if (role === "admin" || role === "principal" || role === "vice_principal") {
    return <AdminApp token={token} user={user} language={language} setLanguage={setLanguage} onLogout={logout} />;
  }
  if (role === "class_teacher") {
    return <ClassTeacherApp token={token} user={user} language={language} setLanguage={setLanguage} onLogout={logout} />;
  }

  // Fallback for unknown roles
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>Роль «{role}» пока не поддерживается в интерфейсе</h2>
      <button className="btn btn-ghost" onClick={logout}>Выйти</button>
    </div>
  );
}

function LoginPage({ language, setLanguage, onLogin, busy, error, t }: {
  language: Language; setLanguage: (l: Language) => void;
  onLogin: (e: FormEvent<HTMLFormElement>) => void;
  busy: boolean; error: string | null; t: Record<string, string>;
}) {
  const demoAccounts = [
    { role: "teacher", email: "teacher@aqyl.kz", pass: "aqyl123" },
    { role: "admin", email: "admin@aqyl.kz", pass: "admin123" },
    { role: "principal", email: "principal@aqyl.kz", pass: "principal123" },
    { role: "vice_principal (уч.)", email: "vp.academic@aqyl.kz", pass: "vp123" },
    { role: "vice_principal (восп.)", email: "vp.welfare@aqyl.kz", pass: "vp123" },
    { role: "class_teacher", email: "ct1@aqyl.kz", pass: "ct123" },
  ];
  return (
    <main className="login-shell">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">✦</span>
          <div>
            <h1 className="logo-name">{t.appName}</h1>
            <p className="logo-sub">{t.subtitle}</p>
          </div>
        </div>
        <div className="lang-row"><LangSwitcher language={language} onChange={setLanguage} /></div>
        <h2 className="login-title">{t.loginTitle}</h2>
        <form onSubmit={onLogin} className="login-form">
          <div className="field">
            <label className="field-label" htmlFor="email">{t.email}</label>
            <input id="email" name="email" type="email" defaultValue="teacher@aqyl.kz" required className="input" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="password">{t.password}</label>
            <input id="password" name="password" type="password" defaultValue="aqyl123" required className="input" />
          </div>
          {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
          <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : t.signIn}
          </button>
        </form>
        <div className="demo-accounts">
          <p className="demo-accounts-title">Демо-аккаунты:</p>
          {demoAccounts.map((a) => (
            <div key={a.email} className="demo-account-row">
              <span className="demo-role">{a.role}</span>
              <span className="demo-creds">{a.email} / {a.pass}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function LangSwitcher({ language, onChange }: { language: Language; onChange: (l: Language) => void }) {
  return (
    <div className="lang-switcher">
      {(["ru", "kz", "en"] as Language[]).map((l) => (
        <button key={l} className={`lang-btn${l === language ? " active" : ""}`} onClick={() => onChange(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
