"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type PendingUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  schoolName?: string;
  createdAt: string;
  status: string;
};

type SchoolOption = { id: string; name: string };

const ROLE_LABELS: Record<string, string> = {
  teacher: "Учитель", class_teacher: "Классный руководитель",
  admin: "Администратор", principal: "Директор",
  vice_principal: "Завуч",
  vice_principal_academic: "Завуч по учебной части",
  vice_principal_education: "Завуч по воспитательной части",
  psychologist: "Психолог", social_pedagogue: "Соц. педагог",
  student: "Ученик",
};

const SCHOOL_ROLES = new Set([
  "teacher", "class_teacher", "principal",
  "vice_principal", "vice_principal_academic", "vice_principal_education",
  "psychologist", "social_pedagogue",
]);

export function RegistrationsPanel({ token, language, t }: {
  token: string; language: Language; t: Record<string, string>;
}) {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getPendingRegistrations(token).then(setUsers).catch(console.error);
    api.getSchools(token).then(setSchools).catch(console.error);
  }, [token]);

  const filtered = tab === "pending" ? users.filter((u) => u.status === "pending") : users;

  async function handleApprove(id: string, role: string) {
    const schoolId = selectedSchools[id];
    if (SCHOOL_ROLES.has(role) && !schoolId) {
      const confirmed = window.confirm("Школа не выбрана. Одобрить без привязки к школе?");
      if (!confirmed) return;
    }
    setBusy(id);
    try {
      await api.approveRegistration(token, id, schoolId || undefined);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: "active" } : u));
    } finally { setBusy(null); }
  }

  async function handleReject(id: string) {
    setBusy(id);
    try {
      await api.rejectRegistration(token, id);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: "rejected" } : u));
    } finally { setBusy(null); }
  }

  const pendingCount = users.filter((u) => u.status === "pending").length;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">
          📬 {t.pendingRegistrations}
          {pendingCount > 0 && (
            <span style={{ marginLeft: 8, background: "var(--danger)", color: "#fff", borderRadius: 12, padding: "2px 10px", fontSize: 13 }}>
              {pendingCount}
            </span>
          )}
        </h1>
      </div>

      <div className="role-tabs" style={{ marginBottom: 20 }}>
        <button className={`role-tab${tab === "pending" ? " active" : ""}`} onClick={() => setTab("pending")}>
          {t.status_pending} {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button className={`role-tab${tab === "all" ? " active" : ""}`} onClick={() => setTab("all")}>
          {t.all} ({users.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><p className="empty-state">{t.noData}</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Школа</th>
                <th>Дата</th>
                <th>{t.status}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="table-name">{u.fullName}</td>
                  <td className="muted">{u.email}</td>
                  <td>{ROLE_LABELS[u.role] ?? u.role}</td>
                  <td>{u.schoolName ?? "—"}</td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>
                    {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                  <td>
                    <span className={`role-chip role-${u.status === "active" ? "teacher" : u.status === "rejected" ? "admin" : "class_teacher"}`}>
                      {t[`status_${u.status}` as keyof typeof t] ?? u.status}
                    </span>
                  </td>
                  <td>
                    {u.status === "pending" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200 }}>
                        {SCHOOL_ROLES.has(u.role) && schools.length > 0 && (
                          <select
                            className="input"
                            style={{ fontSize: 12, padding: "4px 8px" }}
                            value={selectedSchools[u.id] ?? ""}
                            onChange={e => setSelectedSchools(prev => ({ ...prev, [u.id]: e.target.value }))}
                          >
                            <option value="">— выберите школу —</option>
                            {schools.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        )}
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={busy === u.id}
                            onClick={() => handleApprove(u.id, u.role)}
                          >
                            {busy === u.id ? <span className="spinner" /> : "✓ " + t.approve}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "var(--danger)" }}
                            disabled={busy === u.id}
                            onClick={() => handleReject(u.id)}
                          >
                            ✕ {t.reject}
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
