"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type Protocol = Awaited<ReturnType<typeof api.getProtocols>>[number];

const TYPES = ["pedagogical-council", "parent-meeting", "educational", "other"];
const TYPE_LABELS: Record<string, string> = {
  "pedagogical-council": "Педагогический совет",
  "parent-meeting": "Родительское собрание",
  educational: "Воспитательное",
  other: "Прочее",
  // legacy aliases
  pedagogical: "Педагогический совет",
  parent: "Родительское собрание",
};

export function ProtocolsPanel({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.getProtocols(token).then(setProtocols).catch(console.error);
  }, [token]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.createProtocol(token, {
        title: fd.get("title"),
        type: fd.get("type"),
        date: fd.get("date") || undefined,
        content: fd.get("content"),
      });
      setProtocols(await api.getProtocols(token));
      setAdding(false);
    } finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📋 {t.nav_protocols}</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Создать</button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Новый протокол</h3>
          <form onSubmit={handleCreate} className="form-stack">
            <Field label={t.title} name="title" />
            <div className="form-row">
              <div className="field">
                <label className="field-label">Тип</label>
                <select name="type" className="input" required>
                  {TYPES.map((tp) => <option key={tp} value={tp}>{TYPE_LABELS[tp]}</option>)}
                </select>
              </div>
              <Field label={t.date} name="date" type="date" />
            </div>
            <div className="field">
              <label className="field-label">{t.content}</label>
              <textarea name="content" className="textarea" style={{ minHeight: 120 }} />
            </div>
            <div className="form-row">
              <button className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : t.save}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>{t.cancel}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {protocols.length === 0 ? <p className="empty-state">{t.noData}</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.title}</th><th>Тип</th><th>Дата</th><th>Составил</th><th></th>
              </tr>
            </thead>
            <tbody>
              {protocols.map((p) => (
                <>
                  <tr key={p.id}>
                    <td className="table-name">{p.title}</td>
                    <td><span className="badge badge-sm">{TYPE_LABELS[p.type] ?? p.type}</span></td>
                    <td>{p.date ? new Date(p.date).toLocaleDateString("ru-RU") : "—"}</td>
                    <td>{p.createdBy?.fullName ?? "—"}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                        {expanded === p.id ? "Скрыть" : "Подробнее"}
                      </button>
                    </td>
                  </tr>
                  {expanded === p.id && p.content && (
                    <tr key={`${p.id}-expand`}>
                      <td colSpan={5}>
                        <div className="expand-content">{p.content}</div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, type, defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input name={name} type={type ?? "text"} defaultValue={defaultValue} className="input" />
    </div>
  );
}
