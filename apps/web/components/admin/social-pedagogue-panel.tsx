"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";

interface Props { token: string; language: Language; userRole: string; }

type NutritionStudent = { id: string; studentId: string; nutritionType: string; academicYear?: string; notes?: string; createdAt: string };
type NutritionOrder = { id: string; title: string; fileUrl?: string; createdAt: string };
type SpecialStudent = { id: string; studentId: string; reason: string; documents: { title: string; fileUrl: string }[]; createdAt: string };
type StudentRow = { id: string; fullName: string; classroom?: { name: string } };

function fmLabels(t: Record<string, string>) {
  return {
    home: t.fm_home, newFolder: t.fm_new_folder, upload: t.fm_upload,
    uploading: t.fm_uploading, search: t.fm_search, folderName: t.fm_folder_name,
    create: t.fm_create, cancel: t.cancel, noFiles: t.fm_no_files,
    download: t.fm_download, delete: t.fm_delete, loading: t.loading,
  };
}

export function SocialPedagoguePanel({ token, language, userRole }: Props) {
  const t = translations[language];
  const [tab, setTab] = useState<"nutrition" | "special" | "prevention">("nutrition");
  const canEdit = !["student"].includes(userRole);

  return (
    <div className="page">
      <h1 className="page-title">🤝 {t.nav_social_pedagogue}</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button className={`btn btn-sm ${tab === "nutrition" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("nutrition")}>{t.nav_nutrition}</button>
        <button className={`btn btn-sm ${tab === "special" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("special")}>{t.nav_special_students}</button>
        <button className={`btn btn-sm ${tab === "prevention" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("prevention")}>{t.nav_prevention}</button>
      </div>

      {tab === "nutrition" && <NutritionTab token={token} t={t} canEdit={canEdit} />}
      {tab === "special" && <SpecialAttentionTab token={token} t={t} canEdit={canEdit} />}
      {tab === "prevention" && (
        <div className="card" style={{ marginTop: 0 }}>
          <FileManager token={token} section="prevention" canEdit={canEdit} canUpload={canEdit} labels={fmLabels(t)} />
        </div>
      )}
    </div>
  );
}

function NutritionTab({ token, t, canEdit }: { token: string; t: Record<string, string>; canEdit: boolean }) {
  const [subTab, setSubTab] = useState<"students" | "orders">("students");
  const [students, setStudents] = useState<NutritionStudent[]>([]);
  const [orders, setOrders] = useState<NutritionOrder[]>([]);
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ studentId: "", nutritionType: "free", academicYear: "", notes: "" });
  const [orderForm, setOrderForm] = useState({ title: "", fileUrl: "" });
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getNutritionStudents(token),
      api.getNutritionOrders(token),
      api.getStudents(token),
    ]).then(([s, o, all]) => {
      setStudents(s); setOrders(o); setAllStudents(all);
    }).finally(() => setLoading(false));
  }, [token]);

  const studentName = (id: string) => allStudents.find(s => s.id === id)?.fullName ?? id;

  async function addStudent() {
    const res = await api.upsertNutritionStudent(token, { studentId: form.studentId, nutritionType: form.nutritionType, academicYear: form.academicYear || undefined, notes: form.notes || undefined });
    const updated = await api.getNutritionStudents(token);
    setStudents(updated);
    setShowStudentForm(false);
    setForm({ studentId: "", nutritionType: "free", academicYear: "", notes: "" });
  }

  async function removeStudent(id: string) {
    await api.removeNutritionStudent(token, id);
    setStudents(prev => prev.filter(s => s.id !== id));
  }

  async function addOrder() {
    await api.createNutritionOrder(token, { title: orderForm.title, fileUrl: orderForm.fileUrl || undefined });
    const updated = await api.getNutritionOrders(token);
    setOrders(updated);
    setShowOrderForm(false);
    setOrderForm({ title: "", fileUrl: "" });
  }

  async function removeOrder(id: string) {
    await api.removeNutritionOrder(token, id);
    setOrders(prev => prev.filter(o => o.id !== id));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button className={`btn btn-sm ${subTab === "students" ? "btn-primary" : "btn-ghost"}`} onClick={() => setSubTab("students")}>{t.nutrition_students_tab}</button>
        <button className={`btn btn-sm ${subTab === "orders" ? "btn-primary" : "btn-ghost"}`} onClick={() => setSubTab("orders")}>{t.nutrition_orders_tab}</button>
      </div>

      {subTab === "students" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowStudentForm(!showStudentForm)}>
                + {t.nutrition_add}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={async () => {
              const blob = await api.exportNutritionCsv(token);
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = "nutrition.csv";
              link.click();
            }}>{t.nutrition_download ?? "Скачать Excel"}</button>
          </div>
          {showStudentForm && (
            <div className="card" style={{ padding: 16, marginBottom: 12, maxWidth: 480 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div className="field" style={{ flex: 2, minWidth: 160 }}>
                  <label className="field-label">{t.student_classmates_title}</label>
                  <select className="input" value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}>
                    <option value="">{t.selectClass}</option>
                    {allStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                  </select>
                </div>
                <div className="field" style={{ flex: 1, minWidth: 120 }}>
                  <label className="field-label">{t.nutrition_type}</label>
                  <select className="input" value={form.nutritionType} onChange={e => setForm(f => ({ ...f, nutritionType: e.target.value }))}>
                    <option value="free">{t.nutrition_free}</option>
                    <option value="paid">{t.nutrition_paid}</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="field-label">{t.academicYear}</label>
                <input className="input" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2024-2025" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-sm btn-ghost" onClick={() => setShowStudentForm(false)}>{t.cancel}</button>
                <button className="btn btn-sm btn-primary" disabled={!form.studentId} onClick={addStudent}>{t.add}</button>
              </div>
            </div>
          )}
          {loading ? <div className="spinner" style={{ margin: "20px auto" }} /> : students.length === 0 ? (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 32 }}>{t.nutrition_no_data}</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={th}>{t.name}</th>
                <th style={th}>{t.nutrition_type}</th>
                <th style={th}>{t.academicYear}</th>
                {canEdit && <th style={th}>{t.actions}</th>}
              </tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td style={td}>{studentName(s.studentId)}</td>
                    <td style={td}>{s.nutritionType === "free" ? t.nutrition_free : t.nutrition_paid}</td>
                    <td style={td}>{s.academicYear ?? "—"}</td>
                    {canEdit && <td style={td}><button className="btn btn-sm btn-ghost" style={{ color: "var(--error)" }} onClick={() => removeStudent(s.id)}>{t.fm_delete}</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {subTab === "orders" && (
        <div>
          {canEdit && (
            <button className="btn btn-primary btn-sm" style={{ marginBottom: 12 }} onClick={() => setShowOrderForm(!showOrderForm)}>
              + {t.nutrition_add}
            </button>
          )}
          {showOrderForm && (
            <div className="card" style={{ padding: 16, marginBottom: 12, maxWidth: 480 }}>
              <div className="field">
                <label className="field-label">{t.nutrition_order_title}</label>
                <input className="input" value={orderForm.title} onChange={e => setOrderForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="field">
                <label className="field-label">URL {t.fm_upload}</label>
                <input className="input" value={orderForm.fileUrl} onChange={e => setOrderForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-sm btn-ghost" onClick={() => setShowOrderForm(false)}>{t.cancel}</button>
                <button className="btn btn-sm btn-primary" disabled={!orderForm.title} onClick={addOrder}>{t.add}</button>
              </div>
            </div>
          )}
          {orders.length === 0 ? (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 32 }}>{t.nutrition_no_data}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {orders.map(o => (
                <div key={o.id} className="card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{o.title}</div>
                    {o.fileUrl && <a href={o.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--primary)" }}>{t.ktp_open_pdf}</a>}
                  </div>
                  {canEdit && <button className="btn btn-sm btn-ghost" style={{ color: "var(--error)" }} onClick={() => removeOrder(o.id)}>{t.fm_delete}</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SpecialAttentionTab({ token, t, canEdit }: { token: string; t: Record<string, string>; canEdit: boolean }) {
  const [students, setStudents] = useState<SpecialStudent[]>([]);
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ studentId: "", reason: "" });
  const [showForm, setShowForm] = useState(false);
  const [docModal, setDocModal] = useState<string | null>(null);
  const [docForm, setDocForm] = useState({ title: "", fileUrl: "" });

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getSpecialAttentionStudents(token), api.getStudents(token)])
      .then(([s, all]) => { setStudents(s); setAllStudents(all); })
      .finally(() => setLoading(false));
  }, [token]);

  const studentName = (id: string) => allStudents.find(s => s.id === id)?.fullName ?? id;

  async function addStudent() {
    await api.upsertSpecialAttentionStudent(token, { studentId: form.studentId, reason: form.reason });
    const updated = await api.getSpecialAttentionStudents(token);
    setStudents(updated);
    setShowForm(false);
    setForm({ studentId: "", reason: "" });
  }

  async function removeStudent(id: string) {
    await api.removeSpecialAttentionStudent(token, id);
    setStudents(prev => prev.filter(s => s.id !== id));
  }

  async function addDoc() {
    if (!docModal) return;
    await api.addSpecialDocument(token, docModal, { title: docForm.title, fileUrl: docForm.fileUrl });
    const updated = await api.getSpecialAttentionStudents(token);
    setStudents(updated);
    setDocModal(null);
    setDocForm({ title: "", fileUrl: "" });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            + {t.special_add}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={async () => {
          const blob = await api.exportSpecialCsv(token);
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "special-students.csv";
          link.click();
        }}>{t.nutrition_download ?? "Скачать Excel"}</button>
      </div>
      {showForm && (
        <div className="card" style={{ padding: 16, marginBottom: 12, maxWidth: 480 }}>
          <div className="field">
            <label className="field-label">{t.students}</label>
            <select className="input" value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}>
              <option value="">—</option>
              {allStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">{t.special_reason}</label>
            <textarea className="input" style={{ minHeight: 80 }} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowForm(false)}>{t.cancel}</button>
            <button className="btn btn-sm btn-primary" disabled={!form.studentId || !form.reason} onClick={addStudent}>{t.add}</button>
          </div>
        </div>
      )}
      {loading ? <div className="spinner" style={{ margin: "20px auto" }} /> : students.length === 0 ? (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 32 }}>{t.special_no_data}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {students.map(s => (
            <div key={s.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{studentName(s.studentId)}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>{s.reason}</div>
                  {s.documents.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {s.documents.map((d, i) => (
                        <a key={i} href={d.fileUrl} target="_blank" rel="noreferrer"
                          style={{ fontSize: 12, padding: "2px 8px", background: "var(--bg-alt)", borderRadius: 4, color: "var(--primary)" }}>
                          {d.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {canEdit && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setDocModal(s.id)}>{t.special_add_doc}</button>
                    <button className="btn btn-sm btn-ghost" style={{ color: "var(--error)" }} onClick={() => removeStudent(s.id)}>{t.fm_delete}</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {docModal && (
        <div className="modal-overlay" onClick={() => setDocModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h3 style={{ margin: "0 0 16px" }}>{t.special_add_doc}</h3>
            <div className="field">
              <label className="field-label">{t.special_doc_title}</label>
              <input className="input" value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="field">
              <label className="field-label">{t.special_doc_url}</label>
              <input className="input" value={docForm.fileUrl} onChange={e => setDocForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-sm btn-ghost" onClick={() => setDocModal(null)}>{t.cancel}</button>
              <button className="btn btn-sm btn-primary" disabled={!docForm.title || !docForm.fileUrl} onClick={addDoc}>{t.add}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 12px", border: "1px solid var(--border)", background: "var(--bg-alt)", fontWeight: 600, fontSize: 13, textAlign: "left" };
const td: React.CSSProperties = { padding: "8px 12px", border: "1px solid var(--border)", fontSize: 13 };
