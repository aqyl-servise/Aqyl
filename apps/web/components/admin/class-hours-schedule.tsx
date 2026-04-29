"use client";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { api, ClassroomOption } from "../../lib/api";
import { Language } from "../../lib/translations";

type ScheduleItem = {
  id: string; title?: string; topic: string; dayOfWeek?: string; time?: string;
  date?: string; status: string; comment?: string; notes?: string; duration?: number;
  classTeacher?: { id: string; fullName: string };
  classroom?: { id: string; name: string; grade: number };
};

type HistoryItem = { id: string; changeDescription?: string; createdAt: string; changedBy?: { fullName: string } };

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const DAY_LABELS_RU: Record<string, string> = {
  monday: "Понедельник", tuesday: "Вторник", wednesday: "Среда",
  thursday: "Четверг", friday: "Пятница",
};
const DAY_LABELS_KZ: Record<string, string> = {
  monday: "Дүйсенбі", tuesday: "Сейсенбі", wednesday: "Сәрсенбі",
  thursday: "Бейсенбі", friday: "Жұма",
};
const DAY_OPTIONS_RU = DAYS.map((d) => ({ value: d, label: DAY_LABELS_RU[d] }));

const STATUS_LABELS: Record<string, string> = {
  planned: "Запланирован", conducted: "Проведён", rescheduled: "Перенесён",
};
const STATUS_COLORS: Record<string, string> = {
  planned: "#3b82f6", conducted: "#22c55e", rescheduled: "#f97316",
};

const TOPIC_LABELS: Record<string, string> = {
  education: "Тәрбие", law: "Құқық", circle: "Үйірме", apko: "АПҚО", other: "Прочее",
};

interface Props {
  token: string;
  language: Language;
  isAdmin: boolean;
}

interface FormState {
  id?: string;
  dayOfWeek: string;
  time: string;
  classroomId: string;
  title: string;
  comment: string;
  status: string;
  topic: string;
}

const EMPTY_FORM: FormState = {
  dayOfWeek: "monday", time: "", classroomId: "", title: "", comment: "", status: "planned", topic: "other",
};

