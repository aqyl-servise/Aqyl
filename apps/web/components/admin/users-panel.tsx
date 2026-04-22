"use client";
import { FormEvent, useEffect, useState } from "react";
import { api, AuthUser, UserRole } from "../../lib/api";
import { Language } from "../../lib/translations";

const ROLES: UserRole[] = ["teacher", "admin", "principal", "vice_principal", "class_teacher"];
const ROLE_LABELS: Record<UserRole, string> = {
  teacher: "Учитель", admin: "Администратор", principal: "Директор",
  vice_principal: "Завуч", class_teacher: "Классный руководитель", student: "Ученик",
};

export function UsersPanel({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getUsers(token).then(setUsers).catch(console.error);
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
      setUsers(await api.getUsers(token));
      setAdding(false);
    } finally { setBusy(false); }
  }

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.updateUser(token, editing.id, {
        fullName: fd.get("fullName"),
        role: fd.get("role"),
        subject: fd.get("subject") || undefined,
      });
      setUsers(await api.getUsers(token));
      setEditing(null);
    } finally { setBusy(false); }
  }

  return (
    <div className="page">
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
              <Field label={t.password} name="password" type="password" />
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
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Редактировать пользователя</h3>
            <form onSubmit={handleUpdate} className="form-stack">
              <Field label="ФИО" name="fullName" defaultValue={editing.fullName} />
              <Field label={t.subject} name="subject" defaultValue={editing.subject ?? ""} />
              <div className="field">
                <label className="field-label">Роль</label>
                <select name="role" className="input" defaultValue={editing.role}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="form-row">
                <button className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : t.save}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>{t.cancel}</button>
              </div>
            </form>
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
              <tr><th>ФИО</th><th>Email</th><th>Предмет</th><th>Роль</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="table-name">{u.fullName}</td>
                  <td className="muted">{u.email}</td>
                  <td>{u.subject ?? "—"}</td>
                  <td>
                    <span className={`role-chip role-${u.role}`}>{ROLE_LABELS[u.role]}</span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(u)}>Изменить</button>
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

function Field({ label, name, type, defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input name={name} type={type ?? "text"} defaultValue={defaultValue} className="input" />
    </div>
  );
}
