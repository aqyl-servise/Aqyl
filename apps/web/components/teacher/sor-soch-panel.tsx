"use client";
import { FormEvent, useEffect, useState } from "react";
import { api, API_URL, SorSochDoc } from "../../lib/api";
import { Language } from "../../lib/translations";

type Classroom = { id: string; name: string };

const QUARTER_NUMS = ["1", "2", "3", "4"];

async function openFileUrl(fileUrl: string, token: string) {
  if (!fileUrl.startsWith("/files/")) {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const res = await fetch(`${API_URL}${fileUrl}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function SorSochPanel({ token, language, t, isAdmin, userRole }: {
  token: string;
  language: Language;
  t: Record<string, string>;
  isAdmin?: boolean;
  userRole?: string;
}) {
  const [tab, setTab] = useState<"sor" | "soch">("sor");
  const [docs, setDocs] = useState<SorSochDoc[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<SorSochDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterClassroom, setFilterClassroom] = useState("");
  const [filterQuarter, setFilterQuarter] = useState("");
  const [renaming, setRenaming] = useState<SorSochDoc | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  async function reload() {
    const params: Parameters<typeof api.getSorSoch>[1] = { type: tab };
    if (filterSubject) params.subject = filterSubject;
    if (filterClassroom) params.classroomId = filterClassroom;
    if (filterQuarter) params.quarter = filterQuarter;
    const [d, cl] = await Promise.all([
      api.getSorSoch(token, params),
      api.getClassrooms(token).catch(() => []),
    ]);
    setDocs(d);
    setClassrooms(cl);
  }

  useEffect(() => {
    setLoading(true);
    reload().catch(console.error).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tab]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      let fileUrl: string | undefined;
      const file = fd.get("file") as File | null;
      if (file && file.size > 0) {
        const uploaded = await api.uploadFile(token, file);
        fileUrl = uploaded.url;
      }
      await api.createSorSoch(token, {
        title: String(fd.get("title") ?? "").trim(),
        type: tab,
        subject: String(fd.get("subject") ?? "").trim() || undefined,
        classroomId: String(fd.get("classroomId") ?? "") || undefined,
        quarter: String(fd.get("quarter") ?? "") || undefined,
        fileUrl,
      });
      await reload();
      setAdding(false);
    } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.sor_confirm_delete)) return;
    await api.deleteSorSoch(token, id);
    setDocs(prev => prev.filter(d => d.id !== id));
  }

  async function handleRename() {
    if (!renaming || !renameTitle.trim()) return;
    setBusy(true);
    try {
      await api.updateSorSoch(token, renaming.id, { title: renameTitle.trim() });
      await reload();
      setRenaming(null);
    } finally { setBusy(false); }
  }

  const subjects = Array.from(new Set(docs.map(d => d.subject).filter(Boolean) as string[]));

  return (
    <div className="page">
      <h1 className="page-title">📄 {t.sor_soch_title}</h1>

      <div className="sc-tabs">
        <button className={`sc-tab${tab === "sor" ? " sc-tab-active" : ""}`} onClick={() => { setTab("sor"); setAdding(false); }}>
          {t.sor_tab_sor_full}
        </button>
        <button className={`sc-tab${tab === "soch" ? " sc-tab-active" : ""}`} onClick={() => { setTab("soch"); setAdding(false); }}>
          {t.sor_tab_soch_full}
        </button>
      </div>

      <div className="card" style={{ marginTop: 0 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <input
            className="input" style={{ width: 180 }}
            placeholder={t.subject}
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
          />
          <select className="input" style={{ width: 160 }} value={filterClassroom} onChange={e => setFilterClassroom(e.target.value)}>
            <option value="">{t.all_classes}</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input" style={{ width: 160 }} value={filterQuarter} onChange={e => setFilterQuarter(e.target.value)}>
            <option value="">{t.sor_quarter_all}</option>
            {QUARTER_NUMS.map(n => {
              const label = `${n} ${t.sor_quarter}`;
              return <option key={n} value={label}>{label}</option>;
            })}
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => reload()}>{t.sor_apply_filter}</button>
          <div style={{ marginLeft: "auto" }}>
            {!isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
                + {t.sor_upload}
              </button>
            )}
          </div>
        </div>

        {adding && (
          <div style={{ marginBottom: 20, padding: "16px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <h4 style={{ marginBottom: 12 }}>{t.sor_upload} — {tab === "sor" ? t.sor_tab_sor : t.sor_tab_soch}</h4>
            <form onSubmit={handleCreate} className="form-stack">
              <div className="form-row">
                <div className="field">
                  <label className="field-label">{t.sor_name_label} *</label>
                  <input name="title" className="input" required />
                </div>
                <div className="field">
                  <label className="field-label">{t.subject}</label>
                  <input name="subject" className="input" />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label className="field-label">{t.classroom}</label>
                  <select name="classroomId" className="input">
                    <option value="">— {t.selectClass} —</option>
                    {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">{t.sor_quarter}</label>
                  <select name="quarter" className="input">
                    <option value="">—</option>
                    {QUARTER_NUMS.map(n => {
                      const label = `${n} ${t.sor_quarter}`;
                      return <option key={n} value={label}>{label}</option>;
                    })}
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="field-label">{t.sor_file_label}</label>
                <input name="file" type="file" className="input" accept=".pdf,.docx,.doc,.xlsx,.xls" />
              </div>
              <div className="form-row">
                <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
                  {busy ? <span className="spinner" /> : t.save}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>{t.cancel}</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="fm-empty">{t.loading}</p>
        ) : docs.length === 0 ? (
          <p className="fm-empty">{t.noData}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.sor_name_label}</th>
                <th>{t.subject}</th>
                <th>{t.classroom}</th>
                <th>{t.sor_quarter}</th>
                {isAdmin && <th>{t.teacher_label}</th>}
                <th>{t.date}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id}>
                  <td className="table-name">{doc.title}</td>
                  <td>{doc.subject ?? "—"}</td>
                  <td>{doc.classroom?.name ?? "—"}</td>
                  <td>{doc.quarter ?? "—"}</td>
                  {isAdmin && <td>{doc.teacher?.fullName ?? "—"}</td>}
                  <td className="muted">{new Date(doc.createdAt).toLocaleDateString("ru-RU")}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {doc.fileUrl && (
                        <button className="btn btn-ghost btn-sm" onClick={() => openFileUrl(doc.fileUrl!, token)}>⬇</button>
                      )}
                      {!isAdmin && (
                        <>
                          <button className="btn btn-ghost btn-sm" title={t.sor_rename}
                            onClick={() => { setRenaming(doc); setRenameTitle(doc.title); }}>
                            ✏️
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}
                            onClick={() => handleDelete(doc.id)}>
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {renaming && (
        <div className="modal-overlay" onClick={() => setRenaming(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{t.sor_rename}</h3>
            <input
              className="input"
              value={renameTitle}
              onChange={e => setRenameTitle(e.target.value)}
              style={{ marginBottom: 16 }}
              autoFocus
            />
            <div className="form-row">
              <button className="btn btn-primary btn-sm" onClick={handleRename} disabled={busy || !renameTitle.trim()}>
                {busy ? <span className="spinner" /> : t.save}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRenaming(null)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
