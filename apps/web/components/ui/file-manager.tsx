"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { api, API_URL } from "../../lib/api";

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  section?: string;
  teacherRefId?: string;
  createdAt?: string;
}

interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  folderId?: string;
  createdAt: string;
  uploadedBy?: { id: string; fullName: string };
}

interface Crumb {
  id: string | null;
  name: string;
}

export interface FileManagerProps {
  token: string;
  section: string;
  teacherRefId?: string;
  canEdit: boolean;
  canUpload: boolean;
  /** Called before each upload; returned key-value pairs are appended to FormData */
  getExtraUploadData?: () => Record<string, string>;
  labels?: {
    home?: string;
    newFolder?: string;
    upload?: string;
    uploading?: string;
    search?: string;
    folderName?: string;
    create?: string;
    cancel?: string;
    noFiles?: string;
    download?: string;
    delete?: string;
    loading?: string;
    confirmDeleteFolder?: string;
    confirmDeleteFile?: string;
    sort?: string;
    sortDate?: string;
    sortName?: string;
    sortAuthor?: string;
    pin?: string;
    unpin?: string;
  };
}

function getFileIcon(mimetype: string): string {
  if (mimetype.includes("pdf")) return "📄";
  if (mimetype.includes("word") || mimetype.includes("msword")) return "📝";
  if (mimetype.includes("excel") || mimetype.includes("spreadsheet") || mimetype.includes("csv")) return "📊";
  if (mimetype.startsWith("image/")) return "🖼️";
  if (mimetype.includes("presentation") || mimetype.includes("powerpoint")) return "📑";
  return "📎";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DEFAULT_LABELS = {
  home: "Главная",
  newFolder: "+ Папка",
  upload: "Загрузить",
  uploading: "Загрузка...",
  search: "Поиск...",
  folderName: "Название папки",
  create: "Создать",
  cancel: "Отмена",
  noFiles: "Файлов нет",
  download: "Скачать",
  delete: "Удалить",
  loading: "Загрузка...",
  confirmDeleteFolder: "Удалить папку?",
  confirmDeleteFile: "Удалить файл?",
  sort: "Сортировка",
  sortDate: "По дате",
  sortName: "По названию",
  sortAuthor: "По автору",
  pin: "Закрепить",
  unpin: "Открепить",
};

type SortBy = "date" | "name" | "author";

function loadPinned(section: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(`aqyl-pins-${section}`) ?? "[]")); }
  catch { return new Set(); }
}

function savePinned(section: string, ids: Set<string>) {
  localStorage.setItem(`aqyl-pins-${section}`, JSON.stringify([...ids]));
}

