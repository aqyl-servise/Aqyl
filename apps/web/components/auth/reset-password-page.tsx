"use client";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../../lib/api";

type Step = "form" | "success" | "invalid";

export function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [step, setStep] = useState<Step>(token ? "form" : "invalid");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setStep("invalid");
  }, [token]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");

    if (password.length < 6) { setError("Пароль должен содержать не менее 6 символов"); return; }
    if (password !== confirm) { setError("Пароли не совпадают"); return; }

    setBusy(true);
    try {
      await api.resetPassword(token, password);
      setStep("success");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      try {
        const body = JSON.parse(raw) as { message?: string };
        if (body.message === "TOKEN_EXPIRED") { setError("Ссылка устарела. Запросите новое письмо."); return; }
        if (body.message === "INVALID_TOKEN") { setError("Недействительная ссылка."); return; }
        setError(typeof body.message === "string" ? body.message : "Ошибка. Попробуйте снова.");
      } catch { setError("Ошибка. Попробуйте снова."); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">✦</span>
          <div>
            <h1 className="logo-name">Aqyl</h1>
            <p className="logo-sub">Цифровая школа</p>
          </div>
        </div>

        {step === "invalid" && (
          <>
            <h2 className="login-title">Недействительная ссылка</h2>
            <p className="muted" style={{ textAlign: "center", marginBottom: 20 }}>
              Ссылка для сброса пароля отсутствует или недействительна.
            </p>
            <a href="/" className="btn btn-primary btn-full" style={{ textAlign: "center", textDecoration: "none" }}>
              Вернуться ко входу
            </a>
          </>
        )}

        {step === "form" && (
          <>
            <h2 className="login-title">Новый пароль</h2>
            <form method="POST" onSubmit={handleSubmit} className="login-form">
              <div className="field">
                <label className="field-label" htmlFor="password">Новый пароль</label>
                <input
                  id="password" name="password" type="password"
                  required minLength={6} className="input"
                  placeholder="Минимум 6 символов"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="confirm">Подтвердите пароль</label>
                <input
                  id="confirm" name="confirm" type="password"
                  required minLength={6} className="input"
                  placeholder="Повторите пароль"
                />
              </div>
              {error && (
                <div className="alert alert-error"><span>⚠</span> {error}</div>
              )}
              <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
                {busy ? <span className="spinner" /> : "Сохранить пароль"}
              </button>
            </form>
          </>
        )}

        {step === "success" && (
          <>
            <h2 className="login-title">Пароль изменён</h2>
            <p className="muted" style={{ textAlign: "center", marginBottom: 24 }}>
              Ваш пароль успешно обновлён. Теперь вы можете войти в систему.
            </p>
            <a href="/" className="btn btn-primary btn-full" style={{ textAlign: "center", textDecoration: "none" }}>
              Войти
            </a>
          </>
        )}
      </div>
    </main>
  );
}
