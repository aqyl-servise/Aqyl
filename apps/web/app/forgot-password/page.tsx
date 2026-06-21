"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { ThemeToggle } from "../../components/theme-toggle";

const FEATURES = [
  "Восстановите доступ за минуту",
  "Ссылка придёт на вашу почту",
  "Безопасно и конфиденциально",
];

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
    <div className="aqyl-ds aqyl-fade">
      <div className="aqyl-auth">
        {/* Левая колонка — бренд */}
        <div className="aqyl-auth-left">
          <Link href="/" style={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", letterSpacing: "-0.02em" }}>Aqyl</Link>
          <h2 style={{ color: "#fff", fontSize: "1.75rem", lineHeight: 1.3, marginTop: 12 }}>Восстановление пароля</h2>
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

          <div className="aqyl-auth-form">
            {sent ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📬</div>
                <h2 style={{ marginBottom: 10 }}>Проверьте почту</h2>
                <p style={{ marginBottom: 24 }}>
                  Если этот email зарегистрирован, мы отправили на него ссылку для сброса пароля.
                </p>
                <Link href="/login" className="btn btn-secondary btn-full">← Вернуться ко входу</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 style={{ marginBottom: 6 }}>Забыли пароль?</h2>
                <p style={{ marginBottom: 24 }}>Укажите email — отправим инструкции по восстановлению</p>

                {error && <div className="aqyl-error">{error}</div>}

                <label className="label">Email</label>
                <input className="input" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 24 }} disabled={busy}>
                  {busy ? "Отправка…" : "Отправить инструкции"}
                </button>

                <p style={{ textAlign: "center", fontSize: "0.875rem", marginTop: 18 }}>
                  <Link href="/login" style={{ color: "var(--text-muted)" }}>← Вернуться ко входу</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
