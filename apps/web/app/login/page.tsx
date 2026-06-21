"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { setTokens } from "../../lib/auth";
import { ThemeToggle } from "../../components/theme-toggle";

const FEATURES = [
  "Планы уроков по МОН РК",
  "Автоматические оценки и отчёты",
  "Для всей школы или лично",
];

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api.universalLogin(String(fd.get("email")), String(fd.get("password")));
      // Покрываем оба дашборда: B2G (/dashboard) читает localStorage["aqyl-token"];
      // B2C (/dashboard/b2c) использует setTokens → sessionStorage + cookie + refresh.
      await setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      if (typeof window !== "undefined") {
        localStorage.setItem("aqyl-token", res.accessToken);
        if (res.user?.preferredLanguage) localStorage.setItem("aqyl-lang", res.user.preferredLanguage);
      }
      router.replace(res.redirectTo);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) setError("Слишком много попыток. Подождите немного");
        else setError("Неверный email или пароль");
      } else {
        setError("Ошибка соединения. Проверьте интернет");
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="aqyl-ds aqyl-fade">
      <div className="aqyl-auth">
        {/* Левая колонка — бренд */}
        <div className="aqyl-auth-left">
          <Link href="/" style={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", letterSpacing: "-0.02em" }}>Aqyl</Link>
          <h2 style={{ color: "#fff", fontSize: "1.75rem", lineHeight: 1.3, marginTop: 12 }}>
            Создайте КМЖ за 30 секунд.<br />Сэкономьте 3 часа в неделю.
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
            {FEATURES.map((f) => (
              <div key={f} className="aqyl-auth-feature">
                <span className="aqyl-auth-check">✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Правая колонка — форма */}
        <div className="aqyl-auth-right">
          <div className="aqyl-auth-toolbar"><ThemeToggle /></div>

          <form className="aqyl-auth-form" onSubmit={handleSubmit}>
            <h2 style={{ marginBottom: 6 }}>Войти в Aqyl</h2>
            <p style={{ marginBottom: 24 }}>Введите данные для входа</p>

            {error && <div className="aqyl-error">{error}</div>}

            <label className="label">Email</label>
            <input className="input" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />

            <div style={{ marginTop: 16 }}>
              <label className="label">Пароль</label>
              <div className="aqyl-pwd">
                <input className="input" name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" />
                <button type="button" className="aqyl-pwd-toggle" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 24 }} disabled={busy}>
              {busy ? "Вход…" : "Войти"}
            </button>

            <div className="aqyl-divider"><span>или</span></div>

            <p style={{ textAlign: "center", fontSize: "0.875rem" }}>
              Нет аккаунта? <Link href="/register" style={{ color: "var(--accent-purple)", fontWeight: 600 }}>Зарегистрироваться →</Link>
            </p>
            <p style={{ textAlign: "center", fontSize: "0.875rem", marginTop: 10 }}>
              <Link href="/forgot-password" style={{ color: "var(--text-muted)" }}>Забыли пароль?</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
