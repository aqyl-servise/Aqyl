"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type SchoolRow = {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  code: string;
  isActive: boolean;
  userCount: number;
  createdAt: string;
};

const REGIONS = [
  "Алматы", "Астана", "Шымкент",
  "Алматинская", "Акмолинская", "Актюбинская", "Атырауская",
  "Восточно-Казахстанская", "Жамбылская", "Западно-Казахстанская",
  "Карагандинская", "Костанайская", "Кызылординская", "Мангистауская",
  "Павлодарская", "Северо-Казахстанская", "Туркестанская",
  "Абайская", "Жетысуская", "Улытауская",
];

export function SchoolsPanel({ token, language, t }: {
  token: string; language: Language; t: Record<string, string>;
}) {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", region: "" });
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, [token]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getSchools(token);
      setSchools(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError(t.school_create_error_required); return; }
    setFormError("");
    setFormBusy(true);
    try {
      await api.createSchool(token, { name: form.name.trim(), city: form.city.trim() || undefined, region: form.region || undefined });
      setForm({ name: "", city: "", region: "" });
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      let display = raw;
      try { display = JSON.parse(raw)?.message ?? raw; } catch {}
      if (display.includes("уже существует") || display.includes("conflict") || display.includes("Conflict")) {
        display = t.school_create_error_exists;
      }
      setFormError(display || t.school_create_error_generic);
    } finally {
      setFormBusy(false);
    }
  }

  async function handleToggle(school: SchoolRow) {
    setBusy(school.id);
    try {
      const updated = school.isActive
        ? await api.deactivateSchool(token, school.id)
        : await api.activateSchool(token, school.id);
      setSchools((prev) => prev.map((s) => s.id === school.id ? { ...s, isActive: updated.isActive } : s));
    } finally {
      setBusy(null);
    }
  }

  const filtered = schools.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city ?? "").toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = schools.filter((s) => s.isActive).length;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🏫 {t.nav_schools}</h1>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setFormError(""); }}>
          {t.school_add_btn}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: t.school_stat_total, value: schools.length, color: "var(--primary)" },
          { label: t.school_stat_active, value: activeCount, color: "var(--success, #22c55e)" },
          { label: t.school_stat_deactivated, value: schools.length - activeCount, color: "var(--danger, #ef4444)" },
          { label: t.school_stat_users, value: schools.reduce((s, x) => s + x.userCount, 0), color: "var(--accent, #8b5cf6)" },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ flex: "1 1 140px", minWidth: 130, padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Create form modal */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 440, padding: 28 }}>
            <h2 style={{ marginBottom: 20, fontSize: 18, fontWeight: 600 }}>{t.school_modal_title}</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                  {t.schoolName} *
                </label>
                <input
                  className="input"
                  placeholder={t.school_name_placeholder}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                  {t.school_city_label}
                </label>
                <input
                  className="input"
                  placeholder={t.school_city_placeholder}
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                  {t.school_region_label}
                </label>
                <select
                  className="input"
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                >
                  <option value="">{t.school_region_none}</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ background: "var(--surface-raised, #f0f4ff)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--muted)" }}>
                {t.school_code_hint}
              </div>
              {formError && <div style={{ color: "var(--danger)", fontSize: 13 }}>{formError}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn btn-primary" disabled={formBusy}>
                  {formBusy ? <span className="spinner" /> : t.btn_create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          style={{ maxWidth: 320 }}
          placeholder={t.school_search_placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="card"><p className="empty-state">{t.loading}</p></div>
      ) : filtered.length === 0 ? (
        <div className="card"><p className="empty-state">
          {schools.length === 0 ? t.school_empty : t.school_not_found}
        </p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.school_col_code}</th>
                <th>{t.school_col_name}</th>
                <th>{t.school_col_city}</th>
                <th>{t.school_col_region}</th>
                <th style={{ textAlign: "center" }}>{t.school_col_users}</th>
                <th>{t.school_col_created}</th>
                <th style={{ textAlign: "center" }}>{t.status}</th>
                <th style={{ textAlign: "center" }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((school) => (
                <tr key={school.id}>
                  <td>
                    <span style={{
                      fontFamily: "monospace", fontSize: 12,
                      background: "var(--surface-raised, #f0f4ff)",
                      padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                    }}>
                      {school.code}
                    </span>
                  </td>
                  <td className="table-name">{school.name}</td>
                  <td className="muted">{school.city ?? "—"}</td>
                  <td className="muted">{school.region ?? "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontWeight: 600, color: school.userCount > 0 ? "var(--primary)" : "var(--muted)",
                    }}>
                      👥 {school.userCount}
                    </span>
                  </td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>
                    {new Date(school.createdAt).toLocaleDateString(language === "kz" ? "kk-KZ" : language === "en" ? "en-US" : "ru-RU")}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      display: "inline-block", padding: "3px 10px", borderRadius: 12,
                      fontSize: 12, fontWeight: 600,
                      background: school.isActive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                      color: school.isActive ? "#16a34a" : "#dc2626",
                    }}>
                      {school.isActive ? t.school_status_active : t.school_status_inactive}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className={`btn btn-sm ${school.isActive ? "btn-ghost" : "btn-primary"}`}
                      style={school.isActive ? { color: "var(--danger)" } : undefined}
                      disabled={busy === school.id}
                      onClick={() => handleToggle(school)}
                    >
                      {busy === school.id
                        ? <span className="spinner" />
                        : school.isActive ? t.users_deactivate : t.users_activate}
                    </button>
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
