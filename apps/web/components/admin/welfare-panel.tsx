"use client";
import { useState } from "react";
import { Language, translations } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";
import { ClassHoursSchedulePanel } from "./class-hours-schedule";

type WelfareTab = "tarbiye" | "law" | "circle" | "class-hours";

interface Props {
  token: string;
  language: Language;
  userRole: string;
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

export function WelfarePanel({ token, language, userRole }: Props) {
  const t = translations[language];
  const canEdit = ["admin", "principal", "vice_principal"].includes(userRole);
  const [tab, setTab] = useState<WelfareTab>("tarbiye");

  const TABS: { key: WelfareTab; label: string }[] = [
    { key: "tarbiye", label: t.tab_tarbiye },
    { key: "law", label: t.tab_law },
    { key: "circle", label: t.tab_circle },
    { key: "class-hours", label: t.tab_class_hours },
  ];

  return (
    <div className="page">
      <h1 className="page-title">🌱 {t.nav_education}</h1>

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
        {tab === "tarbiye" && (
          <FileManager
            token={token}
            section="educational-tarbiye"
            canEdit={canEdit}
            canUpload={canEdit}
            labels={fmLabels(language)}
          />
        )}
        {tab === "law" && (
          <FileManager
            token={token}
            section="educational-law"
            canEdit={canEdit}
            canUpload={canEdit}
            labels={fmLabels(language)}
          />
        )}
        {tab === "circle" && (
          <FileManager
            token={token}
            section="educational-circle"
            canEdit={canEdit}
            canUpload={canEdit}
            labels={fmLabels(language)}
          />
        )}
        {tab === "class-hours" && (
          <ClassHoursSchedulePanel token={token} language={language} isAdmin={true} />
        )}
      </div>
    </div>
  );
}
