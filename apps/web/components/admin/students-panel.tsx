"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type StudentRow = {
  id: string;
  fullName: string;
  iin?: string;
  dateOfBirth?: string;
  parentName?: string;
  parentContact?: string;
  userId?: string;
  classroom: { id: string; name: string; grade: number };
  classTeacher?: { id: string; fullName: string };
};

type UserOption = { id: string; fullName: string; email: string; role: string };

type ClassroomOption = { id: string; name: string; grade: number; classTeacher?: { id: string; fullName: string } };
type TeacherOption = { id: string; fullName: string };

export function StudentsPanel({ token, language, t, userRole }: {
  token: string; language: Language; t: Record<string, string>; userRole?: string;
}) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [classTeachers, setClassTeachers] = useState<TeacherOption[]>([]);
  const [search, setSearch] = useState("");
  const [filterClassroom, setFilterClassroom] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [transferring, setTransferring] = useState<StudentRow | null>(null);
  const [transferClassroomId, setTransferClassroomId] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [linking, setLinking] = useState<StudentRow | null>(null);
  const [linkUserId, setLinkUserId] = useState("");
  const [studentUsers, setStudentUsers] = useState<UserOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canDelete = userRole === "admin" || userRole === "principal";

  useEffect(() => {
    Promise.all([
      api.getStudents(token),
      api.getClassroomsForDropdown(token),
      api.getClassTeachersForDropdown(token),
      api.getUsers(token),
    ]).then(([s, c, ct, users]) => {
      setStudents(s as StudentRow[]);
      setClassrooms(c);
      setClassTeachers(ct);
      setStudentUsers((users as UserOption[]).filter((u) => u.role === "student"));
    }).catch(console.error);
  }, [token]);

  const filtered = students.filter((s) => {
    const matchSearch = s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (s.iin ?? "").includes(search);
    const matchClass = !filterClassroom || s.classroom.id === filterClassroom;
    return matchSearch && matchClass;
  });

  function validateIin(iin: string) {
    return /^\d{12}$/.test(iin);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const lastName = String(fd.get("lastName") ?? "").trim();
    const firstName = String(fd.get("firstName") ?? "").trim();
    const middleName = String(fd.get("middleName") ?? "").trim();
    const fullName = [lastName, firstName, middleName].filter(Boolean).join(" ");
    const iin = String(fd.get("iin") ?? "").trim();

    if (iin && !validateIin(iin)) { setFormError(t.iinInvalid); return; }

    setBusy(true);
    try {
      await api.createStudent(token, {
        fullName,
        iin: iin || undefined,
        dateOfBirth: fd.get("dateOfBirth") || undefined,
        classroomId: fd.get("classroomId"),
        classTeacherId: fd.get("classTeacherId") || undefined,
        parentName: fd.get("parentName") || undefined,
        parentContact: fd.get("parentContact") || undefined,
      });
      setStudents(await api.getStudents(token));
      setAdding(false);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      try {
        const b = JSON.parse(raw) as { message?: string };
        const msg = b.message === "IIN_EXISTS" ? t.iinExists : (typeof b.message === "string" ? b.message : raw || "Ошибка");
        setFormError(msg);
      } catch { setFormError(raw || "Ошибка"); }
    } finally { setBusy(false); }
  }

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const iin = String(fd.get("iin") ?? "").trim();
    if (iin && !validateIin(iin)) { setFormError(t.iinInvalid); return; }

    setBusy(true);
    try {
      await api.updateStudent(token, editing.id, {
        fullName: fd.get("fullName") || undefined,
        iin: iin || undefined,
        dateOfBirth: fd.get("dateOfBirth") || undefined,
        classroomId: fd.get("classroomId") || undefined,
        classTeacherId: fd.get("classTeacherId") || undefined,
        parentName: fd.get("parentName") || undefined,
        parentContact: fd.get("parentContact") || undefined,
      });
      setStudents(await api.getStudents(token));
      setEditing(null);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      try {
        const b = JSON.parse(raw) as { message?: string };
        const msg = b.message === "IIN_EXISTS" ? t.iinExists : (typeof b.message === "string" ? b.message : raw || "Ошибка");
        setFormError(msg);
      } catch { setFormError(raw || "Ошибка"); }
    } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить ученика?")) return;
    await api.deleteStudent(token, id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleLinkAccount() {
    if (!linking) return;
    setBusy(true);
    try {
      await api.updateStudent(token, linking.id, { userId: linkUserId || null });
      setStudents(await api.getStudents(token) as StudentRow[]);
      setLinking(null);
      setLinkUserId("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка");
    } finally { setBusy(false); }
  }

  async function handleTransfer() {
    if (!transferring || !transferClassroomId) return;
    setBusy(true);
    try {
      await api.transferStudent(token, transferring.id, transferClassroomId, transferNote || undefined);
      setStudents(await api.getStudents(token));
      setTransferring(null);
      setTransferClassroomId("");
      setTransferNote("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка");
    } finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">👩‍🎓 {t.nav_students}</h1>
        <button className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setFormError(null); }}>
          + {t.addStudentTitle}
        </button>
      </div>

      <div className="filter-row">
        <input className="input" style={{ maxWidth: 260 }} placeholder={`🔍 ${t.search}...`}
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" style={{ maxWidth: 200 }} value={filterClassroom}
          onChange={(e) => setFilterClassroom(e.target.value)}>
          <option value="">{t.all} — {t.classroom}</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">{t.addStudentTitle}</h3>
          <StudentForm
            classrooms={classrooms} classTeachers={classTeachers} t={t}
            onSubmit={handleCreate} onCancel={() => setAdding(false)}
            busy={busy} error={formError}
          />
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Редактировать ученика</h3>
            <StudentForm
              classrooms={classrooms} classTeachers={classTeachers} t={t}
              onSubmit={handleUpdate} onCancel={() => setEditing(null)}
              busy={busy} error={formError}
              defaults={{
                fullName: editing.fullName,
                iin: editing.iin ?? "",
                dateOfBirth: editing.dateOfBirth ?? "",
                classroomId: editing.classroom.id,
                classTeacherId: editing.classTeacher?.id ?? "",
                parentName: editing.parentName ?? "",
                parentContact: editing.parentContact ?? "",
              }}
            />
          </div>
        </div>
      )}

      {transferring && (
        <div className="modal-overlay" onClick={() => setTransferring(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{t.transferStudent}</h3>
            <p className="muted" style={{ marginBottom: 12 }}>
              <strong>{transferring.fullName}</strong> — {transferring.classroom.name}
            </p>
            <div className="field" style={{ marginBottom: 12 }}>
              <label className="field-label">{t.selectTargetClass}</label>
              <select className="input" value={transferClassroomId}
                onChange={(e) => setTransferClassroomId(e.target.value)}>
                <option value="">{t.selectTargetClass}</option>
                {classrooms.filter((c) => c.id !== transferring.classroom.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field-label">{t.transferNote}</label>
              <input className="input" value={transferNote} onChange={(e) => setTransferNote(e.target.value)}
                placeholder="Необязательно" />
            </div>
            <div className="form-row">
              <button className="btn btn-primary" disabled={!transferClassroomId || busy}
                onClick={handleTransfer}>
                {busy ? <span className="spinner" /> : t.transferStudent}
              </button>
              <button className="btn btn-ghost" onClick={() => setTransferring(null)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {linking && (
        <div className="modal-overlay" onClick={() => setLinking(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8 }}>{t.link_account ?? "Привязать аккаунт"}</h3>
            <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
              <strong>{linking.fullName}</strong>
            </p>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field-label">{t.select_user_account ?? "Выберите аккаунт ученика"}</label>
              <select className="input" value={linkUserId} onChange={(e) => setLinkUserId(e.target.value)}>
                <option value="">— Убрать привязку —</option>
                {studentUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>
              {studentUsers.length === 0 && (
                <span className="muted" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
                  Нет пользователей с ролью «Ученик». Попросите ученика зарегистрироваться.
                </span>
              )}
            </div>
            {linking.userId && (
              <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
                Текущий аккаунт ID: <code>{linking.userId}</code>
              </p>
            )}
            <div className="form-row">
              <button className="btn btn-primary" disabled={busy} onClick={handleLinkAccount}>
                {busy ? <span className="spinner" /> : (t.save ?? "Сохранить")}
              </button>
              <button className="btn btn-ghost" onClick={() => setLinking(null)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="muted" style={{ fontSize: 13, padding: "8px 16px" }}>
          {t.search}: {filtered.length} / {students.length}
        </div>
        {filtered.length === 0 ? (
          <p className="empty-state">{t.noData}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>{t.iin}</th>
                <th>{t.classroom}</th>
                <th>{t.classTeacher}</th>
                <th>{t.parentName}</th>
                <th>{t.parentContact}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="table-name">{s.fullName}</td>
                  <td className="muted">{s.iin ?? "—"}</td>
                  <td>
                    <span className="role-chip role-teacher">{s.classroom.name}</span>
                  </td>
                  <td>{s.classTeacher?.fullName ?? "—"}</td>
                  <td>{s.parentName ?? "—"}</td>
                  <td>{s.parentContact ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(s); setFormError(null); }}>
                        ✏️
                      </button>
                      <button className="btn btn-ghost btn-sm" title={t.transferStudent}
                        onClick={() => { setTransferring(s); setTransferClassroomId(""); setTransferNote(""); }}>
                        🔄
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title={t.link_account ?? "Привязать аккаунт"}
                        style={{ color: s.userId ? "var(--success, #28a745)" : undefined }}
                        onClick={() => { setLinking(s); setLinkUserId(s.userId ?? ""); }}
                      >
                        🔗
                      </button>
                      {canDelete && (
                        <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}
                          onClick={() => handleDelete(s.id)}>
                          🗑
                        </button>
                      )}
                    </div>
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

function StudentForm({ classrooms, classTeachers, t, onSubmit, onCancel, busy, error, defaults }: {
  classrooms: ClassroomOption[];
  classTeachers: TeacherOption[];
  t: Record<string, string>;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
  defaults?: { fullName: string; iin: string; dateOfBirth: string; classroomId: string; classTeacherId: string; parentName: string; parentContact: string };
}) {
  const isEdit = !!defaults;

  return (
    <form onSubmit={onSubmit} className="form-stack">
      {isEdit ? (
        <div className="field">
          <label className="field-label">ФИО</label>
          <input name="fullName" className="input" defaultValue={defaults?.fullName} required />
        </div>
      ) : (
        <div className="form-row">
          <div className="field">
            <label className="field-label">{t.lastName}</label>
            <input name="lastName" className="input" required placeholder="Иванов" />
          </div>
          <div className="field">
            <label className="field-label">{t.firstName}</label>
            <input name="firstName" className="input" required placeholder="Иван" />
          </div>
          <div className="field">
            <label className="field-label">{t.middleName}</label>
            <input name="middleName" className="input" placeholder="Иванович" />
          </div>
        </div>
      )}

      <div className="form-row">
        <div className="field">
          <label className="field-label">{t.iin}</label>
          <input name="iin" className="input" defaultValue={defaults?.iin}
            placeholder="123456789012" maxLength={12} pattern="\d{12}"
            title={t.iinInvalid} />
        </div>
        <div className="field">
          <label className="field-label">{t.dateOfBirth}</label>
          <input name="dateOfBirth" type="date" className="input" defaultValue={defaults?.dateOfBirth} />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label className="field-label">{t.selectClass}</label>
          <select name="classroomId" className="input" required defaultValue={defaults?.classroomId ?? ""}>
            <option value="" disabled>{t.selectClass}</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({t.grade} {c.grade})</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label">{t.classTeacher}</label>
          <select name="classTeacherId" className="input" defaultValue={defaults?.classTeacherId ?? ""}>
            <option value="">— {t.classTeacher} —</option>
            {classTeachers.map((ct) => (
              <option key={ct.id} value={ct.id}>{ct.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label className="field-label">{t.parentName}</label>
          <input name="parentName" className="input" defaultValue={defaults?.parentName} />
        </div>
        <div className="field">
          <label className="field-label">{t.parentContact}</label>
          <input name="parentContact" className="input" defaultValue={defaults?.parentContact}
            placeholder="+7 (700) 000 0000" />
        </div>
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