export function ClassHoursSchedulePanel({ token, language, isAdmin }: Props) {
  const [hours, setHours] = useState<ScheduleItem[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [filterDay, setFilterDay] = useState<string>("all");
  const [filterClassroom, setFilterClassroom] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formBusy, setFormBusy] = useState(false);
  const [history, setHistory] = useState<{ id: string; items: HistoryItem[] } | null>(null);

  function reload() {
    api.getClassHoursSchedule(token).then(setHours).catch(console.error);
  }

  useEffect(() => {
    reload();
    api.getClassroomsForDropdown(token).then(setClassrooms).catch(console.error);
  }, [token]);

  const filtered = hours.filter((h) => {
    if (filterDay !== "all" && h.dayOfWeek !== filterDay) return false;
    if (filterClassroom !== "all" && h.classroom?.id !== filterClassroom) return false;
    return true;
  });

  function grouped() {
    return DAYS.reduce((acc, day) => {
      acc[day] = filtered.filter((h) => h.dayOfWeek === day)
        .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
      return acc;
    }, {} as Record<string, ScheduleItem[]>);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(item: ScheduleItem) {
    setForm({
      id: item.id,
      dayOfWeek: item.dayOfWeek ?? "monday",
      time: item.time ?? "",
      classroomId: item.classroom?.id ?? "",
      title: item.title ?? "",
      comment: item.comment ?? "",
      status: item.status ?? "planned",
      topic: item.topic ?? "other",
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.classroomId) { alert("Выберите класс"); return; }
    setFormBusy(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title || undefined,
        topic: form.topic,
        dayOfWeek: form.dayOfWeek,
        time: form.time || undefined,
        comment: form.comment || undefined,
        status: form.status,
        classroomId: form.classroomId,
      };
      if (form.id) {
        await api.updateClassHour(token, form.id, payload);
      } else {
        await api.createClassHour(token, payload);
      }
      setShowForm(false);
      reload();
    } catch (e) { alert((e as Error).message); }
    finally { setFormBusy(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить классный час?")) return;
    await api.deleteClassHour(token, id);
    reload();
  }

  async function handleMarkConducted(id: string) {
    await api.updateClassHour(token, id, { status: "conducted", changeDescription: "Отмечено как проведённое" });
    reload();
  }

  async function showHistoryFor(id: string) {
    const items = await api.getClassHourHistory(token, id);
    setHistory({ id, items });
  }

  function exportExcel() {
    const rows: unknown[] = [];
    for (const day of DAYS) {
      for (const h of grouped()[day] ?? []) {
        rows.push({
          "День": DAY_LABELS_RU[day],
          "Время": h.time ?? "",
          "Класс": h.classroom?.name ?? "",
          "Классный руководитель": h.classTeacher?.fullName ?? "",
          "Тема": h.title ?? "",
          "Тип": TOPIC_LABELS[h.topic] ?? h.topic,
          "Статус": STATUS_LABELS[h.status] ?? h.status,
          "Комментарий": h.comment ?? "",
        });
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Сынып сағаты");
    XLSX.writeFile(wb, "class-hours-schedule.xlsx");
  }

  function exportPrint() {
    window.print();
  }

  const g = grouped();
  const dayLabels = language === "kz" ? DAY_LABELS_KZ : DAY_LABELS_RU;

  return (
    <div style={{ marginTop: 0 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, alignItems: "center" }}>
        {!isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Добавить</button>
        )}
        <select className="input" style={{ width: "auto" }} value={filterDay}
          onChange={(e) => setFilterDay(e.target.value)}>
          <option value="all">Все дни</option>
          {DAY_OPTIONS_RU.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <select className="input" style={{ width: "auto" }} value={filterClassroom}
          onChange={(e) => setFilterClassroom(e.target.value)}>
          <option value="all">Все классы</option>
          {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn btn-outline btn-sm" onClick={exportExcel}>📊 Excel</button>
          <button className="btn btn-outline btn-sm" onClick={exportPrint}>🖨️ Печать</button>
        </div>
      </div>

      {/* Week grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 8,
        minWidth: 0,
      }}>
        {DAYS.map((day) => (
          <div key={day} style={{ minWidth: 0 }}>
            <div style={{
              background: "var(--primary, #2563eb)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: "6px 6px 0 0",
              textAlign: "center",
            }}>
              {dayLabels[day]}
            </div>
            <div style={{
              border: "1px solid var(--border, #e5e7eb)",
              borderTop: "none",
              borderRadius: "0 0 6px 6px",
              minHeight: 80,
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              background: "var(--card-bg, #fff)",
            }}>
              {g[day].length === 0 && (
                <p style={{ fontSize: 11, color: "var(--muted, #9ca3af)", textAlign: "center", margin: "12px 0" }}>—</p>
              )}
              {g[day].map((h) => (
                <ClassHourCard
                  key={h.id}
                  item={h}
                  isAdmin={isAdmin}
                  onEdit={() => openEdit(h)}
                  onDelete={() => handleDelete(h.id)}
                  onMarkConducted={() => handleMarkConducted(h.id)}
                  onHistory={() => showHistoryFor(h.id)}
                />
              ))}
              {!isAdmin && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, padding: "2px 6px", marginTop: 2 }}
                  onClick={() => { setForm({ ...EMPTY_FORM, dayOfWeek: day }); setShowForm(true); }}>
                  + Добавить
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>{form.id ? "Редактировать" : "Новый классный час"}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="form-stack">
              <div className="form-row">
                <div className="field">
                  <label className="field-label">День недели</label>
                  <select className="input" value={form.dayOfWeek}
                    onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}>
                    {DAY_OPTIONS_RU.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Время</label>
                  <input className="input" type="time" value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Класс</label>
                <select className="input" value={form.classroomId}
                  onChange={(e) => setForm((f) => ({ ...f, classroomId: e.target.value }))}>
                  <option value="">— Выбрать —</option>
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Тема (необязательно)</label>
                <input className="input" value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Тема классного часа" />
              </div>
              <div className="form-row">
                <div className="field">
                  <label className="field-label">Тип</label>
                  <select className="input" value={form.topic}
                    onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}>
                    {Object.entries(TOPIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Статус</label>
                  <select className="input" value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="planned">Запланирован</option>
                    <option value="conducted">Проведён</option>
                    <option value="rescheduled">Перенесён</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Комментарий (необязательно)</label>
                <textarea className="textarea" rows={2} value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
              </div>
              <div className="form-row">
                <button className="btn btn-primary" disabled={formBusy} onClick={handleSubmit}>
                  {formBusy ? <span className="spinner" /> : "Сохранить"}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {history && (
        <div className="modal-overlay" onClick={() => setHistory(null)}>
          <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>История изменений</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setHistory(null)}>✕</button>
            </div>
            {history.items.length === 0 ? (
              <p className="muted">Нет изменений</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.items.map((hi) => (
                  <div key={hi.id} style={{ padding: "8px 10px", background: "var(--surface)", borderRadius: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{hi.changeDescription ?? "Изменение"}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {hi.changedBy?.fullName ?? "—"} · {new Date(hi.createdAt).toLocaleString("ru-RU")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClassHourCard({
  item, isAdmin, onEdit, onDelete, onMarkConducted, onHistory,
}: {
  item: ScheduleItem;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMarkConducted: () => void;
  onHistory: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = STATUS_COLORS[item.status] ?? "#9ca3af";

  return (
    <div style={{
      border: `2px solid ${statusColor}22`,
      borderLeft: `3px solid ${statusColor}`,
      borderRadius: 6,
      padding: "6px 8px",
      background: `${statusColor}08`,
      cursor: "pointer",
    }} onClick={() => setExpanded((v) => !v)}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {item.time && (
          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{item.time}</span>
        )}
        <span style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>
          {item.classroom?.name ?? "—"}
        </span>
        <span style={{
          fontSize: 10, padding: "1px 5px", borderRadius: 10,
          background: `${statusColor}22`, color: statusColor, fontWeight: 600,
        }}>
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
      </div>
      {item.title && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{item.title}</div>
      )}
      {isAdmin && item.classTeacher && (
        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{item.classTeacher.fullName}</div>
      )}

      {expanded && (
        <div style={{ marginTop: 6, borderTop: "1px solid var(--border)", paddingTop: 6 }}
          onClick={(e) => e.stopPropagation()}>
          {item.comment && <div style={{ fontSize: 11, marginBottom: 6 }}>{item.comment}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 8px" }} onClick={onEdit}>
              ✏️ Изменить
            </button>
            {item.status === "planned" && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 8px", color: "#22c55e" }}
                onClick={onMarkConducted}>
                ✓ Провести
              </button>
            )}
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 8px" }} onClick={onHistory}>
              📋 История
            </button>
            <button className="btn btn-ghost btn-sm"
              style={{ fontSize: 10, padding: "2px 8px", color: "var(--danger, #ef4444)" }}
              onClick={onDelete}>
              🗑️ Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
