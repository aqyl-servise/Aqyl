"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { handleError } from "../../lib/handle-error";

interface Props { token: string; language: Language; userRole: string; }

const DAYS_IDX: Record<number, string> = {
  1: "day_mon", 2: "day_tue", 3: "day_wed", 4: "day_thu", 5: "day_fri",
};
function dayLabel(t: Record<string, string>, d: number): string {
  const key = DAYS_IDX[d];
  return key ? (t[key] ?? key) : "";
}
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

type ScheduleEntry = { id: string; dayOfWeek: number; period: number; subject: string; room?: string; version: string; teacher?: { id: string; fullName: string }; classroom?: { id: string; name: string } };
type Classroom = { id: string; name: string; grade: number };
type Teacher = { id: string; fullName: string };

export function ScheduleAdminPanel({ token, language, userRole }: Props) {
  const t = translations[language];
  const canEdit = ["admin", "principal", "vice_principal", "vice_principal_academic"].includes(userRole);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [versions, setVersions] = useState<string[]>(["main"]);
  const [version, setVersion] = useState("main");
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ day: number; period: number; entry?: ScheduleEntry } | null>(null);
  const [form, setForm] = useState({ subject: "", teacherId: "", room: "" });
  const [error, setError] = useState<string | null>(null);
  const [newVersionName, setNewVersionName] = useState("");
  const [showVersionInput, setShowVersionInput] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getClassroomsForDropdown(token),
      api.getAdminTeachers(token),
      api.getScheduleVersions(token),
    ]).then(([cls, tchs, vers]) => {
      setClassrooms(cls);
      setTeachers(tchs.map(t => ({ id: t.id, fullName: t.fullName })));
      const vList = vers.length ? vers : ["main"];
      setVersions(vList);
    }).catch(err => handleError(err, 'Не удалось загрузить расписание'));
  }, [token]);

  const loadEntries = useCallback(async () => {
    if (!selectedClassroom) return;
    setLoading(true);
    try {
      const rows = await api.getAdminSchedule(token, { classroomId: selectedClassroom, version });
      setEntries(rows);
    } finally { setLoading(false); }
  }, [token, selectedClassroom, version]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  function cellEntry(day: number, period: number) {
    return entries.find(e => e.dayOfWeek === day && e.period === period);
  }

  function openModal(day: number, period: number) {
    if (!canEdit || !selectedClassroom) return;
    const entry = cellEntry(day, period);
    setForm({ subject: entry?.subject ?? "", teacherId: entry?.teacher?.id ?? "", room: entry?.room ?? "" });
    setError(null);
    setModal({ day, period, entry });
  }

  async function handleSave() {
    if (!form.subject.trim()) return;
    setError(null);
    try {
      await api.adminUpsertSchedule(token, {
        classroomId: selectedClassroom,
        subject: form.subject,
        teacherId: form.teacherId || undefined,
        room: form.room || undefined,
        dayOfWeek: modal!.day,
        period: modal!.period,
        version,
      });
      await loadEntries();
      setModal(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      try { const b = JSON.parse(msg) as { message?: string }; setError(b.message ?? t.schedule_conflict_error); }
      catch { setError(t.schedule_conflict_error); }
    }
  }

  async function handleDelete() {
    if (!modal?.entry) return;
    await api.adminDeleteSchedule(token, modal.entry.id);
    await loadEntries();
    setModal(null);
  }

  async function handleAddVersion() {
    if (!newVersionName.trim()) return;
    await api.createScheduleVersion(token, newVersionName.trim());
    setVersions(v => [...v, newVersionName.trim()]);
    setVersion(newVersionName.trim());
    setNewVersionName("");
    setShowVersionInput(false);
  }

  async function handleExport() {
    try {
      const q = new URLSearchParams({ version });
      if (selectedClassroom) q.set("classroomId", selectedClassroom);
      const url = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/schedule/admin/export?${q}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Ошибка экспорта расписания');
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "schedule.csv";
      link.click();
    } catch (err) {
      handleError(err, 'Не удалось экспортировать расписание');
    }
  }

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>{t.nav_schedule_admin}</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>{t.schedule_export_csv}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="input" style={{ minWidth: 150 }} value={selectedClassroom} onChange={e => setSelectedClassroom(e.target.value)}>
          <option value="">{t.selectClass}</option>
          {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select className="input" style={{ minWidth: 120 }} value={version} onChange={e => setVersion(e.target.value)}>
          {versions.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        {canEdit && (
          showVersionInput ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" style={{ width: 140 }} placeholder={t.schedule_new_version} value={newVersionName} onChange={e => setNewVersionName(e.target.value)} />
              <button className="btn btn-sm btn-primary" onClick={handleAddVersion}>+</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowVersionInput(false)}>{t.cancel}</button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowVersionInput(true)}>+ {t.schedule_new_version}</button>
          )
        )}
      </div>

      {!selectedClassroom && (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>
          {t.selectClass}
        </div>
      )}

      {selectedClassroom && (
        <div style={{ overflowX: "auto" }}>
          {loading ? <div className="spinner" style={{ margin: "40px auto" }} /> : (
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={thStyle}>{t.period}</th>
                  {[1,2,3,4,5].map(d => (
                    <th key={d} style={thStyle}>{dayLabel(t, d)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(period => (
                  <tr key={period}>
                    <td style={{ ...tdStyle, fontWeight: 600, background: "var(--bg-alt)" }}>{period}</td>
                    {[1,2,3,4,5].map(day => {
                      const entry = cellEntry(day, period);
                      return (
                        <td key={day} style={{ ...tdStyle, cursor: canEdit ? "pointer" : "default", background: entry ? "var(--primary-alpha, rgba(127,119,221,0.08))" : undefined }}
                          onClick={() => openModal(day, period)}>
                          {entry ? (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{entry.subject}</div>
                              {entry.teacher && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{entry.teacher.fullName}</div>}
                              {entry.room && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{entry.room}</div>}
                            </div>
                          ) : canEdit ? <span style={{ color: "var(--text-muted)", fontSize: 13 }}>+</span> : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3 style={{ margin: "0 0 16px" }}>{dayLabel(t, modal.day)}, {t.period} {modal.period}</h3>

            <div className="field">
              <label className="field-label">{t.schedule_subject_label}</label>
              <input className="input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="field">
              <label className="field-label">{t.schedule_teacher_label}</label>
              <select className="input" value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}>
                <option value="">—</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">{t.schedule_room_label}</label>
              <input className="input" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {modal.entry && <button className="btn btn-sm btn-ghost" style={{ color: "var(--error)" }} onClick={handleDelete}>{t.fm_delete}</button>}
              <button className="btn btn-sm btn-ghost" onClick={() => setModal(null)}>{t.cancel}</button>
              <button className="btn btn-sm btn-primary" onClick={handleSave}>{t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 12px", border: "1px solid var(--border)", background: "var(--bg-alt)",
  fontWeight: 600, fontSize: 13, textAlign: "center",
};
const tdStyle: React.CSSProperties = {
  padding: "8px 10px", border: "1px solid var(--border)", minWidth: 110, verticalAlign: "top", textAlign: "center",
};
