"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { setTokens } from "../../lib/auth";
import { ThemeToggle } from "../../components/theme-toggle";

const RESEND_SECONDS = 600; // 10 minutes

const FEATURES = [
  "Генерация КМЖ за 30 секунд",
  "Все стандарты МОН РК",
  "Отмена в любой момент",
];

const STEPS = ["Email", "Код", "Профиль"];

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
      await setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      router.replace("/dashboard/b2c");
    } catch (err) {
      setError(extractError(err, "Не удалось создать аккаунт"));
    } finally { setBusy(false); }
  }

  return (
    <div className="aqyl-ds aqyl-fade">
      <div className="aqyl-auth">
        {/* Левая колонка — бренд */}
        <div className="aqyl-auth-left">
          <Link href="/" style={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", letterSpacing: "-0.02em" }}>Aqyl</Link>
          <h2 style={{ color: "#fff", fontSize: "1.75rem", lineHeight: 1.3, marginTop: 12 }}>Начните бесплатно</h2>
          <p style={{ color: "rgba(255,255,255,0.85)", marginTop: -8 }}>14 дней без ограничений. Без привязки карты.</p>
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
            <h2 style={{ marginBottom: 24 }}>Создать аккаунт</h2>

            {/* Прогресс-бар шагов */}
            <div className="aqyl-steps">
              {STEPS.map((label, i) => {
                const n = i + 1;
                const cls = step === n ? "is-active" : step > n ? "is-done" : "";
                return (
                  <div key={label} style={{ display: "contents" }}>
                    <div className={`aqyl-step ${cls}`}>
                      <span className="aqyl-step-dot">{step > n ? "✓" : n}</span>
                      <span className="aqyl-step-label">{label}</span>
                    </div>
                    {n < STEPS.length && <span className="aqyl-step-line" />}
                  </div>
                );
              })}
            </div>

            {error && <div className="aqyl-error">{error}</div>}

            {step === 1 && (
              <>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendCode()} />
                <button className="btn btn-primary btn-full" style={{ marginTop: 18 }} disabled={busy} onClick={handleSendCode}>
                  {busy ? "Отправка…" : "Получить код"}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <p style={{ marginBottom: 16 }}>Код отправлен на <strong style={{ color: "var(--text-primary)" }}>{email}</strong></p>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 18 }}>
                  {code.map((c, i) => (
                    <input
                      key={i}
                      ref={(el) => { codeRefs.current[i] = el; }}
                      className="input"
                      value={c}
                      inputMode="numeric"
                      maxLength={1}
                      autoFocus={i === 0}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      style={{ width: 46, height: 54, textAlign: "center", fontSize: "1.375rem", fontWeight: 700, padding: 0 }}
                    />
                  ))}
                </div>
                <button className="btn btn-primary btn-full" disabled={busy} onClick={handleVerify}>
                  {busy ? "Проверка…" : "Подтвердить"}
                </button>
                <button
                  onClick={handleSendCode}
                  disabled={secondsLeft > 0 || busy}
                  className="btn btn-ghost btn-full btn-sm"
                  style={{ marginTop: 12, color: secondsLeft > 0 ? "var(--text-muted)" : "var(--accent-purple)" }}
                >
                  {secondsLeft > 0 ? `Отправить повторно через ${timerLabel}` : "Отправить повторно"}
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label className="label">Имя</label>
                    <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="label">Фамилия</label>
                    <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="label">Пароль</label>
                  <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="label">Подтверждение пароля</label>
                  <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="label">Предмет (необязательно)</label>
                  <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="label">Область (необязательно)</label>
                  <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} />
                </div>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 16, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>Я согласен с условиями использования</span>
                </label>
                <button className="btn btn-primary btn-full" style={{ marginTop: 18 }} disabled={busy} onClick={handleRegister}>
                  {busy ? "Создание…" : "Создать аккаунт"}
                </button>
              </>
            )}

            <p style={{ textAlign: "center", fontSize: "0.875rem", marginTop: 20 }}>
              Уже есть аккаунт? <Link href="/login" style={{ color: "var(--accent-purple)", fontWeight: 600 }}>Войти</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
