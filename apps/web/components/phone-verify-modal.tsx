"use client";

import { useState } from "react";
import { api } from "../lib/api";

/**
 * Подтверждение номера телефона перед выдачей бесплатных уроков.
 *
 * Появляется при первой генерации, а не при регистрации: трение попадает
 * туда, где начинается ценность. Почтовый ящик заводится за минуту, номер —
 * нет, поэтому именно он защищает бесплатный доступ от мультиаккаунтов.
 */
export function PhoneVerifyModal({
  token, onDone, onClose,
}: {
  token: string;
  /** trialAllowed=false — номер уже получал бесплатные уроки раньше. */
  onDone: (trialAllowed: boolean) => void;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("+7 ");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const msg = (e: unknown) => (e instanceof Error ? e.message : "Попробуйте ещё раз");

  async function send() {
    setError(null); setBusy(true);
    try {
      await api.sendPhoneCode(token, phone);
      setSent(true);
    } catch (e) { setError(msg(e)); }
    finally { setBusy(false); }
  }

  async function verify() {
    setError(null); setBusy(true);
    try {
      const r = await api.verifyPhoneCode(token, code);
      onDone(r.trialAllowed);
    } catch (e) { setError(msg(e)); setBusy(false); }
  }

  const box: React.CSSProperties = {
    width: "100%", background: "var(--ink-2)", border: "1px solid var(--line)",
    color: "var(--white)", borderRadius: 10, padding: "12px 14px",
    fontSize: 16, fontFamily: "inherit", marginBottom: 12,
  };

  return (
    <div
      role="dialog" aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(6,5,20,.72)", display: "grid", placeItems: "center", padding: 20, zIndex: 50 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--ink)", border: "1px solid var(--line)", borderRadius: 18, padding: "26px 24px", maxWidth: 400, width: "100%" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 21, margin: "0 0 8px" }}>
          Подтвердите номер телефона
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.6, margin: "0 0 18px" }}>
          {sent
            ? "Мы отправили шестизначный код по SMS. Введите его ниже."
            : "Бесплатные уроки выдаются один раз на номер. Это защищает сервис от повторных регистраций."}
        </p>

        {!sent ? (
          <>
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 777 123 45 67" inputMode="tel" style={box}
            />
            <button
              onClick={send} disabled={busy}
              style={{ width: "100%", background: "var(--amber)", color: "var(--on-amber)", border: 0, borderRadius: 11, padding: 13, fontWeight: 800, fontSize: 15, fontFamily: "inherit", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? .6 : 1 }}
            >
              {busy ? "Отправляем…" : "Получить код"}
            </button>
          </>
        ) : (
          <>
            <input
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456" inputMode="numeric" maxLength={6}
              style={{ ...box, letterSpacing: 6, textAlign: "center", fontWeight: 700 }}
            />
            <button
              onClick={verify} disabled={busy || code.length < 6}
              style={{ width: "100%", background: "var(--amber)", color: "var(--on-amber)", border: 0, borderRadius: 11, padding: 13, fontWeight: 800, fontSize: 15, fontFamily: "inherit", cursor: busy || code.length < 6 ? "not-allowed" : "pointer", opacity: busy || code.length < 6 ? .6 : 1 }}
            >
              {busy ? "Проверяем…" : "Подтвердить"}
            </button>
            <button
              onClick={() => { setSent(false); setCode(""); setError(null); }}
              style={{ width: "100%", background: "transparent", border: 0, color: "var(--muted)", padding: "10px 0 0", fontSize: 13.5, fontFamily: "inherit", cursor: "pointer" }}
            >
              Изменить номер
            </button>
          </>
        )}

        {error && (
          <p style={{ color: "var(--danger, #ef5350)", fontSize: 14, margin: "12px 0 0" }}>{error}</p>
        )}
      </div>
    </div>
  );
}
