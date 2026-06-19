"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { setTokens } from "../../lib/auth";

const BRAND = "#6B5CE7";
const DARK = "#0D0E1A";
const RESEND_SECONDS = 600; // 10 minutes

const card: React.CSSProperties = {
  width: "100%", maxWidth: 420, background: "#fff", borderRadius: 16,
  padding: "32px 28px", boxShadow: "0 10px 40px rgba(13,14,26,0.12)",
};
const input: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d9d9e3",
  fontSize: 15, outline: "none", boxSizing: "border-box",
};
const primaryBtn: React.CSSProperties = {
  width: "100%", padding: "13px", borderRadius: 10, border: "none", background: BRAND,
  color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 4,
};
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 6, display: "block" };

function extractError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : "";
  try {
    const body = JSON.parse(msg) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message[0];
    if (body.message) return String(body.message);
  } catch { /* not JSON */ }
  return fallback;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [subject, setSubject] = useState("");
  const [region, setRegion] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Countdown for the "resend code" button.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const timerLabel = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  async function handleSendCode() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError("Введите корректный email"); return; }
    setBusy(true); setError(null);
    try {
      await api.sendVerificationCode(email.trim().toLowerCase());
      setStep(2);
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(extractError(err, "Не удалось отправить код"));
    } finally { setBusy(false); }
  }

  function handleCodeChange(idx: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) codeRefs.current[idx + 1]?.focus();
  }

  function handleCodeKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[idx] && idx > 0) codeRefs.current[idx - 1]?.focus();
  }

  async function handleVerify() {
    const joined = code.join("");
    if (joined.length !== 6) { setError("Введите 6-значный код"); return; }
    setBusy(true); setError(null);
    try {
      await api.verifyCode(email.trim().toLowerCase(), joined);
      setStep(3);
    } catch (err) {
      setError(extractError(err, "Неверный или просроченный код"));
    } finally { setBusy(false); }
  }

  async function handleRegister() {
    if (!firstName.trim() || !lastName.trim()) { setError("Укажите имя и фамилию"); return; }
    if (password.length < 8) { setError("Пароль должен быть не менее 8 символов"); return; }
    if (password !== confirm) { setError("Пароли не совпадают"); return; }
    if (!agreed) { setError("Необходимо согласиться с условиями использования"); return; }
    setBusy(true); setError(null);
    try {
      const res = await api.registerB2C({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        subject: subject.trim() || undefined,
        region: region.trim() || undefined,
      });
      setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      router.replace("/dashboard/b2c");
    } catch (err) {
      setError(extractError(err, "Не удалось создать аккаунт"));
    } finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: DARK, padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <div style={card}>
        <h1 style={{ color: BRAND, fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>Aqyl</h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>Регистрация учителя</p>

        {error && (
          <div style={{ background: "#fdecec", color: "#c0392b", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        {step === 1 && (
          <>
            <label style={label}>Email</label>
            <input style={input} type="email" value={email} placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendCode()} />
            <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1, marginTop: 18 }} disabled={busy} onClick={handleSendCode}>
              {busy ? "Отправка…" : "Получить код"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ fontSize: 14, color: DARK, marginBottom: 16 }}>Код отправлен на <strong>{email}</strong></p>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 18 }}>
              {code.map((c, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  value={c}
                  inputMode="numeric"
                  maxLength={1}
                  autoFocus={i === 0}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  style={{ width: 46, height: 54, textAlign: "center", fontSize: 22, fontWeight: 700, borderRadius: 10, border: "1px solid #d9d9e3", outline: "none" }}
                />
              ))}
            </div>
            <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={handleVerify}>
              {busy ? "Проверка…" : "Подтвердить"}
            </button>
            <button
              onClick={handleSendCode}
              disabled={secondsLeft > 0 || busy}
              style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: secondsLeft > 0 ? "#9ca3af" : BRAND, cursor: secondsLeft > 0 ? "default" : "pointer", fontSize: 13, fontWeight: 600 }}
            >
              {secondsLeft > 0 ? `Отправить повторно через ${timerLabel}` : "Отправить повторно"}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={label}>Имя</label>
                <input style={input} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Фамилия</label>
                <input style={input} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={label}>Пароль</label>
              <input style={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={label}>Подтверждение пароля</label>
              <input style={input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={label}>Предмет (необязательно)</label>
              <input style={input} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={label}>Область (необязательно)</label>
              <input style={input} value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 16, fontSize: 13, color: "#374151" }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
              <span>Я согласен с условиями использования</span>
            </label>
            <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1, marginTop: 18 }} disabled={busy} onClick={handleRegister}>
              {busy ? "Создание…" : "Создать аккаунт"}
            </button>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", marginTop: 20 }}>
          Уже есть аккаунт? <a href="/login-teacher" style={{ color: BRAND, fontWeight: 600, textDecoration: "none" }}>Войти</a>
        </p>
      </div>
    </div>
  );
}
