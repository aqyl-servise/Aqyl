"use client";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";

const PED_COUNCIL_FOLDERS = [
  "Педкеңес №1 (2025-2026)",
  "Педкеңес №2 (2025-2026)",
  "Педкеңес №3 (2025-2026)",
  "Педкеңес №4 (2025-2026)",
  "Педкеңес №5 (2025-2026)",
  "Жоспардан тыс педкеңес №1",
  "Жоспардан тыс педкеңес №2",
];

type Tab = "ped-council" | "director-council" | "methodical" | "young-specialist";

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  subject?: string;
  experience?: number;
}

interface Props {
  token: string;
  language: Language;
  userRole: string;
}

function fmLabels(language: Language) {
  const t = translations[language];
  return {
    home: t.fm_home,
    newFolder: t.fm_new_folder,
    upload: t.fm_upload,
    uploading: t.fm_uploading,
    search: t.fm_search,
    folderName: t.fm_folder_name,
    create: t.fm_create,
    cancel: t.cancel,
    noFiles: t.fm_no_files,
    download: t.fm_download,
    delete: t.fm_delete,
    loading: t.loading,
  };
}

export function SchoolControlPanel({ token, language, userRole }: Props) {
  const t = translations[language];
  const [tab, setTab] = useState<Tab>("ped-council");
  const [pedReady, setPedReady] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const canEdit = ["admin", "principal", "vice_principal"].includes(userRole);
  const canUpload = canEdit;
  const labels = fmLabels(language);

  // Auto-create predefined ped council folders on first load
  useEffect(() => {
    if (tab !== "ped-council" || pedReady) return;
    (async () => {
      try {
        const existing = await api.listFolders(token, { section: "ped-council" });
        const existingNames = new Set(existing.map(f => f.name));
        const missing = PED_COUNCIL_FOLDERS.filter(name => !existingNames.has(name));
        if (missing.length > 0) {
          await Promise.all(missing.map(name => api.createFolder(token, { name, section: "ped-council" })));
        }
      } catch {}
      setPedReady(true);
    })();
  }, [tab, pedReady, token]);

  useEffect(() => {
    if (tab !== "young-specialist") return;
    setLoadingTeachers(true);
    api.getAdminTeachers(token)
      .then(data => {
        setTeachers(data.filter(t => typeof t.experience === "number" && t.experience < 3));
      })
      .catch(() => {})
      .finally(() => setLoadingTeachers(false));
  }, [tab, token]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "ped-council", label: t.sc_tab_ped },
    { key: "director-council", label: t.sc_tab_director },
    { key: "methodical", label: t.sc_tab_methodical },
    { key: "young-specialist", label: t.sc_tab_young },
  ];

  return (
    <div className="page">
      <h1 className="page-title">📋 {t.nav_protocols}</h1>

      {/* Tab bar */}
      <div className="sc-tabs">
        {TABS.map(tb => (
          <button
            key={tb.key}
            className={`sc-tab${tab === tb.key ? " sc-tab-active" : ""}`}
            onClick={() => {
              setTab(tb.key);
              setSelectedTeacher(null);
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 0 }}>
        {/* Tab 1 — Ped Council */}
        {tab === "ped-council" && (
          pedReady ? (
            <FileManager
              token={token}
              section="ped-council"
              canEdit={canEdit}
              canUpload={canUpload}
              labels={labels}
            />
          ) : (
            <p className="fm-empty">{t.loading}</p>
          )
        )}

        {/* Tab 2 — Director's Council */}
        {tab === "director-council" && (
          <FileManager
            token={token}
            section="director-council"
            canEdit={canEdit}
            canUpload={canUpload}
            labels={labels}
          />
        )}

        {/* Tab 3 — Methodical Council */}
        {tab === "methodical" && (
          <FileManager
            token={token}
            section="methodical"
            canEdit={canEdit}
            canUpload={canUpload}
            labels={labels}
          />
        )}

        {/* Tab 4 — Young Specialists */}
        {tab === "young-specialist" && (
          selectedTeacher ? (
            <div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginBottom: 16 }}
                onClick={() => setSelectedTeacher(null)}
              >
                ← {t.sc_tab_young}
              </button>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                📁 {selectedTeacher.fullName}
              </h2>
              <FileManager
                token={token}
                section="young-specialist"
                teacherRefId={selectedTeacher.id}
                canEdit={canEdit}
                canUpload={canUpload}
                labels={labels}
              />
            </div>
          ) : (
            <div>
              <h2 className="card-title" style={{ marginBottom: 16 }}>{t.sc_young_title}</h2>
              {loadingTeachers ? (
                <p className="fm-empty">{t.loading}</p>
              ) : teachers.length === 0 ? (
                <p className="fm-empty">{t.noData}</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t.name}</th>
                      <th>{t.subject ?? "Пән"}</th>
                      <th>{t.sc_experience}</th>
                      <th>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map(teacher => (
                      <tr key={teacher.id}>
                        <td>{teacher.fullName}</td>
                        <td>{teacher.subject ?? "—"}</td>
                        <td>{teacher.experience}</td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setSelectedTeacher(teacher)}
                          >
                            📁 {t.sc_documents_btn}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
