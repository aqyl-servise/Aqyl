"use client";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";

type SiTab = "license" | "med" | "land" | "ses" | "passport" | "general";

interface Props {
  token: string;
  language: Language;
  userRole: string;
}

interface SchoolInfoData {
  name?: string;
  address?: string;
  builtYear?: string;
  capacity?: string;
  contingent?: string;
  completeness?: string;
}

function fmLabels(language: Language) {
  const t = translations[language];
  return {
    home: t.fm_home, newFolder: t.fm_new_folder, upload: t.fm_upload,
    uploading: t.fm_uploading, search: t.fm_search, folderName: t.fm_folder_name,
    create: t.fm_create, cancel: t.cancel, noFiles: t.fm_no_files,
    download: t.fm_download, delete: t.fm_delete, loading: t.loading,
  };
}

export function SchoolInfoPanel({ token, language, userRole }: Props) {
  const t = translations[language];
  const canEdit = ["admin", "principal"].includes(userRole);
  const canView = ["admin", "principal", "vice_principal"].includes(userRole);

  const [tab, setTab] = useState<SiTab>("general");
  const [info, setInfo] = useState<SchoolInfoData>({});
  const [draft, setDraft] = useState<SchoolInfoData>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);

  useEffect(() => {
    if (tab !== "general" || !canView) return;
    setLoadingInfo(true);
    api.getSchoolInfo(token)
      .then(data => { setInfo(data); setDraft(data); })
      .catch(() => {})
      .finally(() => setLoadingInfo(false));
  }, [tab, token, canView]);

  function startEdit() {
    setDraft({ ...info });
    setEditing(true);
    setSaved(false);
  }

  function cancelEdit() {
    setDraft({ ...info });
    setEditing(false);
  }

  async function saveInfo() {
    setSaving(true);
    try {
      await api.updateSchoolInfo(token, draft as Record<string, string>);
      setInfo({ ...draft });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // no-op
    } finally {
      setSaving(false);
    }
  }

  const TABS: { key: SiTab; label: string }[] = [
    { key: "general", label: t.si_tab_general },
    { key: "license", label: t.si_tab_license },
    { key: "med", label: t.si_tab_med },
    { key: "land", label: t.si_tab_land },
    { key: "ses", label: t.si_tab_ses },
    { key: "passport", label: t.si_tab_passport },
  ];

  const INFO_FIELDS: { key: keyof SchoolInfoData; label: string }[] = [
    { key: "name", label: t.si_school_name },
    { key: "address", label: t.si_address },
    { key: "builtYear", label: t.si_built_year },
    { key: "capacity", label: t.si_capacity },
    { key: "contingent", label: t.si_contingent },
    { key: "completeness", label: t.si_completeness },
  ];

  return (
    <div className="page">
      <h1 className="page-title">🏫 {t.nav_school_info}</h1>

      <div className="sc-tabs">
        {TABS.map(tb => (
          <button
            key={tb.key}
            className={`sc-tab${tab === tb.key ? " sc-tab-active" : ""}`}
            onClick={() => setTab(tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 0 }}>

        {/* ── Tab: Жалпы ақпарат ──────────────────────────── */}
        {tab === "general" && (
          <div>
            {loadingInfo ? (
              <p className="fm-empty">{t.loading}</p>
            ) : (
              <>
                <table className="data-table" style={{ marginBottom: 20 }}>
                  <tbody>
                    {INFO_FIELDS.map(f => (
                      <tr key={f.key}>
                        <td style={{ fontWeight: 500, width: "40%", color: "var(--muted)" }}>{f.label}</td>
                        <td>
                          {editing ? (
                            <input
                              className="input"
                              style={{ width: "100%" }}
                              value={draft[f.key] ?? ""}
                              onChange={e => setDraft(prev => ({ ...prev, [f.key]: e.target.value }))}
                            />
                          ) : (
                            info[f.key] || <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {canEdit && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {!editing ? (
                      <button className="btn btn-primary btn-sm" onClick={startEdit}>
                        ✏️ {t.si_edit}
                      </button>
                    ) : (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={saveInfo} disabled={saving}>
                          {saving ? "..." : t.si_save}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={cancelEdit} disabled={saving}>
                          {t.si_cancel}
                        </button>
                      </>
                    )}
                    {saved && <span style={{ color: "var(--success)", fontSize: 13 }}>✓ {t.si_saved}</span>}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── FileManager tabs ────────────────────────────── */}
        {tab === "license" && (
          <FileManager token={token} section="school-license" canEdit={canEdit} canUpload={canEdit} labels={fmLabels(language)} />
        )}
        {tab === "med" && (
          <FileManager token={token} section="school-med-license" canEdit={canEdit} canUpload={canEdit} labels={fmLabels(language)} />
        )}
        {tab === "land" && (
          <FileManager token={token} section="school-land" canEdit={canEdit} canUpload={canEdit} labels={fmLabels(language)} />
        )}
        {tab === "ses" && (
          <FileManager token={token} section="school-ses" canEdit={canEdit} canUpload={canEdit} labels={fmLabels(language)} />
        )}
        {tab === "passport" && (
          <FileManager token={token} section="school-passport" canEdit={canEdit} canUpload={canEdit} labels={fmLabels(language)} />
        )}
      </div>
    </div>
  );
}
