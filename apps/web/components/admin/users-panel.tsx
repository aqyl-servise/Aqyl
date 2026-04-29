"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api, AuthUser, ClassroomOption, UserRole } from "../../lib/api";
import { Language } from "../../lib/translations";
import { PasswordInput } from "../ui/password-input";

const ROLES: UserRole[] = ["teacher", "admin", "principal", "vice_principal", "class_teacher"];
const ROLE_LABELS: Record<UserRole, string> = {
  teacher: "Учитель", admin: "Администратор", principal: "Директор",
  vice_principal: "Завуч", class_teacher: "Классный руководитель", student: "Ученик",
};

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

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  const reload = () => api.getUsers(token).then(setUsers).catch(console.error);

  useEffect(() => {
    reload();
    api.getClassroomsForDropdown(token).then(setClassrooms).catch(console.error);
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
    try {
      await api.updateUser(token, editing.id, {
        fullName: fd.get("fullName"),
        role: fd.get("role"),
        subject: fd.get("subject") || undefined,
        isClassTeacher,
        managedClassroomId,
        managedClassroomName: chosenClassroom?.name ?? null,
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
      alert(err instanceof Error ? err.message : "Ошибка");
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
      alert(err instanceof Error ? err.message : "Ошибка");
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
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Добавить</button>
      </div>

      <div className="filter-row">
        <input className="input" style={{ maxWidth: 260 }} placeholder={`🔍 ${t.search}...`}
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="role-tabs">
          {["all", ...ROLES].map((r) => (
            <button key={r} className={`role-tab ${roleFilter === r ? "active" : ""}`} onClick={() => setRoleFilter(r)}>
              {r === "all" ? t.all : ROLE_LABELS[r as UserRole]}
            </button>
          ))}
        </div>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Новый пользователь</h3>
          <form onSubmit={handleCreate} className="form-stack">
            <div className="form-row">
              <Field label="ФИО" name="fullName" />
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
              <label className="field-label">Роль</label>
              <select name="role" className="input" required>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
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
          onSuccess={() => { setPasswordTarget(null); showToast("Пароль успешно изменён"); }}
        />
      )}

      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            {confirmModal.kind === "deactivate" ? (
              <>
                <h3 style={{ marginBottom: 12, color: "#92400e" }}>⏸ Деактивировать аккаунт?</h3>
                <p style={{ color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>
                  Деактивировать аккаунт <strong>{confirmModal.user.fullName}</strong>?<br />
                  Пользователь не сможет войти в систему.
                </p>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: 12, color: "#991b1b" }}>🗑 Удалить аккаунт?</h3>
                <p style={{ color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>
                  Вы уверены? Это действие необратимо.<br />
                  Все данные пользователя <strong>{confirmModal.user.fullName}</strong> будут удалены.
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
                  : confirmModal.kind === "delete" ? "Удалить" : "Деактивировать"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmModal(null)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="users-count muted" style={{ fontSize: 13, marginBottom: 4 }}>
          Показано: {filtered.length} из {users.length}
        </div>
        {filtered.length === 0 ? <p className="empty-state">{t.noData}</p> : (
          <table className="data-table">
            <thead>
              <tr><th>ФИО</th><th>Email</th><th>Предмет</th><th>Роль</th><th>Статус</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ opacity: u.status === "inactive" ? 0.65 : 1 }}>
                  <td className="table-name">{u.fullName}</td>
                  <td className="muted">{u.email}</td>
                  <td>{u.subject ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                      <span className={`role-chip role-${u.role}`}>{ROLE_LABELS[u.role]}</span>
                      {u.role === "teacher" && u.isClassTeacher && u.managedClassroomName && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          background: "#dbeafe", color: "#1d4ed8",
                          borderRadius: 6, padding: "2px 7px",
                          border: "1px solid #bfdbfe",
                        }}>
                          Кл. рук. {u.managedClassroomName}
                        </span>
                      )}
                      {u.role === "teacher" && u.isClassTeacher && !u.managedClassroomName && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          background: "#dbeafe", color: "#1d4ed8",
                          borderRadius: 6, padding: "2px 7px",
                          border: "1px solid #bfdbfe",
                        }}>
                          Кл. рук.
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {u.status === "inactive" ? (
                      <span className="status-chip status-inactive">Неактивен</span>
                    ) : (
                      <span className="status-chip status-active">Активен</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(u)}>Изменить</button>
                      {!isSelf(u) && (
                        <button
                          className="btn btn-sm"
                          style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
                          onClick={() => setPasswordTarget(u)}
                          title="Сменить пароль"
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
                              title="Активировать"
                            >
                              {actionBusy === u.id ? <span className="spinner" /> : "▶ Активировать"}
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm"
                              style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}
                              disabled={actionBusy === u.id}
                              onClick={() => setConfirmModal({ kind: "deactivate", user: u })}
                              title="Деактивировать"
                            >
                              ⏸ Деактивировать
                            </button>
                          )}
                          <button
                            className="btn btn-sm"
                            style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }}
                            disabled={actionBusy === u.id}
                            onClick={() => setConfirmModal({ kind: "delete", user: u })}
                            title="Удалить"
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

function EditUserModal({ user, classrooms, busy, t, onSubmit, onClose }: {
  user: AuthUser; classrooms: ClassroomOption[]; busy: boolean;
  t: Record<string, string>;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const [isClassTeacher, setIsClassTeacher] = useState(user.isClassTeacher ?? false);
  const [selectedRole, setSelectedRole] = useState<string>(user.role);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>Редактировать пользователя</h3>
        <form onSubmit={onSubmit} className="form-stack">
          <Field label="ФИО" name="fullName" defaultValue={user.fullName} />
          <Field label={t.subject} name="subject" defaultValue={user.subject ?? ""} />
          <div className="field">
            <label className="field-label">Роль</label>
            <select
              name="role"
              className="input"
              value={selectedRole}
              onChange={e => {
                setSelectedRole(e.target.value);
                if (e.target.value !== "teacher") setIsClassTeacher(false);
              }}
            >
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>

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
                <span style={{ fontWeight: 500 }}>Классный руководитель</span>
              </label>
              {isClassTeacher && (
                <div className="field" style={{ margin: "0 0 0 26px" }}>
                  <label className="field-label" style={{ fontSize: 12 }}>Класс</label>
                  <select
                    name="managedClassroomId"
                    className="input"
                    defaultValue={user.managedClassroomId ?? ""}
                  >
                    <option value="">— выберите класс —</option>
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
    if (newPassword.length < 6) { setError("Минимум 6 символов"); return; }
    if (newPassword !== confirmPassword) { setError("Пароли не совпадают"); return; }
    setBusy(true);
    try {
      await api.changeUserPassword(token, user.id, newPassword);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 4 }}>🔑 Смена пароля</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>{user.fullName}</p>
        <form onSubmit={handleSubmit} className="form-stack">
          <div className="field">
            <label className="field-label">Новый пароль</label>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field-label">Подтвердить пароль</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
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
