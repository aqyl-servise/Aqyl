"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, AuthUser } from "../lib/api";
import { Language, translations } from "../lib/translations";
import { TeacherApp } from "./teacher/teacher-app";
import { AdminApp } from "./admin/admin-app";
import { ClassTeacherApp } from "./class-teacher/class-teacher-app";
import { StudentApp } from "./student/student-app";

type View = "login" | "register" | "success" | "forgot";

export function AqylApp() {
  const [language, setLanguage] = useState<Language>("ru");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("login");

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      try {
        const body = JSON.parse(msg) as { message?: string };
        if (body.message === "PENDING") { setError(t.accountPending); return; }
        if (body.message === "REJECTED") { setError(t.accountRejected); return; }
      } catch { /* not JSON */ }
      setError("Ошибка входа. Проверьте email и пароль.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    const confirm = String(fd.get("confirmPassword"));
    if (password !== confirm) {
      setError(t.passwordMismatch);
      setBusy(false);
      return;
    }
    try {
      await api.register({
        fullName: String(fd.get("fullName")),
        email: String(fd.get("email")),
        password,
        role: String(fd.get("role")),
        schoolName: String(fd.get("schoolName")),
      });
      setView("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      try {
        const body = JSON.parse(msg) as { message?: string };
        setError(typeof body.message === "string" ? body.message : "Ошибка регистрации");
      } catch {
        setError("Ошибка регистрации");
      }
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("aqyl-token");
    setToken(null); setUser(null);
  }

  if (!token || !user) {
    return (
      <AuthShell language={language} setLanguage={setLanguage}>
        {view === "login" && (
          <LoginForm
            t={t} busy={busy} error={error}
            onSubmit={handleLogin}
            onRegister={() => { setView("register"); setError(null); }}
            onForgot={() => { setView("forgot"); setError(null); }}
          />
        )}
        {view === "register" && (
          <RegisterForm
            t={t} busy={busy} error={error}
            onSubmit={handleRegister}
            onBack={() => { setView("login"); setError(null); }}
          />
        )}
        {view === "success" && (
          <SuccessView t={t} onBack={() => { setView("login"); setError(null); }} />
        )}
        {view === "forgot" && (
          <ForgotPasswordView
            t={t}
            onBack={() => { setView("login"); setError(null); }}
          />
        )}
      </AuthShell>
    );
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
  if (role === "student") {
    return <StudentApp token={token} user={user} language={language} setLanguage={setLanguage} onLogout={logout} />;
  }

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>Роль «{role}» пока не поддерживается в интерфейсе</h2>
      <button className="btn btn-ghost" onClick={logout}>Выйти</button>
    </div>
  );
}

/* ─── Shell wrapper (logo + lang switcher) ─────────────────────────── */
function AuthShell({ language, setLanguage, children }: {
  language: Language; setLanguage: (l: Language) => void; children: React.ReactNode;
}) {
  const t = translations[language];
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
        {children}
      </div>
    </main>
  );
}

/* ─── Login form ────────────────────────────────────────────────────── */
function LoginForm({ t, busy, error, onSubmit, onRegister, onForgot }: {
  t: Record<string, string>; busy: boolean; error: string | null;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onRegister: () => void;
  onForgot: () => void;
}) {
  return (
    <>
      <h2 className="login-title">{t.loginTitle}</h2>
      <form onSubmit={onSubmit} className="login-form">
        <div className="field">
          <label className="field-label" htmlFor="email">{t.email}</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="password">{t.password}</label>
          <input id="password" name="password" type="password" required className="input" />
        </div>
        {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
        <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : t.signIn}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-full btn-sm"
          style={{ marginTop: 4, fontSize: 13, color: "var(--text-muted, #888)" }}
          onClick={onForgot}
        >
          {t.forgotPassword}
        </button>
      </form>
      <button
        className="btn btn-ghost btn-full"
        style={{ marginTop: 8 }}
        onClick={onRegister}
      >
        {t.register}
      </button>
    </>
  );
}

/* ─── Register form ─────────────────────────────────────────────────── */
const REGISTER_ROLES = [
  { value: "teacher", label: "Учитель / Мұғалім / Teacher" },
  { value: "class_teacher", label: "Классный руководитель / Сынып жетекшісі" },
  { value: "vice_principal", label: "Завуч / Меңгеруші / Vice Principal" },
  { value: "principal", label: "Директор / Director" },
  { value: "student", label: "Ученик / Оқушы / Student" },
];

function RegisterForm({ t, busy, error, onSubmit, onBack }: {
  t: Record<string, string>; busy: boolean; error: string | null;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  return (
    <>
      <h2 className="login-title">{t.registerTitle}</h2>
      <form onSubmit={onSubmit} className="login-form">
        <div className="field">
          <label className="field-label">{t.fullNameLabel}</label>
          <input name="fullName" type="text" required className="input" placeholder="Иванов Иван Иванович" />
        </div>
        <div className="field">
          <label className="field-label">{t.email}</label>
          <input name="email" type="email" required className="input" />
        </div>
        <div className="field">
          <label className="field-label">{t.password}</label>
          <input name="password" type="password" required className="input" minLength={6} />
        </div>
        <div className="field">
          <label className="field-label">{t.confirmPassword}</label>
          <input name="confirmPassword" type="password" required className="input" minLength={6} />
        </div>
        <div className="field">
          <label className="field-label">{t.selectRole}</label>
          <select name="role" required className="input" defaultValue="">
            <option value="" disabled>{t.selectRole}</option>
            {REGISTER_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label">{t.schoolName}</label>
          <input name="schoolName" type="text" required className="input" placeholder="НИШ Алматы" />
        </div>
        {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
        <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : t.submitRequest}
        </button>
      </form>
      <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onBack}>
        ← {t.backToLogin}
      </button>
    </>
  );
}

/* ─── Success screen ────────────────────────────────────────────────── */
function SuccessView({ t, onBack }: { t: Record<string, string>; onBack: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 24, color: "var(--text)" }}>
        {t.pendingApproval}
      </p>
      <button className="btn btn-primary btn-full" onClick={onBack}>
        ← {t.backToLogin}
      </button>
    </div>
  );
}

/* ─── Forgot password ───────────────────────────────────────────────── */
function ForgotPasswordView({ t, onBack }: { t: Record<string, string>; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await api.forgotPassword(String(fd.get("email") ?? ""));
      setSent(true);
    } catch {
      setError("Ошибка отправки. Попробуйте позже.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
        <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 24, color: "var(--text)" }}>
          {t.forgotPasswordSent}
        </p>
        <button className="btn btn-primary btn-full" onClick={onBack}>
          ← {t.backToLogin}
        </button>
      </div>
    );
  }

  return (
    <>
      <h2 className="login-title">{t.forgotPasswordTitle}</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 16, textAlign: "center" }}>
        {t.forgotPasswordHint}
      </p>
      <form method="POST" onSubmit={handleSubmit} className="login-form">
        <div className="field">
          <label className="field-label" htmlFor="fp-email">{t.email}</label>
          <input id="fp-email" name="email" type="email" required className="input" />
        </div>
        {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
        <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : t.sendResetLink}
        </button>
      </form>
      <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onBack}>
        ← {t.backToLogin}
      </button>
    </>
  );
}

/* ─── Lang switcher ─────────────────────────────────────────────────── */
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
