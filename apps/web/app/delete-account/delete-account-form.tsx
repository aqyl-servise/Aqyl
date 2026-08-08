"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import { DeleteAccountConfirmText } from "../../components/delete-account-confirm";

/**
 * Точка 2 — удаление аккаунта с публичной страницы.
 *
 * Работает без входа в аккаунт и без установленного приложения: Google
 * требует страницу, доступную человеку, который уже удалил приложение с
 * устройства. Порядок строго по требованиям:
 *   почта → «Отправить код» → ввод кода → текст подтверждения → «Удалить аккаунт».
 *
 * Здесь НЕЛЬЗЯ: требовать пароль, требовать вход, превращать страницу в форму
 * обратной связи.
 */
type Step = "email" | "code" | "done";

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "var(--pub-radius)",
  border: "1.5px solid var(--pub-border-2)",
  background: "var(--pub-bg-surface)",
  color: "var(--pub-text)",
  fontSize: "1rem",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export function DeleteAccountForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [purgeAfter, setPurgeAfter] = useState("");

  async function sendCode() {
    setError(null);
    setBusy(true);
    try {
      await api.deleteAccountRequestCode(email.trim());
      // Ответ одинаков независимо от того, есть ли такой аккаунт: иначе форма
      // превращается в проверку, зарегистрирована ли почта.
      setStep("code");
    } catch {
      setError("Не удалось отправить код. Проверьте адрес и попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.deleteAccountConfirm(email.trim(), code.trim());
      setPurgeAfter(
        new Date(res.purgeAfter).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" }),
      );
      setStep("done");
    } catch {
      setError("Код неверный или истёк. Запросите новый код.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <div className="pub-card">
        <h3 style={{ marginBottom: 10 }}>Аккаунт удалён</h3>
        <p style={{ lineHeight: 1.75, marginBottom: 10 }}>
          Доступ закрыт, подписка больше не продлевается. Письмо с подробностями отправлено на{" "}
          <b>{email}</b>.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          Восстановить аккаунт можно до <b>{purgeAfter}</b>, войдя с прежними почтой и паролем.
          После этой даты восстановление невозможно.
        </p>
      </div>
    );
  }

  return (
    <div className="pub-card">
      <h3 style={{ marginBottom: 14 }}>Удалить аккаунт</h3>

      <label className="pub-label" htmlFor="del-email">Адрес электронной почты</label>
      <input
        id="del-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={step === "code"}
        autoComplete="email"
        style={{ ...input, marginBottom: 14, opacity: step === "code" ? 0.7 : 1 }}
      />

      {step === "email" && (
        <button
          className="pub-btn pub-btn-primary"
          onClick={sendCode}
          disabled={!email.trim() || busy}
        >
          {busy ? "Отправляем…" : "Отправить код"}
        </button>
      )}

      {step === "code" && (
        <>
          <label className="pub-label" htmlFor="del-code">Код из письма</label>
          <input
            id="del-code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            style={{ ...input, marginBottom: 20, letterSpacing: "0.3em", textAlign: "center", fontSize: "1.25rem" }}
          />

          <DeleteAccountConfirmText />

          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <button
              className="pub-btn pub-btn-outline"
              onClick={() => { setStep("email"); setCode(""); setError(null); }}
              disabled={busy}
            >
              Отмена
            </button>
            <button
              className="pub-btn"
              style={{ background: "#C0392B", color: "#fff", borderColor: "#C0392B" }}
              onClick={confirm}
              disabled={code.length !== 6 || busy}
            >
              {busy ? "Удаляем…" : "Удалить аккаунт"}
            </button>
          </div>
        </>
      )}

      {error && (
        <div style={{ marginTop: 14, color: "#C0392B", fontSize: "0.875rem" }}>{error}</div>
      )}
    </div>
  );
}
