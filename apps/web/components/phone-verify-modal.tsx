"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { COMPANY } from "../lib/company";

type Lang = "ru" | "kz" | "en";

const TXT = {
  ru: {
    title: "Подтвердите номер — и продолжайте бесплатно",
    lead: "Чтобы получить оставшиеся бесплатные уроки, подтвердите номер телефона: так они достаются одному учителю один раз, а не повторным регистрациям.",
    leadSent: "Мы отправили шестизначный код по SMS на {phone}. Введите его ниже.",
    getCode: "Получить код", sending: "Отправляем…", verify: "Подтвердить", checking: "Проверяем…",
    change: "Изменить номер", resend: "Отправить код ещё раз", resendIn: "Отправить снова через {s} с",
    cancel: "Не сейчас", onlyKz: "Номер казахстанского мобильного оператора: +7 7XX …",
    smsFail: `Не удалось отправить SMS. Попробуйте через минуту или напишите нам: ${COMPANY.email}`,
  },
  kz: {
    title: "Нөміріңізді растаңыз — тегін жалғастырыңыз",
    lead: "Қалған тегін сабақтарды алу үшін телефон нөміріңізді растаңыз: осылайша олар қайта тіркелулерге емес, бір мұғалімге бір рет беріледі.",
    leadSent: "{phone} нөміріне SMS арқылы алты таңбалы код жібердік. Оны төменге енгізіңіз.",
    getCode: "Код алу", sending: "Жіберілуде…", verify: "Растау", checking: "Тексерілуде…",
    change: "Нөмірді өзгерту", resend: "Кодты қайта жіберу", resendIn: "{s} сек кейін қайта жіберуге болады",
    cancel: "Кейінірек", onlyKz: "Қазақстандық ұялы байланыс операторының нөмірі: +7 7XX …",
    smsFail: `SMS жіберу мүмкін болмады. Бір минуттан кейін қайталаңыз немесе бізге жазыңыз: ${COMPANY.email}`,
  },
  en: {
    title: "Confirm your phone to continue for free",
    lead: "To get the remaining free lessons, confirm your phone number, so they go to one teacher once rather than to repeat sign-ups.",
    leadSent: "We sent a six-digit code by SMS to {phone}. Enter it below.",
    getCode: "Get code", sending: "Sending…", verify: "Confirm", checking: "Checking…",
    change: "Change number", resend: "Send the code again", resendIn: "Resend in {s} s",
    cancel: "Not now", onlyKz: "A Kazakhstan mobile number: +7 7XX …",
    smsFail: `Could not send the SMS. Try again in a minute or write to us: ${COMPANY.email}`,
  },
} as const;

/** Сервер отвечает 1 минутой паузы между кодами (phone-verification.service). */
const RESEND_SECONDS = 60;

/**
 * Подтверждение номера телефона перед выдачей бесплатных уроков.
 *
 * Появляется не при регистрации, а после нескольких бесплатных уроков
 * (LESSONS_BEFORE_PHONE): трение попадает туда, где ценность уже получена.
 * поэтому именно он защищает бесплатный доступ от мультиаккаунтов.
 *
 * 01.10.2026: 18 учителей сделали первый урок и остановились перед этим
 * окном. Текст теперь говорит, что учитель получает, а не только чего от
 * него хотят; есть повторная отправка кода и казахский язык; клик мимо
 * окна больше не закрывает его вместе с запуском урока.
 */
export function PhoneVerifyModal({
  token, onDone, onClose, lang = "ru",
}: {
  token: string;
  /** trialAllowed=false — номер уже получал бесплатные уроки раньше. */
  onDone: (trialAllowed: boolean) => void;
  onClose: () => void;
  lang?: Lang;
}) {
  const T = TXT[lang] ?? TXT.ru;
  const [phone, setPhone] = useState("+7 ");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  // Текст ошибки с сервера — по-русски и понятный; внутренние коды
  // (SMS_SEND_FAILED, 500) показываем человеческим сообщением.
  const msg = (e: unknown) => {
    const m = e instanceof Error ? e.message : "";
    if (!m || /SMS_|Internal server error|<\s*html/i.test(m)) return T.smsFail;
    return m;
  };

  async function send() {
    setError(null); setBusy(true);
    try {
      await api.sendPhoneCode(token, phone);
      setSent(true);
      setWait(RESEND_SECONDS);
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
    fontSize: 16, fontFamily: "inherit", marginBottom: 12, boxSizing: "border-box",
  };
  const primary = (disabled: boolean): React.CSSProperties => ({
    width: "100%", background: "var(--amber)", color: "var(--on-amber)", border: 0, borderRadius: 11, padding: 13,
    fontWeight: 800, fontSize: 15, fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .6 : 1,
  });
  const link: React.CSSProperties = {
    background: "transparent", border: 0, color: "var(--muted)", padding: "10px 0 0",
    fontSize: 13.5, fontFamily: "inherit", cursor: "pointer",
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="phone-verify-title"
      style={{ position: "fixed", inset: 0, background: "rgba(6,5,20,.72)", display: "grid", placeItems: "center", padding: 20, zIndex: 50 }}
    >
      <div style={{ background: "var(--ink)", border: "1px solid var(--line)", borderRadius: 18, padding: "26px 24px", maxWidth: 420, width: "100%" }}>
        <h2 id="phone-verify-title" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 21, margin: "0 0 8px" }}>
          {T.title}
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.6, margin: "0 0 18px" }}>
          {sent ? T.leadSent.replace("{phone}", phone.trim()) : T.lead}
        </p>

        {!sent ? (
          <>
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 777 123 45 67" inputMode="tel" autoComplete="tel" style={box}
            />
            <div style={{ color: "var(--muted)", fontSize: 12.5, margin: "-6px 0 12px" }}>{T.onlyKz}</div>
            <button onClick={send} disabled={busy} style={primary(busy)}>{busy ? T.sending : T.getCode}</button>
          </>
        ) : (
          <>
            <input
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              style={{ ...box, letterSpacing: 6, textAlign: "center", fontWeight: 700 }}
            />
            <button onClick={verify} disabled={busy || code.length < 6} style={primary(busy || code.length < 6)}>
              {busy ? T.checking : T.verify}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => { setSent(false); setCode(""); setError(null); }} style={link}>{T.change}</button>
              <button onClick={send} disabled={busy || wait > 0} style={{ ...link, cursor: busy || wait > 0 ? "default" : "pointer" }}>
                {wait > 0 ? T.resendIn.replace("{s}", String(wait)) : T.resend}
              </button>
            </div>
          </>
        )}

        {error && (
          <p style={{ color: "var(--danger, #ef5350)", fontSize: 14, margin: "12px 0 0" }}>{error}</p>
        )}

        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button onClick={onClose} style={link}>{T.cancel}</button>
        </div>
      </div>
    </div>
  );
}
