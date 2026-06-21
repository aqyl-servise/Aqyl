"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { ThemeToggle } from "../../components/theme-toggle";
import { LogoIcon } from "../../components/public-header";

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
            <h2 style={{ color: "rgba(244,240,255,0.95)" }}>Восстановление пароля</h2>
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
            <Link href="/login" style={{ fontSize: "0.875rem", color: "rgba(244,240,255,0.85)" }}>Вспомнили?</Link>
          </div>
        </div>

        {/* Правая колонка */}
        <div className="pub-auth-right">
          <div className="pub-auth-form">
            {sent ? (
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontWeight: 600, marginBottom: 10 }}>Проверьте почту</h2>
                <p style={{ marginBottom: 24 }}>
                  Если этот email зарегистрирован, мы отправили на него ссылку для сброса пароля.
                </p>
                <Link href="/login" className="pub-btn pub-btn-outline pub-btn-full">← Вернуться ко входу</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 style={{ fontWeight: 600 }}>Забыли пароль?</h2>
                <p style={{ color: "var(--pub-text-3)", marginBottom: 28, marginTop: 6 }}>Укажите email — отправим инструкции</p>

                {error && <div className="pub-error">{error}</div>}

                <label className="pub-label">Email</label>
                <input className="pub-input" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />

                <button type="submit" className="pub-btn pub-btn-primary pub-btn-full pub-btn-lg" style={{ marginTop: 24 }} disabled={busy}>
                  {busy ? "Отправка…" : "Отправить инструкции"}
                </button>

                <p style={{ textAlign: "center", fontSize: "0.875rem", marginTop: 18 }}>
                  <Link href="/login" style={{ color: "var(--pub-text-3)" }}>← Вернуться ко входу</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
