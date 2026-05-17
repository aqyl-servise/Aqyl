"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api, AuthUser, ClassroomOption, UserRole } from "../../lib/api";
import { Language } from "../../lib/translations";
import { PasswordInput } from "../ui/password-input";

const ALL_ROLES: UserRole[] = [
  "teacher", "class_teacher", "admin", "principal",
  "vice_principal", "vice_principal_academic", "vice_principal_education",
  "psychologist", "social_pedagogue",
];

function getRoleLabel(role: string, t: Record<string, string>): string {
  const map: Record<string, string> = {
    teacher: t.role_teacher ?? "Учитель",
    class_teacher: t.role_class_teacher ?? "Классный руководитель",
    admin: t.role_admin ?? "Администратор",
    principal: t.role_principal ?? "Директор",
    vice_principal: t.role_vice_principal ?? "Завуч",
    vice_principal_academic: t.role_vice_principal_academic ?? "Завуч по учебной части",
    vice_principal_education: t.role_vice_principal_education ?? "Завуч по воспитательной части",
    psychologist: t.role_psychologist ?? "Психолог",
    social_pedagogue: t.role_social_pedagogue ?? "Соц. педагог",
    student: t.role_student ?? "Ученик",
  };
  return map[role] ?? role;
}

const SCHOOL_ROLES: UserRole[] = [
  "teacher", "class_teacher", "principal",
  "vice_principal", "vice_principal_academic", "vice_principal_education",
  "psychologist", "social_pedagogue",
];

type SchoolOption = { id: string; name: string };

type ConfirmModal =
  | { kind: "deactivate"; user: AuthUser }
  | { kind: "delete"; user: AuthUser };

