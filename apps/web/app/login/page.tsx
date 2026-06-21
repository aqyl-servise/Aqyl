"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { setTokens } from "../../lib/auth";

const BRAND = "#6B5CE7";
const DARK = "#0D0E1A";

const input: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d9d9e3",
  fontSize: 15, outline: "none", boxSizing: "border-box",
};
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 6, display: "block" };

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
      // Покрываем оба дашборда:
      //  • B2G (/dashboard) читает access-токен из localStorage["aqyl-token"];
      //  • B2C (/dashboard/b2c) использует setTokens → sessionStorage + cookie + refresh-токен.
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: DARK, padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 16, padding: "32px 28px", boxShadow: "0 10px 40px rgba(13,14,26,0.12)" }}>
        <h1 style={{ color: BRAND, fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>Aqyl</h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>Войти в Aqyl</p>

        {error && (
          <div style={{ background: "#fdecec", color: "#c0392b", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        <label style={label}>Email</label>
        <input style={input} name="email" type="email" required placeholder="you@example.com" autoComplete="email" />

        <div style={{ marginTop: 14 }}>
          <label style={label}>Пароль</label>
          <div style={{ position: "relative" }}>
            <input style={{ ...input, paddingRight: 64 }} name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: BRAND, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 4 }}
            >
              {showPassword ? "Скрыть" : "Показать"}
            </button>
          </div>
        </div>

        <button type="submit" disabled={busy} style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", background: BRAND, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 20, opacity: busy ? 0.7 : 1 }}>
          {busy ? "Вход…" : "Войти"}
        </button>

        <p style={{ textAlign: "center", fontSize: 13, marginTop: 14 }}>
          <a href="/forgot-password" style={{ color: "#6b7280", textDecoration: "none" }}>Забыли пароль?</a>
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
          <span style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          <span style={{ color: "#9ca3af", fontSize: 12 }}>или</span>
          <span style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", margin: 0 }}>
          Нет аккаунта? <a href="/register" style={{ color: BRAND, fontWeight: 600, textDecoration: "none" }}>Зарегистрироваться</a>
        </p>
      </form>
    </div>
  );
}