export function FileManager({ token, section, teacherRefId, canEdit, canUpload, getExtraUploadData, labels: labelOverrides }: FileManagerProps) {
  const L = { ...DEFAULT_LABELS, ...labelOverrides };
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: L.home }]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => loadPinned(section));
  const [renaming, setRenaming] = useState<{ type: "file" | "folder"; id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentId = crumbs[crumbs.length - 1]?.id;

  // Reload pinned when section changes
  useEffect(() => { setPinnedIds(loadPinned(section)); }, [section]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (currentId === null) {
        const [foldersData, filesData] = await Promise.all([
          api.listFolders(token, { section, teacherRefId }),
          api.listFilesInFolder(token, null, section),
        ]);
        setFolders(foldersData.filter(f => !teacherRefId || f.teacherRefId === teacherRefId));
        setFiles(filesData.filter(f => !f.folderId));
      } else {
        const data = await api.getFolderContents(token, currentId);
        setFolders(data.subfolders);
        setFiles(data.files);
      }
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }, [token, section, teacherRefId, currentId]);

  useEffect(() => { load(); }, [load]);

  function togglePin(id: string) {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      savePinned(section, next);
      return next;
    });
  }

  const openFolder = (folder: Folder) => {
    setCrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navTo = (idx: number) => {
    setCrumbs(prev => prev.slice(0, idx + 1));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.createFolder(token, {
        name: newFolderName.trim(),
        parentId: currentId ?? undefined,
        section,
        teacherRefId,
      });
      setNewFolderName("");
      setShowFolderInput(false);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm(L.confirmDeleteFolder)) return;
    try {
      await api.deleteFolder(token, id);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const extraData = getExtraUploadData?.();
      await api.uploadFileToFolder(token, file, currentId ?? undefined, section, extraData);
      load();
    } catch (e) {
      setError(String(e));
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDownload = async (item: FileItem) => {
    try {
      const res = await fetch(`${API_URL}/files/${item.filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!confirm(L.confirmDeleteFile)) return;
    try {
      await api.deleteFile(token, id);
      if (pinnedIds.has(id)) {
        const next = new Set(pinnedIds);
        next.delete(id);
        setPinnedIds(next);
        savePinned(section, next);
      }
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const startRename = (type: "file" | "folder", id: string, currentName: string) => {
    setRenaming({ type, id, name: currentName });
    setRenameValue(currentName);
  };

  const handleRename = async () => {
    if (!renaming || !renameValue.trim()) return;
    try {
      if (renaming.type === "file") {
        await api.renameFile(token, renaming.id, renameValue.trim());
        setFiles(prev => prev.map(f => f.id === renaming.id ? { ...f, originalName: renameValue.trim() } : f));
      } else {
        await api.renameFolder(token, renaming.id, renameValue.trim());
        setFolders(prev => prev.map(f => f.id === renaming.id ? { ...f, name: renameValue.trim() } : f));
      }
      setRenaming(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const q = search.toLowerCase();
  const visibleFolders = folders.filter(f => f.name.toLowerCase().includes(q));
  const visibleFiles = files
    .filter(f => f.originalName.toLowerCase().includes(q))
    .sort((a, b) => {
      const ap = pinnedIds.has(a.id), bp = pinnedIds.has(b.id);
      if (ap !== bp) return ap ? -1 : 1;
      switch (sortBy) {
        case "name": return a.originalName.localeCompare(b.originalName);
        case "author": return (a.uploadedBy?.fullName ?? "").localeCompare(b.uploadedBy?.fullName ?? "");
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const isEmpty = visibleFolders.length === 0 && visibleFiles.length === 0;

  return (
    <div className="fm">
      {/* Breadcrumbs */}
      <nav className="fm-breadcrumbs">
        {crumbs.map((crumb, idx) => (
          <span key={idx} className="fm-crumb-wrap">
            {idx > 0 && <span className="fm-crumb-sep">›</span>}
            {idx < crumbs.length - 1 ? (
              <button className="fm-crumb-btn" onClick={() => navTo(idx)}>{crumb.name}</button>
            ) : (
              <span className="fm-crumb-current">{crumb.name}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Toolbar */}
      <div className="fm-toolbar">
        <input
          className="input fm-search-input"
          type="text"
          placeholder={L.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="fm-toolbar-actions">
          <select
            className="input"
            style={{ width: "auto", fontSize: 13, padding: "4px 8px" }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            title={L.sort}
          >
            <option value="date">{L.sortDate}</option>
            <option value="name">{L.sortName}</option>
            <option value="author">{L.sortAuthor}</option>
          </select>
          {canEdit && (
            <button className="btn btn-outline btn-sm" onClick={() => setShowFolderInput(v => !v)}>
              {L.newFolder}
            </button>
          )}
          {canUpload && (
            <>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? L.uploading : L.upload}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.ppt,.pptx,.txt,.csv"
                onChange={handleUpload}
              />
            </>
          )}
        </div>
      </div>

      {/* New folder row */}
      {showFolderInput && canEdit && (
        <div className="fm-new-folder-row">
          <input
            className="input"
            type="text"
            placeholder={L.folderName}
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") { setShowFolderInput(false); setNewFolderName(""); }
            }}
            autoFocus
          />
          <button className="btn btn-primary btn-sm" onClick={handleCreateFolder}>{L.create}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowFolderInput(false); setNewFolderName(""); }}>
            {L.cancel}
          </button>
        </div>
      )}

      {error && <p className="fm-error">{error}</p>}

      {/* Contents */}
      <div className="fm-contents">
        {loading ? (
          <p className="fm-empty">{L.loading}</p>
        ) : isEmpty ? (
          <p className="fm-empty">{L.noFiles}</p>
        ) : (
          <>
            {visibleFolders.map(folder => (
              <div key={folder.id} className="fm-item fm-item-folder" onClick={() => openFolder(folder)}>
                <span className="fm-item-icon">📁</span>
                <span className="fm-item-name">{folder.name}</span>
                {canEdit && (
                  <div className="fm-item-actions" onClick={e => e.stopPropagation()}>
                    <button
                      className="fm-item-del"
                      onClick={e => { e.stopPropagation(); startRename("folder", folder.id, folder.name); }}
                      title="Переименовать"
                      aria-label="Переименовать"
                    >
                      ✏️
                    </button>
                    <button
                      className="fm-item-del"
                      onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                      title={L.delete}
                      aria-label={L.delete}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}

            {visibleFiles.map(file => {
              const isPinned = pinnedIds.has(file.id);
              return (
                <div key={file.id} className={`fm-item fm-item-file${isPinned ? " fm-item-pinned" : ""}`}>
                  <span className="fm-item-icon">{isPinned ? "📌" : getFileIcon(file.mimetype)}</span>
                  <div className="fm-item-info">
                    <span className="fm-item-name">{file.originalName}</span>
                    <span className="fm-item-meta">
                      {formatSize(file.size)}
                      {file.uploadedBy && ` · ${file.uploadedBy.fullName}`}
                      {" · "}{new Date(file.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="fm-item-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => handleDownload(file)}>
                      ↓ {L.download}
                    </button>
                    {canEdit && (
                      <>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => startRename("file", file.id, file.originalName)}
                          title="Переименовать"
                        >
                          ✏️
                        </button>
                        <button
                          className={`btn btn-sm ${isPinned ? "btn-primary" : "btn-outline"}`}
                          onClick={() => togglePin(file.id)}
                          title={isPinned ? L.unpin : L.pin}
                        >
                          📌
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFile(file.id)}>
                          {L.delete}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      {renaming && (
        <div className="modal-overlay" onClick={() => setRenaming(null)}>
          <div className="modal-card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Переименовать</h3>
            <input
              className="input"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(null); }}
              style={{ marginBottom: 12 }}
              autoFocus
            />
            <div className="form-row">
              <button className="btn btn-primary btn-sm" onClick={handleRename} disabled={!renameValue.trim()}>
                Сохранить
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRenaming(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
