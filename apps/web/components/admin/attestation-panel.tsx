"use client";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";

type AttestRow = Awaited<ReturnType<typeof api.getAttestations>>[number];
type AttestCategory = "none" | "second" | "first" | "highest";

interface Props {
  token: string;
  language: Language;
  userRole: string;
}

function fmLabels(t: Record<string, string>) {
  return {
    home: t.fm_home, newFolder: t.fm_new_folder, upload: t.fm_upload,
    uploading: t.fm_uploading, search: t.fm_search, folderName: t.fm_folder_name,
    create: t.fm_create, cancel: t.cancel, noFiles: t.fm_no_files,
    download: t.fm_download, delete: t.fm_delete, loading: t.loading,
  };
}

const CATEGORIES: AttestCategory[] = ["none", "second", "first", "highest"];

export function AttestationPanel({ token, language, userRole }: Props) {
  const t = translations[language];
  const labels = fmLabels(t);

  const [rows, setRows] = useState<AttestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AttestRow | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "diploma" | "ozp" | "courses" | "protocols">("info");

  // Form state
  const [category, setCategory] = useState<AttestCategory>("none");
  const [categoryDate, setCategoryDate] = useState("");
  const [nextAttestationDate, setNextAttestationDate] = useState("");
  const [ozpResult, setOzpResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canEdit = ["admin", "principal", "vice_principal"].includes(userRole);

  useEffect(() => {
    api.getAttestations(token)
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  function openTeacher(row: AttestRow) {
    setSelected(row);
    setActiveTab("info");
    const a = row.attestation;
    setCategory((a?.category as AttestCategory) ?? "none");
    setCategoryDate(a?.categoryDate ?? "");
    setNextAttestationDate(a?.nextAttestationDate ?? "");
    setOzpResult(a?.ozpResult ?? "");
    setSaved(false);
  }

  async function handleSave() {
    if (!selected || !canEdit) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.updateAttestation(token, selected.teacher.id, {
        category: category === "none" ? null : category,
        categoryDate: categoryDate || null,
        nextAttestationDate: nextAttestationDate || null,
        ozpResult: ozpResult || null,
      });
      // Refresh list
      const updated = await api.getAttestations(token);
      setRows(updated);
      const fresh = updated.find((r) => r.teacher.id === selected.teacher.id);
      if (fresh) setSelected(fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function categoryLabel(cat?: string | null) {
    switch (cat) {
      case "second": return t.attest_category_second;
      case "first": return t.attest_category_first;
      case "highest": return t.attest_category_highest;
      default: return t.attest_category_none;
    }
  }

  function categoryBadgeClass(cat?: string | null) {
    switch (cat) {
      case "highest": return "score-high";
      case "first": return "score-mid";
      case "second": return "score-low";
      default: return "";
    }
  }

  const filtered = rows.filter((r) =>
    r.teacher.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (r.teacher.subject ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { key: "info" as const, label: t.attest_info },
    { key: "diploma" as const, label: t.attest_diploma },
    { key: "ozp" as const, label: t.attest_ozp_doc },
    { key: "courses" as const, label: t.attest_courses },
    { key: "protocols" as const, label: t.attest_protocols_doc },
  ];

  if (selected) {
    const tid = selected.teacher.id;
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
            ← {t.attest_back}
          </button>
          <h1 className="page-title">🏆 {selected.teacher.fullName}</h1>
        </div>

        <div className="sc-tabs">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              className={`sc-tab${activeTab === tb.key ? " sc-tab-active" : ""}`}
              onClick={() => setActiveTab(tb.key)}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <div className="card" style={{ marginTop: 0 }}>

          {activeTab === "info" && (
            <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="form-label">{t.attest_category}</label>
                <select
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AttestCategory)}
                  disabled={!canEdit}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">{t.attest_category_date}</label>
                <input
                  type="date" className="input" value={categoryDate}
                  onChange={(e) => setCategoryDate(e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              <div>
                <label className="form-label">{t.attest_next_date}</label>
                <input
                  type="date" className="input" value={nextAttestationDate}
                  onChange={(e) => setNextAttestationDate(e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              <div>
                <label className="form-label">{t.attest_ozp_result}</label>
                <input
                  type="text" className="input" value={ozpResult}
                  placeholder="напр. 78%"
                  onChange={(e) => setOzpResult(e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              {canEdit && (
                <button
                  className="btn btn-primary"
                  style={{ alignSelf: "flex-start" }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? t.loading : saved ? `✓ ${t.attest_saved}` : t.attest_save}
                </button>
              )}
            </div>
          )}

          {activeTab === "diploma" && (
            <FileManager
              token={token} section={`attest-diploma-${tid}`}
              canEdit={canEdit} canUpload={canEdit} labels={labels}
            />
          )}

          {activeTab === "ozp" && (
            <FileManager
              token={token} section={`attest-ozp-${tid}`}
              canEdit={canEdit} canUpload={canEdit} labels={labels}
            />
          )}

          {activeTab === "courses" && (
            <FileManager
              token={token} section={`attest-courses-${tid}`}
              canEdit={canEdit} canUpload={canEdit} labels={labels}
            />
          )}

          {activeTab === "protocols" && (
            <FileManager
              token={token} section={`attest-protocols-${tid}`}
              canEdit={canEdit} canUpload={canEdit} labels={labels}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🏆 {t.nav_attestation}</h1>
        <input
          className="input" style={{ maxWidth: 260 }}
          placeholder={`🔍 ${t.search}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {loading ? (
          <p className="empty-state">{t.loading}</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">{t.noData}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.name}</th>
                <th>{t.subject}</th>
                <th>{t.experience}</th>
                <th>{t.attest_category}</th>
                <th>{t.attest_next_date}</th>
                <th>{t.attest_ozp_result}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.teacher.id}>
                  <td className="table-name">
                    <div>{row.teacher.fullName}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{row.teacher.email}</div>
                  </td>
                  <td>{row.teacher.subject ?? "—"}</td>
                  <td>{row.teacher.experience != null ? `${row.teacher.experience} л.` : "—"}</td>
                  <td>
                    {row.attestation?.category ? (
                      <span className={`score-chip ${categoryBadgeClass(row.attestation.category)}`}>
                        {categoryLabel(row.attestation.category)}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{row.attestation?.nextAttestationDate ?? "—"}</td>
                  <td>{row.attestation?.ozpResult ?? "—"}</td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => openTeacher(row)}
                    >
                      {canEdit ? "✏️ Открыть" : "👁 Просмотр"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
