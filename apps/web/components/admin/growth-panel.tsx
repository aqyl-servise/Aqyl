"use client";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, type FunnelReport, type FunnelWeek, type GrowthNudgeStats, type GrowthSources, type ReferralOverview, type ShortLinkRow } from "../../lib/api";
import { Icon } from "../ui/icon";

/**
 * Рост: откуда приходят учителя, письма-подсказки, короткие ссылки.
 *
 * Отдельно от воронки B2C: там — управление конкретными учителями (доступ,
 * оплаты), здесь — каналы и сообщения, то есть работа продвижения.
 */
export function GrowthPanel({ token }: { token: string }) {
  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h2 style={{ margin: "0 0 20px", fontSize: 22 }}><Icon name="chart-line" size={16} /> Рост</h2>
      <Funnel token={token} />
      <Sources token={token} />
      <Nudges token={token} />
      <Referrals token={token} />
      <ShortLinks token={token} />
    </div>
  );
}

// ── Воронка активации ──────────────────────────────────────────────────────

const STEPS: Array<{ key: keyof FunnelWeek; label: string; tracked?: boolean }> = [
  { key: "registered", label: "Регистрация" },
  { key: "onboarded", label: "Онбординг" },
  { key: "opened", label: "Открыл форму", tracked: true },
  { key: "drafted", label: "Черновик" },
  { key: "started", label: "Запустил генерацию" },
  { key: "ready", label: "Готовый урок" },
  { key: "exported", label: "Скачал", tracked: true },
  { key: "second", label: "Второй урок" },
  { key: "paid", label: "Оплатил" },
];

/**
 * Где отваливаются учителя: по неделям регистрации, сколько дошли до
 * каждого шага (процент — от зарегистрированных). «Открыл форму» и «Скачал»
 * пишутся с 01.10.2026: у недель до этого там прочерк — прошлое не восстановить.
 */
