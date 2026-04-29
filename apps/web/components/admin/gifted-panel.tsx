"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";

type MainTab = "olympiad" | "teachers" | "students" | "psychologist" | "workplan";
type OlympiadSubTab = "olympiad" | "contest";

interface StoredTeacher {
  id: string;
  fullName: string;
  subject: string;
}

const STORAGE_KEY = "aqyl-gifted-teachers";

function loadTeachers(): StoredTeacher[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}

function saveTeachers(list: StoredTeacher[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function fmLabels(t: Record<string, string>) {
  return {
    home: t.fm_home, newFolder: t.fm_new_folder, upload: t.fm_upload,
    uploading: t.fm_uploading, search: t.fm_search, folderName: t.fm_folder_name,
    create: t.fm_create, cancel: t.cancel, noFiles: t.fm_no_files,
    download: t.fm_download, delete: t.fm_delete, loading: t.loading,
    sort: t.fm_sort, sortDate: t.fm_sort_date, sortName: t.fm_sort_name,
    sortAuthor: t.fm_sort_author, pin: t.fm_pin, unpin: t.fm_unpin,
  };
}

export function GiftedPanel({ token, language, userRole }: {
  token: string; language: Language; userRole: string;
}) {
  const t = translations[language];
  const [tab, setTab] = useState<MainTab>("olympiad");
  const canEdit = ["admin", "vice_principal", "principal"].includes(userRole);
  const labels = fmLabels(t);

  const TABS: { key: MainTab; label: string }[] = [
    { key: "olympiad", label: t.gifted_tab_olympiad ?? "Олимпиады и конкурсы" },
    { key: "teachers", label: t.gifted_teachers ?? "Учителя" },
    { key: "students", label: t.gifted_students_list ?? "Список учеников" },
    { key: "psychologist", label: t.gifted_psychologist ?? "Анкеты психолога" },
    { key: "workplan", label: t.gifted_work_plan ?? "План работы школы" },
  ];

  return (
    <div className="page">
      <h1 className="page-title">⭐ {t.nav_gifted}</h1>

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
        {tab === "olympiad" && (
          <OlympiadTab token={token} canEdit={canEdit} t={t} labels={labels} />
        )}
        {tab === "teachers" && (
          <GiftedTeachersTable token={token} canEdit={canEdit} userRole={userRole} t={t} labels={labels} />
        )}
        {tab === "students" && (
          <FileManager token={token} section="gifted-students" canEdit={canEdit} canUpload={canEdit} labels={labels} />
        )}
        {tab === "psychologist" && (
          <FileManager token={token} section="gifted-psychologist" canEdit={canEdit} canUpload={canEdit} labels={labels} />
        )}
        {tab === "workplan" && (
          <FileManager token={token} section="gifted-school-workplan" canEdit={canEdit} canUpload={canEdit} labels={labels} />
        )}
      </div>
    </div>
  );
}

// ── Olympiad tab with sub-tabs ────────────────────────────────────────────────
function OlympiadTab({ token, canEdit, t, labels }: {
  token: string; canEdit: boolean; t: Record<string, string>; labels: Record<string, string>;
}) {
  const [sub, setSub] = useState<OlympiadSubTab>("olympiad");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${sub === "olympiad" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setSub("olympiad")}
        >
          {t.gifted_sub_olympiad ?? "Олимпиада"}
        </button>
        <button
          className={`btn btn-sm ${sub === "contest" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setSub("contest")}
        >
          {t.gifted_sub_contest ?? "Конкурс"}
        </button>
      </div>
      {sub === "olympiad" && (
        <FileManager token={token} section="gifted-olympiad" canEdit={canEdit} canUpload={canEdit} labels={labels} />
      )}
      {sub === "contest" && (
        <FileManager token={token} section="gifted-contest" canEdit={canEdit} canUpload={canEdit} labels={labels} />
      )}
    </div>
  );
}

// ── Teachers table ────────────────────────────────────────────────────────────
function GiftedTeachersTable({ token, canEdit, userRole, t, labels }: {
  token: string; canEdit: boolean; userRole: string; t: Record<string, string>; labels: Record<string, string>;
}) {
  const [teachers, setTeachers] = useState<StoredTeacher[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [allTeachers, setAllTeachers] = useState<Array<{ id: string; fullName: string; subject?: string }>>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [activeModal, setActiveModal] = useState<{ teacherId: string; name: string; type: "achievements" | "workplan" } | null>(null);

  useEffect(() => { setTeachers(loadTeachers()); }, []);

  async function openPicker() {
    setShowPicker(true);
    try {
      const all = await api.getAdminTeachers(token);
      setAllTeachers(all);
    } catch { /* ignore */ }
  }

  function addTeacher(t: { id: string; fullName: string; subject?: string }) {
    const current = loadTeachers();
    if (current.find(x => x.id === t.id)) return;
    const updated = [...current, { id: t.id, fullName: t.fullName, subject: t.subject ?? "" }];
    saveTeachers(updated);
    setTeachers(updated);
    closePicker();
  }

  function removeTeacher(id: string) {
    const updated = teachers.filter(x => x.id !== id);
    saveTeachers(updated);
    setTeachers(updated);
  }

  function closePicker() {
    setShowPicker(false);
    setPickerSearch("");
  }

  const addedIds = new Set(teachers.map(x => x.id));
  const pickerList = allTeachers.filter(x =>
    !addedIds.has(x.id) &&
    (x.fullName.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      (x.subject ?? "").toLowerCase().includes(pickerSearch.toLowerCase()))
  );

  return (
    <div>
      {canEdit && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button className="btn btn-primary btn-sm" onClick={openPicker}>
            + {t.gifted_add_teacher ?? "Добавить учителя"}
          </button>
        </div>
      )}

      {/* Picker modal */}
      {showPicker && (
        <div className="modal-overlay" onClick={closePicker}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>{t.gifted_add_teacher ?? "Добавить учителя"}</h3>
            <input
              className="input"
              placeholder="🔍 Поиск..."
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              style={{ marginBottom: 12 }}
              autoFocus
            />
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {pickerList.length === 0
                ? <p className="empty-state">{t.noData}</p>
                : pickerList.map(teacher => (
                  <div key={teacher.id} className="add-student-row" onClick={() => addTeacher(teacher)}>
                    <span>{teacher.fullName}</span>
                    <span className="muted">{teacher.subject ?? "—"}</span>
                  </div>
                ))
              }
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={closePicker}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Teachers table */}
      {teachers.length === 0 ? (
        <div className="empty-state" style={{ padding: "32px 0" }}>
          {t.noData}
          {canEdit && (
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={openPicker}>
                + {t.gifted_add_teacher ?? "Добавить учителя"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>№</th>
                <th>ФИО учителя</th>
                <th>Предмет</th>
                <th style={{ width: 150 }}>{t.gifted_achievements_btn ?? "Достижения"}</th>
                <th style={{ width: 150 }}>{t.gifted_workplan_btn ?? "План работы"}</th>
                {canEdit && <th style={{ width: 50 }}></th>}
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher, idx) => (
                <tr key={teacher.id}>
                  <td className="muted" style={{ textAlign: "center" }}>{idx + 1}</td>
                  <td className="table-name">{teacher.fullName}</td>
                  <td>{teacher.subject || "—"}</td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ width: "100%" }}
                      onClick={() => setActiveModal({ teacherId: teacher.id, name: teacher.fullName, type: "achievements" })}
                    >
                      🏆 {t.gifted_achievements_btn ?? "Достижения"}
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ width: "100%" }}
                      onClick={() => setActiveModal({ teacherId: teacher.id, name: teacher.fullName, type: "workplan" })}
                    >
                      📋 {t.gifted_workplan_btn ?? "План работы"}
                    </button>
                  </td>
                  {canEdit && (
                    <td>
                      <button className="btn btn-ghost btn-sm danger" onClick={() => removeTeacher(teacher.id)}>✕</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FileManager modal for achievements / workplan */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div
            className="modal-card"
            style={{ width: "min(90vw, 820px)", maxHeight: "85vh", overflow: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  {activeModal.type === "achievements"
                    ? `🏆 ${t.gifted_achievements_btn ?? "Достижения"}`
                    : `📋 ${t.gifted_workplan_btn ?? "План работы"}`}
                </h3>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>{activeModal.name}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <FileManager
              token={token}
              section={`gifted-${activeModal.type}-${activeModal.teacherId}`}
              canEdit={canEdit}
              canUpload={canEdit}
              labels={labels}
            />
          </div>
        </div>
      )}
    </div>
  );
}
