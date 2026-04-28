"use client";
import { Language, translations } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";

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

export function HouseholdPanel({ token, language, userRole }: Props) {
  const t = translations[language];
  const canEdit = ["admin", "principal", "vice_principal"].includes(userRole);

  return (
    <div className="page">
      <h1 className="page-title">🔧 {t.nav_household}</h1>
      <div className="card" style={{ marginTop: 0 }}>
        <FileManager
          token={token}
          section="household"
          canEdit={canEdit}
          canUpload={canEdit}
          labels={fmLabels(language)}
        />
      </div>
    </div>
  );
}