function Funnel({ token }: { token: string }) {
  const [data, setData] = useState<FunnelReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.growthFunnel(token, 12).then(setData).catch(() => setError("Не удалось загрузить воронку"));
  }, [token]);

  const cell = (w: FunnelWeek, s: (typeof STEPS)[number]) => {
    if (s.tracked && !w.tracked) return <span style={hint}>—</span>;
    const n = w[s.key] as number;
    const pct = w.registered ? Math.round((n / w.registered) * 100) : 0;
    return <>{n} <span style={hint}>{s.key === "registered" ? "" : `${pct}%`}</span></>;
  };

  // Самый большой провал между соседними шагами за всё время (без неполных шагов).
  const worst = (() => {
    if (!data) return null;
    const steps = STEPS.filter((s) => !s.tracked);
    let best: { from: string; to: string; lost: number } | null = null;
    for (let i = 1; i < steps.length; i++) {
      const a = data.total[steps[i - 1].key] as number, b = data.total[steps[i].key] as number;
      if (a > 0 && (!best || a - b > best.lost)) best = { from: steps[i - 1].label, to: steps[i].label, lost: a - b };
    }
    return best;
  })();

  return (
    <section style={card}>
      <h3 style={h3}>Воронка активации</h3>
      <p style={muted}>
        По неделям регистрации: сколько учителей дошли до шага (процент — от зарегистрированных в эту неделю).
        «Открыл форму» и «Скачал» записываются с {data ? new Date(data.since).toLocaleDateString("ru-RU") : "01.10.2026"} —
        у более ранних недель там прочерк.
      </p>
      {error && <div style={{ color: "#dc2626" }}>{error}</div>}
      {data && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...table, minWidth: 880 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                  <th style={th}>Неделя</th>
                  {STEPS.map((s) => <th key={s.key} style={{ ...th, textAlign: "right" }}>{s.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...data.weeks, data.total].map((w) => (
                  <tr key={w.week} style={{ borderTop: "1px solid var(--border, #eee)", fontWeight: w.week === "всего" ? 700 : 400 }}>
                    <td style={td}>{w.week === "всего" ? "Всего" : `с ${new Date(w.week).toLocaleDateString("ru-RU")}`}</td>
                    {STEPS.map((s) => <td key={s.key} style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{cell(w, s)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {worst && (
            <div style={{ marginTop: 10, fontSize: 14 }}>
              Больше всего теряем между «{worst.from}» и «{worst.to}»: <b>{worst.lost}</b> учителей за всё время.
            </div>
          )}
          {Object.keys(data.exports).length > 0 && (
            <div style={{ ...hint, marginTop: 6 }}>
              Что скачивают (учителей): план в Word — {data.exports.export_plan ?? 0}, раздатка — {data.exports.export_handouts ?? 0},
              презентация — {data.exports.export_presentation ?? 0}.
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ── Источники ──────────────────────────────────────────────────────────────

const PERIODS: Array<{ days: number; label: string }> = [
  { days: 7, label: "7 дней" }, { days: 30, label: "30 дней" }, { days: 90, label: "90 дней" }, { days: 0, label: "всё время" },
];

function Sources({ token }: { token: string }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<GrowthSources | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api.growthSources(token, days).then(setData).catch(() => setError("Не удалось загрузить источники"));
  }, [token, days]);

  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

  return (
    <section style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 style={h3}>Откуда приходят учителя</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {PERIODS.map((p) => (
            <button key={p.days} onClick={() => setDays(p.days)}
              style={{ ...ghostBtn, ...(days === p.days ? { background: "var(--accent, #6f61d6)", color: "#fff", borderColor: "transparent" } : {}) }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <p style={muted}>
        Источник — первое касание: utm-метка ссылки, иначе сайт, с которого перешли. До 25.09.2026 источник
        не записывался — такие учителя в строке «не записан». «Сделали урок» — хотя бы один готовый план.
      </p>
      {error && <div style={{ color: "#dc2626" }}>{error}</div>}
      {data && (
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={th}>Источник</th>
                <th style={{ ...th, textAlign: "right" }}>Регистраций</th>
                <th style={{ ...th, textAlign: "right" }}>Сделали урок</th>
                <th style={{ ...th, textAlign: "right" }}>Заплатили</th>
                <th style={th}>Кампании</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.source} style={{ borderTop: "1px solid var(--border, #eee)" }}>
                  <td style={td}><b>{r.source}</b></td>
                  <td style={{ ...td, textAlign: "right" }}>{r.registered}</td>
                  <td style={{ ...td, textAlign: "right" }}>{r.activated} <span style={hint}>{pct(r.activated, r.registered)}</span></td>
                  <td style={{ ...td, textAlign: "right" }}>{r.paid} <span style={hint}>{pct(r.paid, r.registered)}</span></td>
                  <td style={{ ...td, color: "var(--text-secondary)", fontSize: 12 }}>
                    {r.campaigns.map((c) => `${c.campaign} (${c.n})`).join(", ") || "—"}
                  </td>
                </tr>
              ))}
              {!data.rows.length && (
                <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "var(--text-secondary)" }}>За период регистраций нет</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Письма-подсказки ───────────────────────────────────────────────────────

function Nudges({ token }: { token: string }) {
  const [stats, setStats] = useState<GrowthNudgeStats | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    api.growthNudges(token).then(setStats).catch(() => setMsg("Не удалось загрузить статистику писем"));
  }, [token]);
  useEffect(load, [load]);

  async function show(kind: "activation" | "trialEnd", lang: "ru" | "kz") {
    try { setPreview(await api.growthNudgePreview(token, kind, lang)); }
    catch { setMsg("Не удалось загрузить письмо"); }
  }

  async function sendBacklog() {
    if (!stats) return;
    const n = stats.pending.activationAuto + stats.pending.activationBacklog;
    if (!window.confirm(
      `Отправить письмо «Сделайте первый урок» учителям, которые не сделали ни одного урока: ${n}?\n\n` +
      `Каждый получит его один раз. За одно нажатие уходит не больше 80 писем — остальным можно отправить завтра.`,
    )) return;
    setMsg(null);
    try {
      await api.growthSendActivation(token);
      load();
    } catch (e) {
      // Ответ-страница nginx (504 и т. п.) — не показываем HTML как текст.
      const text = e instanceof Error ? e.message : "";
      setMsg(text && !text.includes("<") ? text : "Не удалось запустить рассылку. Обновите страницу: возможно, она уже идёт.");
    }
  }

  // Письма уходят в фоне по 3–4 секунды: пока рассылка идёт, обновляем счётчики.
  const running = stats?.progress.running ?? false;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [running, load]);
  const last = stats?.progress.last;

  return (
    <section style={card}>
      <h3 style={h3}>Письма-подсказки</h3>
      <p style={muted}>
        Уходят сами каждый день в 11:00, каждому учителю — один раз. Не получают: отписавшиеся, удаляющие аккаунт
        и адреса, с которых письма возвращались.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        <div style={sub}>
          <b>«Сделайте первый урок»</b>
          <div style={hint}>Сутки после регистрации, ни одного готового урока. Сами — только регистрациям последних 7 дней.</div>
          <div style={{ margin: "10px 0", fontSize: 14 }}>
            В очереди на утро: <b>{stats?.pending.activationAuto ?? "…"}</b><br />
            Отправлено всего: <b>{stats?.sent.activation ?? "…"}</b>
          </div>
          <PreviewButtons onShow={(lang) => show("activation", lang)} />
          {stats && stats.pending.activationBacklog > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border, #eee)" }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>
                Зарегистрировались раньше и не начали: <b>{stats.pending.activationBacklog}</b>.
                Им письмо само не уйдёт — только по кнопке.
              </div>
              <button onClick={sendBacklog} disabled={running} style={{ ...primaryBtn, opacity: running ? 0.6 : 1 }}>
                {running ? "Отправляем…" : "Отправить всем, кто не начал"}
              </button>
            </div>
          )}
        </div>
        <div style={sub}>
          <b>«Бесплатные уроки закончились»</b>
          <div style={hint}>Все бесплатные израсходованы от суток до 14 дней назад, покупок нет. С прайсом пакетов.</div>
          <div style={{ margin: "10px 0", fontSize: 14 }}>
            В очереди на утро: <b>{stats?.pending.trialEnd ?? "…"}</b><br />
            Отправлено всего: <b>{stats?.sent.trialEnd ?? "…"}</b>
          </div>
          <PreviewButtons onShow={(lang) => show("trialEnd", lang)} />
        </div>
      </div>
      {stats && <div style={{ ...hint, marginTop: 10 }}>Отписались от подсказок: {stats.sent.unsubscribed}</div>}
      <TestSend token={token} />
      {last && last.startedAt && (last.total > 0 || running) && (
        <div style={{ marginTop: 10, fontSize: 14 }}>
          {running ? "Идёт рассылка" : "Последняя рассылка"}: отправлено <b>{last.sent}</b> из {last.total}
          {last.failed ? `, не ушло: ${last.failed}` : ""}
          {!running && last.finishedAt ? ` · ${new Date(last.finishedAt).toLocaleString("ru-RU")}` : ""}
        </div>
      )}
      {msg && <div style={{ marginTop: 10, fontSize: 14 }}>{msg}</div>}

      {preview && (
        <div role="dialog" aria-modal="true" onClick={() => setPreview(null)} style={overlay}>
          <div onClick={(e) => e.stopPropagation()} style={modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div><span style={hint}>Тема:</span> <b>{preview.subject}</b></div>
              <button onClick={() => setPreview(null)} style={ghostBtn}>Закрыть</button>
            </div>
            <iframe title="Письмо" srcDoc={preview.html} sandbox=""
              style={{ width: "100%", height: "70vh", border: "1px solid var(--border, #eee)", borderRadius: 8, background: "#fff" }} />
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Тестовое письмо себе: проверить, куда оно ложится — «Входящие», «Промоакции»
 * или спам. Смотреть стоит в Gmail и в Mail.ru: у учителей в основном они.
 */
function TestSend({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<"activation" | "trialEnd">("activation");
  const [lang, setLang] = useState<"ru" | "kz">("ru");
  const [state, setState] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("Отправляем…");
    try {
      await api.growthSendTest(token, kind, lang, email.trim());
      setState(`Отправлено на ${email.trim()}. Проверьте «Входящие», «Промоакции» и «Спам».`);
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      setState(text && !text.includes("<") ? text : "Не удалось отправить");
    }
  }

  return (
    <form onSubmit={send} style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border, #eee)" }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Тестовое письмо себе</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input type="email" required placeholder="ваша почта" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...input, flex: "1 1 220px" }} />
        <select value={kind} onChange={(e) => setKind(e.target.value as "activation" | "trialEnd")} style={input}>
          <option value="activation">«Сделайте первый урок»</option>
          <option value="trialEnd">«Бесплатные закончились»</option>
        </select>
        <select value={lang} onChange={(e) => setLang(e.target.value as "ru" | "kz")} style={input}>
          <option value="ru">рус.</option>
          <option value="kz">каз.</option>
        </select>
        <button type="submit" style={ghostBtn}>Отправить</button>
      </div>
      {state && <div style={{ ...hint, marginTop: 6 }}>{state}</div>}
    </form>
  );
}

function PreviewButtons({ onShow }: { onShow: (lang: "ru" | "kz") => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button onClick={() => onShow("ru")} style={ghostBtn}>Письмо на русском</button>
      <button onClick={() => onShow("kz")} style={ghostBtn}>На казахском</button>
    </div>
  );
}

// ── Приглашения коллег ─────────────────────────────────────────────────────

function Referrals({ token }: { token: string }) {
  const [data, setData] = useState<ReferralOverview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.referralOverview(token).then(setData).catch(() => setError("Не удалось загрузить приглашения"));
  }, [token]);
  useEffect(load, [load]);

  async function act(id: string, approve: boolean) {
    setBusy(id); setError(null);
    try { await (approve ? api.approveReferral(token, id) : api.declineReferral(token, id)); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось"); }
    finally { setBusy(null); }
  }

  return (
    <section style={card}>
      <h3 style={h3}>Приглашения коллег</h3>
      <p style={muted}>
        За каждого приглашённого, кто сделал первый готовый урок, пригласившему начисляется {data?.bonus ?? 5} уроков
        (не больше {data?.cap ?? 10} наград на учителя). Если у обоих аккаунтов общее устройство — похоже на
        приглашение самого себя, — начисление ждёт вашего решения ниже.
      </p>
      {data && (
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 14, marginBottom: 12 }}>
          <span>Приглашено: <b>{data.totals.invited}</b></span>
          <span>Ждут первого урока: <b>{data.totals.pending}</b></span>
          <span>Награждено: <b>{data.totals.rewarded}</b></span>
          <span>Начислено уроков: <b>{data.totals.lessons}</b></span>
        </div>
      )}
      {error && <div style={{ color: "#dc2626", marginBottom: 10 }}>{error}</div>}
      {data && data.review.length > 0 && (
        <div style={{ overflowX: "auto", marginBottom: 12 }}>
          <table style={table}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={th}>Пригласил</th><th style={th}>Приглашённый</th><th style={th}>Почему на проверке</th><th style={th} />
              </tr>
            </thead>
            <tbody>
              {data.review.map((r) => (
                <tr key={r.inviteeId} style={{ borderTop: "1px solid var(--border, #eee)" }}>
                  <td style={td}>{r.inviterEmail}</td>
                  <td style={td}>{r.inviteeEmail}</td>
                  <td style={{ ...td, color: "var(--text-secondary)", fontSize: 12 }}>{r.note ?? r.status}</td>
                  <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right" }}>
                    <button onClick={() => act(r.inviteeId, true)} disabled={busy === r.inviteeId} style={{ ...ghostBtn, color: "#16a34a", borderColor: "#16a34a" }}>Начислить</button>
                    <button onClick={() => act(r.inviteeId, false)} disabled={busy === r.inviteeId} style={{ ...ghostBtn, marginLeft: 6 }}>Отклонить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.top.length > 0 && (
        <div style={hint}>Самые активные: {data.top.map((x) => `${x.email} — ${x.invited} (награждено ${x.rewarded})`).join("; ")}</div>
      )}
    </section>
  );
}

// ── Короткие ссылки ────────────────────────────────────────────────────────

const EMPTY = { code: "", lang: "ru" as "ru" | "kz", utmSource: "", utmMedium: "", utmCampaign: "", note: "" };

function ShortLinks({ token }: { token: string }) {
  const [links, setLinks] = useState<ShortLinkRow[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://aqyl-service.kz";

  const load = useCallback(() => {
    api.shortLinks(token).then(setLinks).catch(() => setError("Не удалось загрузить ссылки"));
  }, [token]);
  useEffect(load, [load]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: k === "note" ? e.target.value : e.target.value.toLowerCase().trim() }));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createShortLink(token, {
        code: form.code, lang: form.lang, utmSource: form.utmSource,
        utmMedium: form.utmMedium || undefined, utmCampaign: form.utmCampaign || undefined, note: form.note || undefined,
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать ссылку");
    }
  }

  async function remove(l: ShortLinkRow) {
    if (!window.confirm(`Удалить ссылку /r/${l.code}? Напечатанные QR-коды перестанут работать.`)) return;
    try { await api.deleteShortLink(token, l.code); load(); }
    catch { setError("Не удалось удалить"); }
  }

  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(null), 1500); }
    catch { window.prompt("Скопируйте ссылку", url); }
  }

  async function downloadQr(l: ShortLinkRow) {
    const png = await QRCode.toDataURL(`${origin}/r/${l.code}`, { width: 1024, margin: 2 });
    const a = document.createElement("a");
    a.href = png;
    a.download = `aqyl-qr-${l.code}.png`;
    a.click();
  }

  return (
    <section style={card}>
      <h3 style={h3}>Короткие ссылки и QR-коды</h3>
      <p style={muted}>
        Для листовок, выступлений на методобъединениях и партнёров: <code>{origin.replace(/^https?:\/\//, "")}/r/almaty</code> ведёт
        на витрину с нужными метками, а переходы считаются, даже если человек не зарегистрировался. Источник, канал и
        кампания — латиницей, как в плане продвижения (например: methodist / offline / almaty).
      </p>

      <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 16 }}>
        <input required placeholder="код: almaty" value={form.code} onChange={set("code")} style={input} />
        <select value={form.lang} onChange={set("lang")} style={input}>
          <option value="ru">витрина на русском</option>
          <option value="kz">витрина на казахском</option>
        </select>
        <input required placeholder="источник: methodist" value={form.utmSource} onChange={set("utmSource")} style={input} />
        <input placeholder="канал: offline" value={form.utmMedium} onChange={set("utmMedium")} style={input} />
        <input placeholder="кампания: almaty" value={form.utmCampaign} onChange={set("utmCampaign")} style={input} />
        <input placeholder="заметка для себя" value={form.note} onChange={set("note")} style={input} />
        <button type="submit" style={primaryBtn}>Создать</button>
      </form>
      {error && <div style={{ color: "#dc2626", marginBottom: 10 }}>{error}</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted)" }}>
              <th style={th}>Ссылка</th>
              <th style={th}>Метки</th>
              <th style={{ ...th, textAlign: "right" }}>Переходов</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {links.map((l) => {
              const url = `${origin}/r/${l.code}`;
              return (
                <tr key={l.code} style={{ borderTop: "1px solid var(--border, #eee)" }}>
                  <td style={td}>
                    <b>/r/{l.code}</b> <span style={hint}>{l.lang === "kz" ? "· каз." : "· рус."}</span>
                    {l.note && <div style={hint}>{l.note}</div>}
                  </td>
                  <td style={{ ...td, fontSize: 12, color: "var(--text-secondary)" }}>
                    {[l.utmSource, l.utmMedium, l.utmCampaign].filter(Boolean).join(" / ")}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>{l.clicks}</td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <button onClick={() => copy(url)} style={ghostBtn}>{copied === url ? "Скопировано" : "Копировать"}</button>
                    <button onClick={() => downloadQr(l)} style={{ ...ghostBtn, marginLeft: 6 }}>QR</button>
                    <button onClick={() => remove(l)} style={{ ...ghostBtn, marginLeft: 6, color: "#dc2626" }}>Удалить</button>
                  </td>
                </tr>
              );
            })}
            {!links.length && (
              <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: "var(--text-secondary)" }}>Ссылок пока нет</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── стили ──────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "var(--bg-card, #fff)", borderRadius: 12, padding: 20, marginBottom: 20,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
};
const sub: React.CSSProperties = { border: "1px solid var(--border, #eee)", borderRadius: 10, padding: 14 };
const h3: React.CSSProperties = { margin: "0 0 6px", fontSize: 17 };
const muted: React.CSSProperties = { margin: "6px 0 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 };
const hint: React.CSSProperties = { fontSize: 12, color: "var(--text-secondary)" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th: React.CSSProperties = { padding: "8px 10px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "9px 10px", verticalAlign: "top" };
const input: React.CSSProperties = {
  padding: "8px 10px", fontSize: 14, borderRadius: 8, border: "1px solid var(--border, #ddd)",
  background: "var(--bg-input, transparent)", color: "inherit", minWidth: 0,
};
const ghostBtn: React.CSSProperties = {
  padding: "5px 10px", fontSize: 12, borderRadius: 6, cursor: "pointer",
  border: "1px solid var(--border, #ddd)", background: "transparent", color: "inherit",
};
const primaryBtn: React.CSSProperties = {
  padding: "8px 14px", fontSize: 14, borderRadius: 8, cursor: "pointer",
  border: 0, background: "var(--accent, #6f61d6)", color: "#fff", fontWeight: 600,
};
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 1000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const modal: React.CSSProperties = {
  background: "var(--bg-card, #fff)", borderRadius: 12, padding: 16, width: "min(680px, 100%)",
};