export function UsersPanel({ token, language, t, currentUserId }: {
  token: string; language: Language; t: Record<string, string>; currentUserId: string;
}) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<AuthUser | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  const reload = () => api.getUsers(token).then(setUsers).catch(console.error);

  useEffect(() => {
    reload();
    api.getClassroomsForDropdown(token).then(setClassrooms).catch(console.error);
    api.getSchools(token).then(setSchools).catch(console.error);
  }, [token]);

  const filtered = users.filter((u) => {
    const matchSearch = u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.createUser(token, {
        fullName: fd.get("fullName"),
        email: fd.get("email"),
        password: fd.get("password"),
        role: fd.get("role"),
        subject: fd.get("subject") || undefined,
      });
      await reload();
      setAdding(false);
    } finally { setBusy(false); }
  }

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const isClassTeacher = fd.get("isClassTeacher") === "on";
    const managedClassroomId = isClassTeacher ? (fd.get("managedClassroomId") as string || null) : null;
    const chosenClassroom = managedClassroomId
      ? classrooms.find(c => c.id === managedClassroomId) ?? null
      : null;
    const role = fd.get("role") as string;
    const schoolId = SCHOOL_ROLES.includes(role as UserRole)
      ? (fd.get("schoolId") as string || null)
      : undefined;
    try {
      await api.updateUser(token, editing.id, {
        fullName: fd.get("fullName"),
        role,
        subject: fd.get("subject") || undefined,
        isClassTeacher,
        managedClassroomId,
        managedClassroomName: chosenClassroom?.name ?? null,
        ...(schoolId !== undefined ? { schoolId } : {}),
      });
      await reload();
      setEditing(null);
    } finally { setBusy(false); }
  }

  async function handleConfirm() {
    if (!confirmModal) return;
    setActionBusy(confirmModal.user.id);
    try {
      if (confirmModal.kind === "deactivate") {
        await api.deactivateUser(token, confirmModal.user.id);
      } else {
        await api.deleteUser(token, confirmModal.user.id);
      }
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.error);
    } finally {
      setActionBusy(null);
      setConfirmModal(null);
    }
  }

  async function handleActivate(user: AuthUser) {
    setActionBusy(user.id);
    try {
      await api.activateUser(token, user.id);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.error);
    } finally { setActionBusy(null); }
  }

  const isSelf = (u: AuthUser) => u.id === currentUserId;

  return (
    <div className="page">
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 1000,
          background: "#166534", color: "#fff", padding: "12px 20px",
          borderRadius: 10, fontWeight: 600, fontSize: 14,
          boxShadow: "0 4px 16px rgba(0,0,0,.18)", display: "flex", alignItems: "center", gap: 8,
        }}>
          ✓ {toast}
        </div>
      )}
      <div className="page-header">
        <h1 className="page-title">👥 {t.nav_users}</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ {t.add}</button>
      </div>

      <div className="filter-row">
        <input className="input" style={{ maxWidth: 260 }} placeholder={`🔍 ${t.search}...`}
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" style={{ minWidth: 200 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">{t.all}</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{getRoleLabel(r, t)}</option>
          ))}
          <option value="student">{t.role_student ?? "Ученик"}</option>
        </select>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">{t.users_new_user}</h3>
          <form onSubmit={handleCreate} className="form-stack">
            <div className="form-row">
              <Field label={t.fullNameLabel} name="fullName" />
              <Field label={t.email} name="email" type="email" />
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field-label">{t.password}</label>
                <PasswordInput name="password" required />
              </div>
              <Field label={t.subject} name="subject" />
            </div>
            <div className="field">
              <label className="field-label">{t.users_role}</label>
              <select name="role" className="input" required>
                {ALL_ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r, t)}</option>)}
              </select>
            </div>
            <div className="form-row">
              <button className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : t.save}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>{t.cancel}</button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <EditUserModal
          user={editing}
          classrooms={classrooms}
          schools={schools}
          busy={busy}
          t={t}
          onSubmit={handleUpdate}
          onClose={() => setEditing(null)}
        />
      )}

      {passwordTarget && (
        <PasswordModal
          user={passwordTarget}
          token={token}
          t={t}
          onClose={() => setPasswordTarget(null)}
          onSuccess={() => { setPasswordTarget(null); showToast(t.users_password_changed); }}
        />
      )}

      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            {confirmModal.kind === "deactivate" ? (
              <>
                <h3 style={{ marginBottom: 12, color: "#92400e" }}>⏸ {t.users_deactivate_title}</h3>
                <p style={{ color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>
                  <strong>{confirmModal.user.fullName}</strong>
                </p>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: 12, color: "#991b1b" }}>🗑 {t.users_delete_title}</h3>
                <p style={{ color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>
                  {t.users_delete_body}<br />
                  <strong>{confirmModal.user.fullName}</strong>
                </p>
              </>
            )}
            <div className="form-row">
              <button
                className={`btn ${confirmModal.kind === "delete" ? "btn-danger" : "btn-warning"}`}
                disabled={actionBusy === confirmModal.user.id}
                onClick={handleConfirm}
              >
                {actionBusy === confirmModal.user.id
                  ? <span className="spinner" />
                  : confirmModal.kind === "delete" ? t.teacher_delete : t.users_deactivate}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmModal(null)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="users-count muted" style={{ fontSize: 13, marginBottom: 4 }}>
          {t.users_shown}: {filtered.length} {t.out_of} {users.length}
        </div>
        {filtered.length === 0 ? <p className="empty-state">{t.noData}</p> : (
          <table className="data-table">
            <thead>
              <tr><th>{t.fullNameLabel}</th><th>{t.email}</th><th>{t.subject}</th><th>{t.teacher_school}</th><th>{t.users_role}</th><th>{t.status}</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ opacity: u.status === "inactive" ? 0.65 : 1 }}>
                  <td className="table-name">{u.fullName}</td>
                  <td className="muted">{u.email}</td>
                  <td>{u.subject ?? "—"}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{u.schoolName ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                      <span className={`role-chip role-${u.role}`}>{getRoleLabel(u.role, t)}</span>
                      {u.role === "teacher" && u.isClassTeacher && u.managedClassroomName && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          background: "#dbeafe", color: "#1d4ed8",
                          borderRadius: 6, padding: "2px 7px",
                          border: "1px solid #bfdbfe",
                        }}>
                          {t.role_class_teacher} · {u.managedClassroomName}
                        </span>
                      )}
                      {u.role === "teacher" && u.isClassTeacher && !u.managedClassroomName && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          background: "#dbeafe", color: "#1d4ed8",
                          borderRadius: 6, padding: "2px 7px",
                          border: "1px solid #bfdbfe",
                        }}>
                          {t.role_class_teacher}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {u.status === "inactive" ? (
                      <span className="status-chip status-inactive">{t.teacher_status_inactive}</span>
                    ) : (
                      <span className="status-chip status-active">{t.teacher_status_active}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(u)}>{t.teacher_edit}</button>
                      {!isSelf(u) && (
                        <button
                          className="btn btn-sm"
                          style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
                          onClick={() => setPasswordTarget(u)}
                          title={t.users_change_password}
                        >
                          🔑
                        </button>
                      )}
                      {!isSelf(u) && (
                        <>
                          {u.status === "inactive" ? (
                            <button
                              className="btn btn-sm"
                              style={{ background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" }}
                              disabled={actionBusy === u.id}
                              onClick={() => handleActivate(u)}
                              title={t.users_activate}
                            >
                              {actionBusy === u.id ? <span className="spinner" /> : `▶ ${t.users_activate}`}
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm"
                              style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}
                              disabled={actionBusy === u.id}
                              onClick={() => setConfirmModal({ kind: "deactivate", user: u })}
                              title={t.users_deactivate}
                            >
                              ⏸ {t.users_deactivate}
                            </button>
                          )}
                          <button
                            className="btn btn-sm"
                            style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }}
                            disabled={actionBusy === u.id}
                            onClick={() => setConfirmModal({ kind: "delete", user: u })}
                            title={t.teacher_delete}
                          >
                            🗑
                          </button>
                        </>
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

function EditUserModal({ user, classrooms, schools, busy, t, onSubmit, onClose }: {
  user: AuthUser; classrooms: ClassroomOption[]; schools: SchoolOption[]; busy: boolean;
  t: Record<string, string>;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const [isClassTeacher, setIsClassTeacher] = useState(user.isClassTeacher ?? false);
  const [selectedRole, setSelectedRole] = useState<string>(user.role);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>{t.users_edit_user}</h3>
        <form onSubmit={onSubmit} className="form-stack">
          <Field label={t.fullNameLabel} name="fullName" defaultValue={user.fullName} />
          <Field label={t.subject} name="subject" defaultValue={user.subject ?? ""} />
          <div className="field">
            <label className="field-label">{t.users_role}</label>
            <select
              name="role"
              className="input"
              value={selectedRole}
              onChange={e => {
                setSelectedRole(e.target.value);
                if (e.target.value !== "teacher") setIsClassTeacher(false);
              }}
            >
              {ALL_ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r, t)}</option>)}
            </select>
          </div>

          {SCHOOL_ROLES.includes(selectedRole as UserRole) && schools.length > 0 && (
            <div className="field">
              <label className="field-label">{t.teacher_school}</label>
              <select name="schoolId" className="input" defaultValue={user.schoolId ?? ""}>
                <option value="">— {t.users_not_bound} —</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedRole === "teacher" && (
            <div style={{ background: "var(--surface-alt, #f8fafc)", borderRadius: 8, padding: "12px 14px", border: "1px solid var(--border, #e2e8f0)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: isClassTeacher ? 10 : 0 }}>
                <input
                  type="checkbox"
                  name="isClassTeacher"
                  checked={isClassTeacher}
                  onChange={e => setIsClassTeacher(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span style={{ fontWeight: 500 }}>{t.users_class_teacher_check}</span>
              </label>
              {isClassTeacher && (
                <div className="field" style={{ margin: "0 0 0 26px" }}>
                  <label className="field-label" style={{ fontSize: 12 }}>{t.classroom}</label>
                  <select
                    name="managedClassroomId"
                    className="input"
                    defaultValue={user.managedClassroomId ?? ""}
                  >
                    <option value="">— {t.users_select_class} —</option>
                    {classrooms.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="form-row">
            <button className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : t.save}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t.cancel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, type, defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input name={name} type={type ?? "text"} defaultValue={defaultValue} className="input" />
    </div>
  );
}

function PasswordModal({ user, token, t, onClose, onSuccess }: {
  user: AuthUser; token: string; t: Record<string, string>;
  onClose: () => void; onSuccess: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) { setError(t.users_min_password); return; }
    if (newPassword !== confirmPassword) { setError(t.users_password_mismatch); return; }
    setBusy(true);
    try {
      await api.changeUserPassword(token, user.id, newPassword);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 4 }}>🔑 {t.users_password_title}</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>{user.fullName}</p>
        <form onSubmit={handleSubmit} className="form-stack">
          <div className="field">
            <label className="field-label">{t.users_new_password}</label>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t.users_min_password}
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field-label">{t.users_confirm_password}</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.users_repeat_password}
            />
          </div>
          {error && <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p>}
          <div className="form-row">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spinner" /> : t.save}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t.cancel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
