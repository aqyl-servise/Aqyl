"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { setTokens } from "../../lib/auth";
import { ThemeToggle } from "../../components/theme-toggle";
import { LogoIcon } from "../../components/public-header";

const FEATURES = [
  "Планы уроков по стандарту МОН РК",
  "Автоматические оценки и отчёты",
  "Для школы или индивидуально",
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
    <div className="aqyl-pub">
      <div className="pub-auth">
        {/* Левая колонка */}
        <div className="pub-auth-left">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoIcon size={36} />
            <span style={{ fontWeight: 600, fontSize: "1.25rem", letterSpacing: "0.1em", color: "#fff" }}>aqyl</span>
          </div>

          <div>
            <div className="pub-divider" style={{ background: "rgba(255,255,255,0.15)", marginBottom: 32 }} />
            <h2 style={{ color: "rgba(244,240,255,0.95)" }}>Создайте КМЖ за 30 секунд.</h2>
            <p style={{ color: "rgba(244,240,255,0.95)", marginTop: 4 }}>Сэкономьте 3 часа в неделю.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 28 }}>
              {FEATURES.map((f) => (
                <div key={f} className="pub-auth-feature">
                  <span className="pub-dot pub-dot-green" /> {f}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <ThemeToggle onDark />
            <Link href="/register" style={{ fontSize: "0.875rem", color: "rgba(244,240,255,0.85)" }}>Нет аккаунта?</Link>
          </div>
        </div>

        {/* Правая колонка */}
        <div className="pub-auth-right">
          <form className="pub-auth-form" onSubmit={handleSubmit}>
            <h2 style={{ fontWeight: 600 }}>Войти в Aqyl</h2>
            <p style={{ color: "var(--pub-text-3)", marginBottom: 28, marginTop: 6 }}>Введите данные для входа</p>

            {error && <div className="pub-error">{error}</div>}

            <label className="pub-label">Email</label>
            <input className="pub-input" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />

            <div style={{ marginTop: 16 }}>
              <label className="pub-label">Пароль</label>
              <div className="pub-pwd">
                <input className="pub-input" name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" />
                <button type="button" className="pub-pwd-toggle" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>

            <button type="submit" className="pub-btn pub-btn-primary pub-btn-full pub-btn-lg" style={{ marginTop: 24 }} disabled={busy}>
              {busy ? "Вход…" : "Войти"}
            </button>

            <div className="pub-or"><span>или</span></div>

            <p style={{ textAlign: "center", fontSize: "0.875rem" }}>
              <Link href="/register" style={{ color: "var(--pub-purple)", fontWeight: 500 }}>Зарегистрироваться →</Link>
            </p>
            <p style={{ textAlign: "center", fontSize: "0.875rem", marginTop: 10 }}>
              <Link href="/forgot-password" style={{ color: "var(--pub-text-3)" }}>Забыли пароль?</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
