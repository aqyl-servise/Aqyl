"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { setTokens } from "../../lib/auth";
import { ThemeToggle } from "../../components/theme-toggle";
import { LogoIcon } from "../../components/public-header";

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
            <h2 style={{ color: "rgba(244,240,255,0.95)" }}>Начните бесплатно</h2>
            <p style={{ color: "rgba(244,240,255,0.95)", marginTop: 4 }}>14 дней без ограничений.</p>
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
            <Link href="/login" style={{ fontSize: "0.875rem", color: "rgba(244,240,255,0.85)" }}>Уже есть аккаунт?</Link>
          </div>
        </div>

        {/* Правая колонка */}
        <div className="pub-auth-right">
          <div className="pub-auth-form">
            <h2 style={{ fontWeight: 600, marginBottom: 24 }}>Создать аккаунт</h2>

            {/* Прогресс шагов */}
            <div className="pub-steps">
              {STEPS.map((label, i) => {
                const n = i + 1;
                const cls = step === n ? "is-active" : step > n ? "is-done" : "";
                return (
                  <div key={label} style={{ display: "contents" }}>
                    <div className={`pub-step ${cls}`}>
                      <span className="pub-step-dot">{step > n ? "✓" : n}</span>
                      <span className="pub-step-label">{label}</span>
                    </div>
                    {n < STEPS.length && <span className="pub-step-line" />}
                  </div>
                );
              })}
            </div>

            {error && <div className="pub-error">{error}</div>}

            {step === 1 && (
              <>
                <label className="pub-label">Email</label>
                <input className="pub-input" type="email" value={email} placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendCode()} />
                <button className="pub-btn pub-btn-primary pub-btn-full pub-btn-lg" style={{ marginTop: 18 }} disabled={busy} onClick={handleSendCode}>
                  {busy ? "Отправка…" : "Получить код"}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <p style={{ marginBottom: 16 }}>Код отправлен на <strong style={{ color: "var(--pub-text)" }}>{email}</strong></p>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 18 }}>
                  {code.map((c, i) => (
                    <input
                      key={i}
                      ref={(el) => { codeRefs.current[i] = el; }}
                      className="pub-input"
                      value={c}
                      inputMode="numeric"
                      maxLength={1}
                      autoFocus={i === 0}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      style={{ width: 46, height: 52, textAlign: "center", fontSize: "1.375rem", fontWeight: 600, padding: 0 }}
                    />
                  ))}
                </div>
                <button className="pub-btn pub-btn-primary pub-btn-full pub-btn-lg" disabled={busy} onClick={handleVerify}>
                  {busy ? "Проверка…" : "Подтвердить"}
                </button>
                <button
                  onClick={handleSendCode}
                  disabled={secondsLeft > 0 || busy}
                  className="pub-btn pub-btn-ghost pub-btn-full pub-btn-sm"
                  style={{ marginTop: 12, color: secondsLeft > 0 ? "var(--pub-text-3)" : "var(--pub-purple)" }}
                >
                  {secondsLeft > 0 ? `Отправить повторно через ${timerLabel}` : "Отправить повторно"}
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label className="pub-label">Имя</label>
                    <input className="pub-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="pub-label">Фамилия</label>
                    <input className="pub-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="pub-label">Пароль</label>
                  <input className="pub-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="pub-label">Подтверждение пароля</label>
                  <input className="pub-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="pub-label">Предмет (необязательно)</label>
                  <input className="pub-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="pub-label">Область (необязательно)</label>
                  <input className="pub-input" value={region} onChange={(e) => setRegion(e.target.value)} />
                </div>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 16, fontSize: "0.8125rem", color: "var(--pub-text-2)" }}>
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>Я согласен с условиями использования</span>
                </label>
                <button className="pub-btn pub-btn-primary pub-btn-full pub-btn-lg" style={{ marginTop: 18 }} disabled={busy} onClick={handleRegister}>
                  {busy ? "Создание…" : "Создать аккаунт"}
                </button>
              </>
            )}

            <p style={{ textAlign: "center", fontSize: "0.875rem", marginTop: 20 }}>
              Уже есть аккаунт? <Link href="/login" style={{ color: "var(--pub-purple)", fontWeight: 500 }}>Войти</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
