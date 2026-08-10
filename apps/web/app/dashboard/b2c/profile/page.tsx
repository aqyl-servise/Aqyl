"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getValidAccessToken, logout } from "../../../../lib/auth";
import { api, type B2CProfile } from "../../../../lib/api";
import { useLang, LT } from "../../../../lib/lesson-translations";
import { LangSwitcher } from "../../../../components/lang-switcher";
import { Icon } from "../../../../components/ui/icon";
import { DeleteAccountConfirmText } from "../../../../components/delete-account-confirm";
import { useIsIosApp } from "../../../../lib/platform";

// Бренд-токены применяются через класс .aqyl-b2c на корне (см. globals.css).
const BRAND = "var(--amber)";
const DARK = "var(--white)";

/** Экраны раздела «Управление аккаунтом»: обычный → подтверждение → готово. */
type DelStep = "idle" | "confirm" | "done";

export default function ProfilePage() {
  const router = useRouter();
  const iosApp = useIsIosApp();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  const [profile, setProfile] = useState<B2CProfile | null>(null);
  const [delStep, setDelStep] = useState<DelStep>("idle");
  const [password, setPassword] = useState("");
  const [delError, setDelError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [purgeAfter, setPurgeAfter] = useState<string>("");

  useEffect(() => {
    (async () => {
      const tk = await getValidAccessToken();
      if (!tk) { router.replace("/login"); return; }
      try { setProfile(await api.getB2CMe(tk)); } catch { router.replace("/login"); }
    })();
  }, [router]);

  async function confirmDelete() {
    setDelError(null);
    setBusy(true);
    try {
      const tk = await getValidAccessToken();
      if (!tk) { router.replace("/login"); return; }
      const res = await api.deleteAccount(tk, password);
      setPurgeAfter(new Date(res.purgeAfter).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" }));
      setDelStep("done");
      // Сессия больше не действует — чистим токены, но не уводим со страницы,
      // чтобы человек дочитал условия восстановления.
      await logout();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setDelError(msg.includes("INVALID_PASSWORD") || msg.includes("401") ? t.delWrongPass : t.delFailed);
    } finally {
      setBusy(false);
    }
  }

  const row = (l: string, v: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 15 }}>
      <span style={{ color: "var(--muted)" }}>{l}</span><span style={{ color: "var(--white)", fontWeight: 600 }}>{v || "—"}</span>
    </div>
  );

  return (
    <div className="aqyl-b2c" style={{ minHeight: "100vh" }}>
      <header style={{ background: "var(--ink-2)", color: "var(--white)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--line)" }}>
        <button onClick={() => router.push("/dashboard/b2c")} style={{ background: "rgba(139,127,232,.12)", border: "1px solid var(--line)", color: "var(--white)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>← {t.back}</button>
        <span style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="user" size={18} /> {t.profile}</span>
        <div style={{ marginLeft: "auto" }}><LangSwitcher lang={lang} setLang={setLang} dark /></div>
      </header>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "28px 24px" }}>
        {!profile ? <div style={{ color: "var(--muted)" }}>{t.loading}</div> : (
          <div style={{ background: "var(--ink-2)", borderRadius: 14, padding: "24px", border: "1px solid var(--line)" }}>
            {row(t.pName, profile.fullName)}
            {row(t.pEmail, profile.email)}
            {row(t.pSubject, profile.subject ?? "")}
            {row("Подписка", subLabel(profile))}
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>
              Продление ручное: автоматических списаний нет. Напомним за 3 дня до окончания.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              {iosApp === false && <button onClick={() => router.push("/dashboard/b2c/subscribe")} style={{ background: BRAND, color: "var(--on-amber)", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>{t.subscription}</button>}
              <button onClick={async () => { await logout(); router.replace("/login"); }} style={{ background: "transparent", border: "1.5px solid var(--lavender)", color: "var(--white)", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>{t.logout}</button>
            </div>
          </div>
        )}

        {/* ── Управление аккаунтом ──────────────────────────────────────────
            Путь ровно три уровня: Профиль → Управление аккаунтом → Удалить
            аккаунт. Пункт назван дословно «Удалить аккаунт»: слова
            «заморозить», «приостановить», «деактивировать» запрещены.
            Дополнительное подтверждение ровно одно — пароль. Поле «причина
            удаления» не запрашивается, к поддержке не отправляем. */}
        {profile && (
          <section style={{ background: "var(--ink-2)", borderRadius: 14, padding: 24, border: "1px solid var(--line)", marginTop: 18 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, margin: "0 0 14px", color: "var(--white)" }}>
              {t.accountMgmt}
            </h2>

            {delStep === "idle" && (
              <button
                onClick={() => { setDelStep("confirm"); setDelError(null); setPassword(""); }}
                style={{ background: "transparent", border: "1.5px solid var(--danger)", color: "var(--danger)", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}
              >
                {t.deleteAccount}
              </button>
            )}

            {delStep === "confirm" && (
              <div>
                <DeleteAccountConfirmText tone="dark" />

                <label style={{ display: "block", marginTop: 18, fontSize: 13, fontWeight: 700, color: "var(--white)", marginBottom: 6 }}>
                  {t.delPassLabel}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: "1.5px solid var(--line)", background: "var(--ink)", color: "var(--white)", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" }}
                />

                {delError && (
                  <div style={{ marginTop: 12, color: "var(--danger)", fontSize: 14 }}>{delError}</div>
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
                  <button
                    onClick={() => { setDelStep("idle"); setPassword(""); setDelError(null); }}
                    style={{ background: "transparent", border: "1.5px solid var(--lavender)", color: "var(--white)", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={!password || busy}
                    style={{ background: "var(--danger)", border: "none", color: "#fff", borderRadius: 10, padding: "10px 18px", cursor: !password || busy ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "inherit", opacity: !password || busy ? 0.6 : 1 }}
                  >
                    {t.deleteAccount}
                  </button>
                </div>
              </div>
            )}

            {delStep === "done" && (
              <div>
                <div style={{ fontWeight: 700, color: "var(--white)", marginBottom: 8 }}>{t.delDoneTitle}</div>
                <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.7, margin: "0 0 18px" }}>
                  {t.delDoneHint.replace("{d}", purgeAfter)}
                </p>
                <button
                  onClick={() => router.replace("/login")}
                  style={{ background: BRAND, border: "none", color: "var(--on-amber)", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}
                >
                  {t.logout}
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

/** Состояние подписки строкой. Дата важнее статуса: по ней принимают решение. */
function subLabel(p: { subscriptionStatus?: string; trialEndsAt?: string | null }): string {
  const d = p.trialEndsAt ? new Date(p.trialEndsAt).toLocaleDateString("ru-RU") : null;
  if (p.subscriptionStatus === "active") return d ? `активна до ${d}` : "активна";
  if (p.subscriptionStatus === "trial") return d ? `пробный период до ${d}` : "пробный период";
  return "неактивна";
}
