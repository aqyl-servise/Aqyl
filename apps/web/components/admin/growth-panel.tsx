"use client";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, type GrowthNudgeStats, type GrowthSources, type ShortLinkRow } from "../../lib/api";
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
      <Sources token={token} />
      <Nudges token={token} />
      <ShortLinks token={token} />
    </div>
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
  const [busy, setBusy] = useState(false);
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
    setBusy(true); setMsg(null);
    try {
      const r = await api.growthSendActivation(token);
      setMsg(`Отправлено: ${r.sent}${r.failed ? `, не ушло: ${r.failed}` : ""}${r.total > r.sent + r.failed ? `. Осталось: ${r.total - r.sent - r.failed}` : ""}`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Не удалось отправить");
    } finally { setBusy(false); }
  }

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
              <button onClick={sendBacklog} disabled={busy} style={primaryBtn}>
                {busy ? "Отправляем…" : "Отправить всем, кто не начал"}
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

function PreviewButtons({ onShow }: { onShow: (lang: "ru" | "kz") => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button onClick={() => onShow("ru")} style={ghostBtn}>Письмо на русском</button>
      <button onClick={() => onShow("kz")} style={ghostBtn}>На казахском</button>
    </div>
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
