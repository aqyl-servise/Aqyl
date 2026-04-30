"use client";
import { FormEvent, useEffect, useState } from "react";
import { api, ClassroomItem } from "../../lib/api";
import { Language, translations } from "../../lib/translations";

type TeacherOption = { id: string; fullName: string };
type SubjectAssignment = { id: string; teacherId: string; subject: string; teacher: { id: string; fullName: string } };
type AllTeacher = { id: string; fullName: string; subject?: string };

export function ClassroomsPanel({ token, language, t, userRole }: {
  token: string; language: Language; t: Record<string, string>; userRole: string;
}) {
  const tFull = translations[language];
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [allTeachers, setAllTeachers] = useState<AllTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ClassroomItem | null>(null);
  const [bulkFrom, setBulkFrom] = useState<ClassroomItem | null>(null);
  const [bulkToId, setBulkToId] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [subjectClassroom, setSubjectClassroom] = useState<ClassroomItem | null>(null);

  const canDelete = userRole === "admin" || userRole === "principal";

  async function reload() {
    const [cls, tch, allTch] = await Promise.all([
      api.getClassrooms(token),
      api.getClassroomClassTeachers(token),
      api.getAdminTeachers(token).catch(() => [] as AllTeacher[]),
    ]);
    setClassrooms(cls);
    setTeachers(tch);
    setAllTeachers(allTch);
  }

  useEffect(() => {
    reload().catch(console.error).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return;
    setBusy(true);
    try {
      await api.createClassroom(token, {
        name,
        academicYear: String(fd.get("academicYear") ?? "").trim() || undefined,
        classTeacherId: String(fd.get("classTeacherId") ?? "") || undefined,
      });
      await reload();
      setAdding(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Ошибка");
    } finally { setBusy(false); }
  }

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    setBusy(true);
    try {
      await api.updateClassroom(token, editing.id, {
        name: name || undefined,
        academicYear: String(fd.get("academicYear") ?? "").trim() || undefined,
        classTeacherId: String(fd.get("classTeacherId") ?? "") || undefined,
      });
      await reload();
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Ошибка");
    } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.confirmDeleteClass)) return;
    await api.deleteClassroom(token, id);
    setClassrooms((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleBulkTransfer() {
    if (!bulkFrom || !bulkToId) return;
    if (!confirm(t.confirmBulkTransfer)) return;
    setBusy(true);
    try {
      const res = await api.bulkTransferStudents(token, bulkFrom.id, bulkToId);
      alert(`${t.transferred}: ${res.transferred}`);
      setBulkFrom(null);
      setBulkToId("");
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка");
    } finally { setBusy(false); }
  }

  if (loading) return <div className="page"><p className="empty-state">{t.loading}</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🏫 {t.nav_classrooms}</h1>
        <button className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setFormError(null); }}>
          + {t.createClassroom}
        </button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">{t.createClassroom}</h3>
          <ClassroomForm
            teachers={teachers} t={t}
            onSubmit={handleCreate} onCancel={() => setAdding(false)}
            busy={busy} error={formError}
          />
        </div>
      )}

      {classrooms.length === 0 ? (
        <p className="empty-state">{t.noClassrooms}</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.classroomName}</th>
                <th>{t.academicYear}</th>
                <th>{t.classTeacher}</th>
                <th style={{ textAlign: "center" }}>{t.studentCount}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {classrooms.map((c) => (
                <tr key={c.id}>
                  <td className="table-name">{c.name}</td>
                  <td className="muted">{c.academicYear ?? "—"}</td>
                  <td>{c.classTeacher?.fullName ?? "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className="role-chip role-teacher">{c.studentCount}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" title={t.editClassroom}
                        onClick={() => { setEditing(c); setFormError(null); }}>
                        ✏️
                      </button>
                      <button className="btn btn-ghost btn-sm" title={tFull.cr_subject_teachers ?? "Учителя-предметники"}
                        onClick={() => setSubjectClassroom(c)}>
                        👩‍🏫
                      </button>
                      {c.studentCount > 0 && (
                        <button className="btn btn-ghost btn-sm" title={t.bulkTransfer}
                          onClick={() => { setBulkFrom(c); setBulkToId(""); }}>
                          🔄
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}
                          title="Удалить" onClick={() => handleDelete(c.id)}>
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{t.editClassroom}</h3>
            <ClassroomForm
              teachers={teachers} t={t}
              onSubmit={handleUpdate} onCancel={() => setEditing(null)}
              busy={busy} error={formError}
              defaults={{
                name: editing.name,
                academicYear: editing.academicYear ?? "",
                classTeacherId: editing.classTeacher?.id ?? "",
              }}
            />
          </div>
        </div>
      )}

      {subjectClassroom && (
        <SubjectTeachersModal
          token={token}
          classroom={subjectClassroom}
          allTeachers={allTeachers}
          t={tFull}
          onClose={() => setSubjectClassroom(null)}
        />
      )}

      {bulkFrom && (
        <div className="modal-overlay" onClick={() => setBulkFrom(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{t.bulkTransfer}</h3>
            <p className="muted" style={{ marginBottom: 12 }}>
              {t.fromClass}: <strong>{bulkFrom.name}</strong> ({bulkFrom.studentCount} {t.studentCount})
            </p>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field-label">{t.toClass}</label>
              <select className="input" value={bulkToId} onChange={(e) => setBulkToId(e.target.value)}>
                <option value="">{t.selectTargetClass}</option>
                {classrooms.filter((c) => c.id !== bulkFrom.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <button className="btn btn-primary" disabled={!bulkToId || busy} onClick={handleBulkTransfer}>
                {busy ? <span className="spinner" /> : t.bulkTransferAll}
              </button>
              <button className="btn btn-ghost" onClick={() => setBulkFrom(null)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassroomForm({ teachers, t, onSubmit, onCancel, busy, error, defaults }: {
  teachers: TeacherOption[];
  t: Record<string, string>;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
  defaults?: { name: string; academicYear: string; classTeacherId: string };
}) {
  return (
    <form onSubmit={onSubmit} className="form-stack">
      <div className="form-row">
        <div className="field">
          <label className="field-label">{t.classroomName}</label>
          <input name="name" className="input" defaultValue={defaults?.name} required
            placeholder="10А" />
        </div>
        <div className="field">
          <label className="field-label">{t.academicYear}</label>
          <input name="academicYear" className="input" defaultValue={defaults?.academicYear}
            placeholder="2024-2025" />
        </div>
      </div>
      <div className="field">
        <label className="field-label">{t.classTeacher}</label>
        <select name="classTeacherId" className="input" defaultValue={defaults?.classTeacherId ?? ""}>
          <option value="">— {t.classTeacher} —</option>
          {teachers.map((tc) => (
            <option key={tc.id} value={tc.id}>{tc.fullName}</option>
          ))}
        </select>
      </div>
      {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
      <div className="form-row">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : t.save}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t.cancel}</button>
      </div>
    </form>
  );
}

function SubjectTeachersModal({ token, classroom, allTeachers, t, onClose }: {
  token: string;
  classroom: ClassroomItem;
  allTeachers: AllTeacher[];
  t: Record<string, string>;
  onClose: () => void;
}) {
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState("");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getClassroomSubjectTeachers(token, classroom.id)
      .then(setAssignments)
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, [token, classroom.id]);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!teacherId || !subject.trim()) return;
    setSaving(true); setError(null);
    try {
      const created = await api.addClassroomSubjectTeacher(token, classroom.id, { teacherId, subject: subject.trim() });
      const teacher = allTeachers.find(tc => tc.id === teacherId);
      if (teacher) {
        setAssignments(prev => [...prev, { id: (created as { id: string }).id, teacherId, subject: subject.trim(), teacher: { id: teacherId, fullName: teacher.fullName } }]);
      }
      setTeacherId(""); setSubject("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally { setSaving(false); }
  }

  async function handleRemove(assignmentId: string) {
    try {
      await api.removeClassroomSubjectTeacher(token, classroom.id, assignmentId);
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch { /* ignore */ }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 4 }}>{t.cr_subject_teachers ?? "Учителя-предметники"}</h3>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>{classroom.name}</p>

        {loading ? (
          <p className="fm-empty">{t.loading}</p>
        ) : assignments.length === 0 ? (
          <p className="fm-empty" style={{ marginBottom: 16 }}>{t.noData}</p>
        ) : (
          <table className="data-table" style={{ marginBottom: 20 }}>
            <thead><tr><th>{t.name}</th><th>{t.cr_assign_subject ?? "Предмет"}</th><th></th></tr></thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a.id}>
                  <td>{a.teacher.fullName}</td>
                  <td>{a.subject}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => handleRemove(a.id)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form onSubmit={handleAdd} className="form-stack">
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t.cr_add_subject_teacher ?? "Назначить учителя"}</p>
          <div className="form-row">
            <div className="field" style={{ flex: 1 }}>
              <select className="input" value={teacherId} onChange={e => setTeacherId(e.target.value)} required>
                <option value="">— {t.nav_teachers} —</option>
                {allTeachers.map(tc => <option key={tc.id} value={tc.id}>{tc.fullName}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <input className="input" placeholder={t.cr_assign_subject ?? "Предмет"} value={subject} onChange={e => setSubject(e.target.value)} required />
            </div>
          </div>
          {error && <div className="alert alert-error">⚠ {error}</div>}
          <div className="form-row">
            <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>{saving ? <span className="spinner" /> : t.add}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t.close}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
