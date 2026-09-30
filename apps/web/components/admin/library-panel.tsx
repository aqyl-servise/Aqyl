"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type LibraryAdminRow } from "../../lib/api";
import type { ExamplePage } from "../../lib/library";
import { PlanView } from "../library/plan-view";
import { Icon } from "../ui/icon";

/**
 * Библиотека примеров для поиска: темы ставятся в очередь, генерируются по
 * одной, вычитываются здесь и только после этого публикуются на /plans.
 */
export function LibraryPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<LibraryAdminRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExamplePage | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ lang: "ru" as "ru" | "kz", subject: "", grade: "8", topic: "", objectives: "" });

  const load = useCallback(() => {
    api.libraryList(token).then(setRows).catch(() => setError("Не удалось загрузить библиотеку"));
  }, [token]);
  useEffect(load, [load]);

  // Пока что-то в очереди или генерируется — обновляем раз в 15 секунд.
  const pending = rows.some((r) => r.generation === "queued" || r.generation === "generating" || r.generation === "draft");
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [pending, load]);

  const errMsg = (e: unknown, fallback: string) => {
    const t = e instanceof Error ? e.message : "";
    return t && !t.includes("<") ? t : fallback;
  };

  async function seed() {
    if (!window.confirm("Поставить в очередь стартовый набор — 30 тем (15 на русском, 15 на казахском)?\n\nГенерация идёт по одной, всё вместе займёт около часа. На сайт ничего не попадёт до вашей публикации.")) return;
    setError(null);
    try { const r = await api.librarySeed(token); setError(`Добавлено в очередь: ${r.added}`); load(); }
    catch (e) { setError(errMsg(e, "Не удалось добавить набор")); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.libraryCreate(token, {
        lang: form.lang, subject: form.subject.trim(), grade: Number(form.grade), topic: form.topic.trim(),
        objectives: form.objectives.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean),
      });
      setForm((f) => ({ ...f, topic: "", objectives: "" }));
      load();
    } catch (err) { setError(errMsg(err, "Не удалось добавить тему")); }
  }

  async function open(r: LibraryAdminRow) {
    try { setPreview(await api.libraryContent(token, r.id)); setPreviewId(r.id); }
    catch { setError("Не удалось открыть план"); }
  }

  async function act(r: LibraryAdminRow, action: "publish" | "unpublish" | "retry") {
    setBusy(r.id); setError(null);
    try { await api.libraryAction(token, r.id, action); load(); if (action !== "retry") setPreview(null); }
    catch (e) { setError(errMsg(e, "Не удалось")); }
    finally { setBusy(null); }
  }

  async function remove(r: LibraryAdminRow) {
    if (!window.confirm(`Удалить пример «${r.topic}»?${r.status === "published" ? " Страница пропадёт с сайта." : ""}`)) return;
    try { await api.libraryDelete(token, r.id); load(); } catch { setError("Не удалось удалить"); }
  }

  const count = (f: (r: LibraryAdminRow) => boolean) => rows.filter(f).length;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://aqyl-service.kz";
  const previewRow = rows.find((r) => r.id === previewId);

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 22 }}><Icon name="books" size={16} /> Библиотека примеров</h2>
      <p style={muted}>
        Публичные страницы <a href={`${origin}/plans`} target="_blank" rel="noreferrer">/plans</a> под поисковые запросы вида
        «КСП по химии 8 класс» и «ҚМЖ 8 сынып химия». План генерируется тем же движком, что и у учителей, от служебного
        аккаунта. На сайт попадает только то, что вы опубликовали после вычитки. Коды целей обучения укажите, если знаете
        их точно: без кодов страница показывает цели урока, но не коды программы.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14, margin: "10px 0 16px" }}>
        <span>Всего: <b>{rows.length}</b></span>
        <span>В очереди: <b>{count((r) => r.generation === "queued")}</b></span>
        <span>Генерируется: <b>{count((r) => r.generation === "generating" || r.generation === "draft")}</b></span>
        <span>Ждут вычитки: <b>{count((r) => r.generation === "ready" && r.status === "draft")}</b></span>
        <span>Опубликовано: <b>{count((r) => r.status === "published")}</b></span>
        <span>Сбой: <b>{count((r) => r.generation === "error")}</b></span>
      </div>

      <section style={card}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <b style={{ fontSize: 15 }}>Добавить тему</b>
          <button onClick={seed} style={{ ...ghostBtn, marginLeft: "auto" }}>Стартовый набор — 30 тем</button>
        </div>
        <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
          <select value={form.lang} onChange={(e) => setForm({ ...form, lang: e.target.value as "ru" | "kz" })} style={input}>
            <option value="ru">КСП, на русском</option>
            <option value="kz">ҚМЖ, на казахском</option>
          </select>
          <input required placeholder="предмет: Химия" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={input} />
          <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} style={input}>
            {Array.from({ length: 11 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} класс</option>)}
          </select>
          <input required placeholder="тема урока" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} style={{ ...input, gridColumn: "span 2" }} />
          <input placeholder="коды целей: 8.2.1.4, 8.2.1.5" value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} style={input} />
          <button type="submit" style={primaryBtn}>В очередь</button>
        </form>
        {error && <div style={{ marginTop: 10, fontSize: 14 }}>{error}</div>}
      </section>

      <section style={{ ...card, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 760 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted)" }}>
              <th style={th}>Тема</th><th style={th}>Генерация</th><th style={th}>На сайте</th>
              <th style={{ ...th, textAlign: "right" }}>Просмотры</th><th style={th} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border, #eee)" }}>
                <td style={td}>
                  <b>{r.topic}</b>
                  <div style={hint}>{r.lang === "kz" ? "ҚМЖ" : "КСП"} · {r.subject}, {r.grade} {r.lang === "kz" ? "сынып" : "класс"}{r.objectives.length ? ` · ${r.objectives.join(", ")}` : ""}</div>
                </td>
                <td style={td}>
                  {GEN_LABEL[r.generation] ?? r.generation}
                  {r.generation === "error" && r.generationError && <div style={{ ...hint, maxWidth: 260 }}>{r.generationError.slice(0, 140)}</div>}
                </td>
                <td style={td}>
                  {r.status === "published"
                    ? <a href={`${origin}/plans/${r.slug}`} target="_blank" rel="noreferrer">опубликован</a>
                    : <span style={hint}>черновик</span>}
                </td>
                <td style={{ ...td, textAlign: "right" }}>{r.views}</td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                  {r.generation === "ready" && <button onClick={() => open(r)} style={ghostBtn}>Читать</button>}
                  {r.generation === "error" && <button onClick={() => act(r, "retry")} disabled={busy === r.id} style={ghostBtn}>Повторить</button>}
                  <button onClick={() => remove(r)} style={{ ...ghostBtn, marginLeft: 6, color: "#dc2626" }}>Удалить</button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "var(--text-secondary)" }}>Пока пусто — добавьте тему или стартовый набор</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {preview && previewRow && (
        <div role="dialog" aria-modal="true" onClick={() => setPreview(null)} style={overlay}>
          <div onClick={(e) => e.stopPropagation()} style={modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <b style={{ fontSize: 16 }}>{previewRow.topic}</b>
              <div style={{ display: "flex", gap: 8 }}>
                {previewRow.status === "published"
                  ? <button onClick={() => act(previewRow, "unpublish")} disabled={busy === previewRow.id} style={ghostBtn}>Снять с сайта</button>
                  : <button onClick={() => act(previewRow, "publish")} disabled={busy === previewRow.id} style={primaryBtn}>Опубликовать</button>}
                <button onClick={() => setPreview(null)} style={ghostBtn}>Закрыть</button>
              </div>
            </div>
            <p style={{ ...hint, marginBottom: 12 }}>
              Проверьте факты, термины и соответствие теме. Если план слабый — удалите пример и поставьте тему заново.
            </p>
            {preview.plan
              ? <div style={{ background: "#fff", color: "#1e293b", borderRadius: 10, padding: 12 }}>
                  <PlanView plan={preview.plan} lang={preview.lang} subject={preview.subject} grade={preview.grade} topic={preview.topic} />
                </div>
              : <div>План ещё не готов.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

const GEN_LABEL: Record<string, string> = {
  queued: "в очереди", draft: "запускается", generating: "генерируется…", ready: "готов", error: "сбой", missing: "урок удалён",
};

const card: React.CSSProperties = { background: "var(--bg-card, #fff)", borderRadius: 12, padding: 18, marginBottom: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };
const muted: React.CSSProperties = { margin: "0 0 6px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, maxWidth: 900 };
const hint: React.CSSProperties = { fontSize: 12, color: "var(--text-secondary)" };
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
  display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflowY: "auto",
};
const modal: React.CSSProperties = {
  background: "var(--bg-card, #fff)", borderRadius: 12, padding: 16, width: "min(1100px, 100%)", margin: "24px 0",
};
