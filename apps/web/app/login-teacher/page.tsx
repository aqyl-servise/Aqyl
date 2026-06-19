"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { setTokens } from "../../lib/auth";

const BRAND = "#6B5CE7";
const DARK = "#0D0E1A";

const input: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d9d9e3",
  fontSize: 15, outline: "none", boxSizing: "border-box",
};
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 6, display: "block" };

export default function LoginTeacherPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api.loginB2C(String(fd.get("email")), String(fd.get("password")));
      setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      router.replace("/dashboard/b2c");
    } catch {
      setError("Неверный email или пароль");
    } finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: DARK, padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 16, padding: "32px 28px", boxShadow: "0 10px 40px rgba(13,14,26,0.12)" }}>
        <h1 style={{ color: BRAND, fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>Aqyl</h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>Вход для учителя</p>

        {error && (
          <div style={{ background: "#fdecec", color: "#c0392b", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        <label style={label}>Email</label>
        <input style={input} name="email" type="email" required placeholder="you@example.com" />

        <div style={{ marginTop: 14 }}>
          <label style={label}>Пароль</label>
          <input style={input} name="password" type="password" required />
        </div>

        <button type="submit" disabled={busy} style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", background: BRAND, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 20, opacity: busy ? 0.7 : 1 }}>
          {busy ? "Вход…" : "Войти"}
        </button>

        <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", marginTop: 18 }}>
          Нет аккаунта? <a href="/register" style={{ color: BRAND, fontWeight: 600, textDecoration: "none" }}>Зарегистрироваться</a>
        </p>
        <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", marginTop: 8 }}>
          <a href="/login" style={{ color: "#9ca3af", textDecoration: "none" }}>Войти как школа</a>
        </p>
      </form>
    </div>
  );
}
