"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { Language, translations } from "../lib/translations";
import { PasswordInput } from "./ui/password-input";

type View = "login" | "register" | "success" | "forgot";

export function LoginApp() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("ru");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("login");

  const t = translations[language];

  useEffect(() => {
    const lang = localStorage.getItem("aqyl-lang") as Language | null;
    if (lang) setLanguage(lang);
    // Already authenticated → go straight to the app.
    const tok = localStorage.getItem("aqyl-token");
    if (tok) {
      // Устанавливаем cookie через сервер (httpOnly Set-Cookie), затем редирект.
      (async () => {
        await fetch("/api/auth/set-cookie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: tok }),
        });
        router.replace("/dashboard");
      })();
    }
  }, [router]);

  useEffect(() => { localStorage.setItem("aqyl-lang", language); }, [language]);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api.login(String(fd.get("email")), String(fd.get("password")));
      localStorage.setItem("aqyl-token", res.accessToken);
      localStorage.setItem("aqyl-lang", (res.user.preferredLanguage as Language) || "ru");
      // Устанавливаем cookie через сервер — Set-Cookie применяется до редиректа,
      // поэтому middleware сразу видит токен (без костыля с setTimeout).
      await fetch("/api/auth/set-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: res.accessToken }),
      });
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      try {
        const body = JSON.parse(msg) as { message?: string };
        if (body.message === "PENDING") { setError(t.accountPending); return; }
        if (body.message === "REJECTED") { setError(t.accountRejected); return; }
      } catch { /* not JSON */ }
      setError(t.app_login_error);
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
        setError(typeof body.message === "string" ? body.message : t.app_register_error);
      } catch {
        setError(t.app_register_error);
      }
    } finally {
      setBusy(false);
    }
  }

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

/* ─── Shell wrapper (two-panel login) ──────────────────────────────── */
function AuthShell({ language, setLanguage, children }: {
  language: Language; setLanguage: (l: Language) => void; children: React.ReactNode;
}) {
  const t = translations[language];
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute("data-theme") ?? "light";
    html.setAttribute("data-theme", "light");
    return () => { html.setAttribute("data-theme", prev); };
  }, []);

  return (
    <main className="login-shell">
      {/* Left panel — brand / logo */}
      <div className="login-left">
        <div className="login-left-content">
          <svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" width="220" aria-hidden="true">
            <circle cx="340" cy="116" r="57" fill="none" stroke="#7F77DD" strokeWidth="1"/>
            <circle cx="340" cy="116" r="52" fill="none" stroke="#4A4299" strokeWidth="0.35" opacity="0.55"/>
            <circle cx="340" cy="116" r="50" fill="#3d3499"/>
            <path d="M 336 85 L 308 149 L 316 149 L 344 85 Z" fill="#9B95E4"/>
            <path d="M 336 85 L 344 85 L 372 149 L 364 149 Z" fill="#3DB88E"/>
            <rect x="321" y="119" width="38" height="8" rx="2" fill="#F5A623"/>
            <circle cx="340" cy="85" r="6.5" fill="white" opacity="0.96"/>
            <circle cx="340" cy="85" r="2.8" fill="#2E2780"/>
            <circle cx="312" cy="149" r="3.2" fill="#9B95E4" opacity="0.75"/>
            <circle cx="368" cy="149" r="3.2" fill="#3DB88E" opacity="0.75"/>
            <text x="348" y="220" textAnchor="middle" fontFamily="system-ui,sans-serif" fontSize="52" fontWeight="500" letterSpacing="10" fill="#EEEDFE">aqyl</text>
            <rect x="321" y="228" width="10" height="2.5" rx="1.25" fill="#7F77DD"/>
            <rect x="335" y="228" width="10" height="2.5" rx="1.25" fill="#1D9E75"/>
            <rect x="349" y="228" width="10" height="2.5" rx="1.25" fill="#EF9F27"/>
          </svg>
          <p className="login-tagline">{t.app_tagline}</p>
          <div className="login-modules">
            <span className="login-module">
              <span className="login-module-dot" style={{ background: "#7F77DD" }} />
              {t.app_module_school_data}
            </span>
            <span className="login-module">
              <span className="login-module-dot" style={{ background: "#3DB88E" }} />
              {t.app_module_analytics_ai}
            </span>
            <span className="login-module">
              <span className="login-module-dot" style={{ background: "#F5A623" }} />
              {t.app_module_interactive}
            </span>
          </div>
        </div>
      </div>

      {/* Right panel — auth forms */}
      <div className="login-right">
        <div className="login-right-inner">
          <div className="lang-row">
            <LangSwitcher language={language} onChange={setLanguage} />
          </div>
          {children}
        </div>
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
          <PasswordInput id="password" name="password" required />
        </div>
        {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
        <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : t.signIn}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-full btn-sm"
          style={{ marginTop: 4, fontSize: 13, color: "#7F77DD" }}
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
function RegisterForm({ t, busy, error, onSubmit, onBack }: {
  t: Record<string, string>; busy: boolean; error: string | null;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  const REGISTER_ROLES = [
    { value: "teacher", label: t.role_teacher },
    { value: "class_teacher", label: t.role_class_teacher },
    { value: "vice_principal", label: t.role_vice_principal },
    { value: "vice_principal_academic", label: t.role_vice_principal_academic },
    { value: "vice_principal_education", label: t.role_vice_principal_education },
    { value: "psychologist", label: t.role_psychologist },
    { value: "social_pedagogue", label: t.role_social_pedagogue },
    { value: "principal", label: t.role_principal },
    { value: "student", label: t.role_student },
  ];

  return (
    <>
      <h2 className="login-title">{t.registerTitle}</h2>
      <form onSubmit={onSubmit} className="login-form">
        <div className="field">
          <label className="field-label">{t.fullNameLabel}</label>
          <input name="fullName" type="text" required className="input" placeholder={t.app_fullname_placeholder} />
        </div>
        <div className="field">
          <label className="field-label">{t.email}</label>
          <input name="email" type="email" required className="input" />
        </div>
        <div className="field">
          <label className="field-label">{t.password}</label>
          <PasswordInput name="password" required minLength={6} />
        </div>
        <div className="field">
          <label className="field-label">{t.confirmPassword}</label>
          <PasswordInput name="confirmPassword" required minLength={6} />
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
          <input name="schoolName" type="text" required className="input" placeholder={t.app_school_placeholder} />
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
      setError(t.app_forgot_send_error);
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
