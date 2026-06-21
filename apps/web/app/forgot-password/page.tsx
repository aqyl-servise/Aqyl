"use client";

import { FormEvent, useState } from "react";
import { api } from "../../lib/api";

const BRAND = "#6B5CE7";
const DARK = "#0D0E1A";

const input: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d9d9e3",
  fontSize: 15, outline: "none", boxSizing: "border-box",
};
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 6, display: "block" };

export default function ForgotPasswordPage() {
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
      setError("Ошибка соединения. Проверьте интернет");
    } finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: DARK, padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 16, padding: "32px 28px", boxShadow: "0 10px 40px rgba(13,14,26,0.12)" }}>
        <h1 style={{ color: BRAND, fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>Aqyl</h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>Восстановление пароля</p>

        {sent ? (
          <>
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>📬</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#374151", textAlign: "center", marginBottom: 24 }}>
              Если этот email зарегистрирован, мы отправили на него ссылку для сброса пароля.
            </p>
            <p style={{ textAlign: "center", fontSize: 13, margin: 0 }}>
              <a href="/login" style={{ color: BRAND, fontWeight: 600, textDecoration: "none" }}>← Вернуться ко входу</a>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: "#fdecec", color: "#c0392b", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}
            <label style={label}>Email</label>
            <input style={input} name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
            <button type="submit" disabled={busy} style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", background: BRAND, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 20, opacity: busy ? 0.7 : 1 }}>
              {busy ? "Отправка…" : "Отправить ссылку"}
            </button>
            <p style={{ textAlign: "center", fontSize: 13, marginTop: 16, margin: "16px 0 0" }}>
              <a href="/login" style={{ color: "#6b7280", textDecoration: "none" }}>← Вернуться ко входу</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
