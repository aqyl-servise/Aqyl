"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { Language } from "../../lib/translations";

type Plan = Awaited<ReturnType<typeof api.getGiftedPlans>>[number];
type GiftedStudentEntry = Awaited<ReturnType<typeof api.getGiftedStudents>>[number];
type GiftedTeacher = Awaited<ReturnType<typeof api.getGiftedTeachers>>[number];
type TeacherStudent = Awaited<ReturnType<typeof api.getGiftedTeacherStudents>>[number];
type Material = Awaited<ReturnType<typeof api.getGiftedMaterials>>[number];
type StudentCard = Awaited<ReturnType<typeof api.getGiftedStudentCard>>;
type AllStudent = Awaited<ReturnType<typeof api.searchAllStudents>>[number];

const ACTIVE_TABS = ["work_plan", "students", "psychologist", "teachers"] as const;
const STUB_TABS = ["attestation", "bbjm", "ktp", "quality", "open_lessons", "welfare", "pedcouncil", "household"] as const;
const STUB_LABELS: Record<string, string> = {
  attestation: "Аттестация", bbjm: "ББЖМ", ktp: "КТП/ҚМЖ",
  quality: "Білім сапасы", open_lessons: "Открытые уроки", welfare: "Тәрбие жұмысы",
  pedcouncil: "Педсовет", household: "Шаруа істері",
};
const CATEGORIES = ["test_tasks", "online_lessons", "completed_work", "monitoring"] as const;
const CAT_LABELS: Record<string, string> = {
  test_tasks: "Тестовые задания", online_lessons: "Онлайн-уроки",
  completed_work: "Выполненная работа", monitoring: "Мониторинг",
};
const LEVELS = ["school", "district", "regional", "national", "international"];
const LEVEL_LABELS: Record<string, string> = {
  school: "Школьный", district: "Районный", regional: "Областной",
  national: "Республиканский", international: "Международный",
};
const DAY_LABELS = ["", "Пн", "Вт", "Ср", "Чт", "Пт"];

export function GiftedPanel({ token, language, t }: { token: string; language: Language; t: Record<string, string> }) {
  const [tab, setTab] = useState<string>("teachers");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const tabLabel: Record<string, string> = {
    work_plan: t.gifted_work_plan ?? "План работы",
    students: t.gifted_students_list ?? "Список учеников",
    psychologist: t.gifted_psychologist ?? "Анкеты психолога",
    teachers: t.gifted_teachers ?? "Учителя",
  };

  return (
    <div className="page">
      <h1 className="page-title">⭐ {t.nav_gifted}</h1>

      {toast && <div className="gifted-toast">{toast}</div>}

      {/* Tab bar */}
      <div className="gifted-tabs">
        {ACTIVE_TABS.map((key) => (
          <button key={key} className={`gifted-tab${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
            {tabLabel[key]}
          </button>
        ))}
        <div className="gifted-tabs-divider" />
        {STUB_TABS.map((key) => (
          <button key={key} className="gifted-tab stub" onClick={() => showToast(`«${STUB_LABELS[key]}» — ${t.coming_soon ?? "В разработке"}`)}>
            {STUB_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "work_plan" && <FilePlanTab token={token} planType="school_plan" t={t} />}
      {tab === "psychologist" && <FilePlanTab token={token} planType="psychologist" t={t} />}
      {tab === "students" && <StudentsTab token={token} t={t} />}
      {tab === "teachers" && <TeachersTab token={token} t={t} />}
    </div>
  );
}

// ── File Plan Tab (for "work_plan" and "psychologist") ──────────────────────
function FilePlanTab({ token, planType, t }: { token: string; planType: string; t: Record<string, string> }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getGiftedPlans(token, planType).then(setPlans).catch(console.error);
  }, [token, planType]);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !title.trim()) return;
    setBusy(true);
    try {
      const uploaded = await api.uploadFile(token, file);
      await api.createGiftedPlan(token, { type: planType, title, fileUrl: uploaded.url });
      setPlans(await api.getGiftedPlans(token, planType));
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
    } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    await api.deleteGiftedPlan(token, id);
    setPlans(await api.getGiftedPlans(token, planType));
  }

  return (
    <div className="card">
      <div className="gifted-upload-row">
        <input className="input" style={{ flex: 1 }} placeholder="Название документа..." value={title} onChange={(e) => setTitle(e.target.value)} />
        <input ref={fileRef} type="file" className="input file-input" accept=".pdf,.doc,.docx,.xlsx" style={{ width: 200 }} />
        <button className="btn btn-primary btn-sm" onClick={handleUpload} disabled={busy || !title.trim()}>
          {busy ? <span className="spinner" /> : "Загрузить"}
        </button>
      </div>
      {plans.length === 0 ? <p className="empty-state">{t.noData}</p> : (
        <table className="data-table">
          <thead><tr><th>Название</th><th>Дата</th><th>Загрузил</th><th>Файл</th><th></th></tr></thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td className="table-name">{p.title}</td>
                <td>{new Date(p.createdAt).toLocaleDateString("ru-RU")}</td>
                <td>{p.uploadedBy?.fullName ?? "—"}</td>
                <td>
                  {p.fileUrl
                    ? <a href={`http://localhost:4000${p.fileUrl}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">↓ Скачать</a>
                    : "—"}
                </td>
                <td><button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(p.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Students Tab ─────────────────────────────────────────────────────────────
function StudentsTab({ token, t }: { token: string; t: Record<string, string> }) {
  const [students, setStudents] = useState<GiftedStudentEntry[]>([]);
  const [classroomFilter, setClassroomFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [allStudents, setAllStudents] = useState<AllStudent[]>([]);
  const [search, setSearch] = useState("");

  const classrooms = [...new Set(students.map((s) => s.student.classroom.name))].sort();

  const filtered = students.filter((s) =>
    !classroomFilter || s.student.classroom.name === classroomFilter,
  );

  useEffect(() => {
    api.getGiftedStudents(token).then(setStudents).catch(console.error);
  }, [token]);

  async function openAdd() {
    setShowAdd(true);
    const all = await api.searchAllStudents(token);
    setAllStudents(all);
  }

  async function handleAdd(studentId: string) {
    await api.markGifted(token, studentId);
    setStudents(await api.getGiftedStudents(token));
    setShowAdd(false);
  }

  async function handleRemove(id: string) {
    await api.removeGiftedStudent(token, id);
    setStudents(await api.getGiftedStudents(token));
  }

  const filteredAll = allStudents.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.classroom.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="card">
      <div className="page-header" style={{ marginBottom: 8 }}>
        <div className="filter-row">
          <select className="input" style={{ width: 140 }} value={classroomFilter} onChange={(e) => setClassroomFilter(e.target.value)}>
            <option value="">Все классы</option>
            {classrooms.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ {t.gifted_add_student ?? "Добавить"}</button>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>Добавить одарённого ученика</h3>
            <input className="input" placeholder="🔍 Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {filteredAll.map((s) => (
                <div key={s.id} className="add-student-row" onClick={() => handleAdd(s.id)}>
                  <span>{s.fullName}</span>
                  <span className="muted">{s.classroom.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? <p className="empty-state">{t.noData}</p> : (
        <table className="data-table">
          <thead><tr><th>ФИО</th><th>Класс</th><th>Классный рук.</th><th></th></tr></thead>
          <tbody>
            {filtered.map((entry) => (
              <tr key={entry.id}>
                <td className="table-name">{entry.student.fullName}</td>
                <td>{entry.student.classroom.name}</td>
                <td>{entry.student.classroom.classTeacher?.fullName ?? "—"}</td>
                <td><button className="btn btn-ghost btn-sm danger" onClick={() => handleRemove(entry.id)}>Убрать</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Teachers Tab ─────────────────────────────────────────────────────────────
function TeachersTab({ token, t }: { token: string; t: Record<string, string> }) {
  const [teachers, setTeachers] = useState<GiftedTeacher[]>([]);
  const [expanded, setExpanded] = useState<Record<string, "plan" | "db" | "students" | null>>({});
  const [selectedStudent, setSelectedStudent] = useState<{ studentId: string; teacherName: string } | null>(null);

  useEffect(() => {
    api.getGiftedTeachers(token).then(setTeachers).catch(console.error);
  }, [token]);

  function toggle(teacherId: string, panel: "plan" | "db" | "students") {
    setExpanded((prev) => ({
      ...prev,
      [teacherId]: prev[teacherId] === panel ? null : panel,
    }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {teachers.map((teacher) => (
        <div key={teacher.id} className="card" style={{ gap: 0, padding: 0, overflow: "hidden" }}>
          {/* Teacher header row */}
          <div className="gifted-teacher-row">
            <div className="gifted-teacher-info">
              <span className="gifted-teacher-name">{teacher.fullName}</span>
              <span className="gifted-teacher-subject muted">{teacher.subject ?? "—"}</span>
            </div>
            <div className="gifted-teacher-stats muted">
              <span>Учеников: {teacher.giftedCount}</span>
              <span>Материалов: {teacher.materialCount}</span>
            </div>
            <div className="gifted-teacher-actions">
              <button className={`btn btn-sm ${expanded[teacher.id] === "plan" ? "btn-primary" : "btn-outline"}`}
                onClick={() => toggle(teacher.id, "plan")}>
                {t.gifted_work_plan_btn ?? "ПЛАН РАБОТЫ"}
              </button>
              <button className={`btn btn-sm ${expanded[teacher.id] === "db" ? "btn-primary" : "btn-outline"}`}
                onClick={() => toggle(teacher.id, "db")}>
                {t.gifted_db_btn ?? "БАЗА ДАННЫХ"}
              </button>
              <button className={`btn btn-sm ${expanded[teacher.id] === "students" ? "btn-primary" : "btn-outline"}`}
                onClick={() => toggle(teacher.id, "students")}>
                {t.gifted_students_btn ?? "УЧЕНИКИ"}
              </button>
            </div>
          </div>

          {/* Expanded panels */}
          {expanded[teacher.id] === "plan" && (
            <div className="gifted-expand-panel">
              <TeacherPlanPanel token={token} teacherId={teacher.id} t={t} onUpdate={() => api.getGiftedTeachers(token).then(setTeachers)} />
            </div>
          )}
          {expanded[teacher.id] === "db" && (
            <div className="gifted-expand-panel">
              <DatabasePanel token={token} teacherId={teacher.id} t={t} />
            </div>
          )}
          {expanded[teacher.id] === "students" && (
            <div className="gifted-expand-panel">
              <TeacherStudentsPanel
                token={token} teacherId={teacher.id} teacherName={teacher.fullName} t={t}
                onViewCard={(studentId) => setSelectedStudent({ studentId, teacherName: teacher.fullName })}
                onUpdate={() => api.getGiftedTeachers(token).then(setTeachers)}
              />
            </div>
          )}
        </div>
      ))}

      {selectedStudent && (
        <StudentCardModal
          token={token} studentId={selectedStudent.studentId}
          onClose={() => setSelectedStudent(null)} t={t}
        />
      )}
    </div>
  );
}

// ── Teacher Plan Panel ────────────────────────────────────────────────────────
function TeacherPlanPanel({ token, teacherId, t, onUpdate }: { token: string; teacherId: string; t: Record<string, string>; onUpdate: () => void }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getGiftedMaterials(token, teacherId, "work_plan").then(setMaterials).catch(console.error);
  }, [teacherId, token]);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!title.trim()) return;
    setBusy(true);
    try {
      let fileUrl: string | undefined;
      if (file) {
        const up = await api.uploadFile(token, file);
        fileUrl = up.url;
      }
      await api.addGiftedMaterial(token, { teacherId, category: "work_plan", title, fileUrl });
      setMaterials(await api.getGiftedMaterials(token, teacherId, "work_plan"));
      setTitle(""); if (fileRef.current) fileRef.current.value = "";
      onUpdate();
    } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    await api.deleteGiftedMaterial(token, id);
    setMaterials(await api.getGiftedMaterials(token, teacherId, "work_plan"));
    onUpdate();
  }

  return (
    <div>
      <div className="gifted-upload-row">
        <input className="input" style={{ flex: 1 }} placeholder="Название документа..." value={title} onChange={(e) => setTitle(e.target.value)} />
        <input ref={fileRef} type="file" className="input file-input" accept=".pdf,.doc,.docx" style={{ width: 180 }} />
        <button className="btn btn-primary btn-sm" onClick={handleUpload} disabled={busy || !title.trim()}>
          {busy ? <span className="spinner" /> : "Загрузить"}
        </button>
      </div>
      {materials.length === 0 ? <p className="empty-state" style={{ margin: "8px 0" }}>{t.noData}</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {materials.map((m) => (
            <div key={m.id} className="gifted-file-row">
              <span>📄 {m.title}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {m.fileUrl && <a href={`http://localhost:4000${m.fileUrl}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">↓</a>}
                <button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(m.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Database Panel (4 categories) ─────────────────────────────────────────────
function DatabasePanel({ token, teacherId, t }: { token: string; teacherId: string; t: Record<string, string> }) {
  const [activeCategory, setActiveCategory] = useState<string>("test_tasks");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getGiftedMaterials(token, teacherId, activeCategory).then(setMaterials).catch(console.error);
  }, [teacherId, token, activeCategory]);

  async function handleAdd() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      let fileUrl: string | undefined;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const up = await api.uploadFile(token, file);
        fileUrl = up.url;
      }
      await api.addGiftedMaterial(token, {
        teacherId, category: activeCategory, title,
        fileUrl, linkUrl: linkUrl || undefined,
      });
      setMaterials(await api.getGiftedMaterials(token, teacherId, activeCategory));
      setTitle(""); setLinkUrl(""); if (fileRef.current) fileRef.current.value = "";
    } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    await api.deleteGiftedMaterial(token, id);
    setMaterials(await api.getGiftedMaterials(token, teacherId, activeCategory));
  }

  return (
    <div>
      <div className="gifted-cat-tabs">
        {CATEGORIES.map((cat) => (
          <button key={cat} className={`gifted-cat-tab${activeCategory === cat ? " active" : ""}`}
            onClick={() => setActiveCategory(cat)}>
            {CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="gifted-upload-row" style={{ marginTop: 10 }}>
        <input className="input" style={{ flex: 1 }} placeholder="Название..." value={title} onChange={(e) => setTitle(e.target.value)} />
        {activeCategory === "online_lessons"
          ? <input className="input" style={{ flex: 1 }} placeholder="URL ссылки..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          : <input ref={fileRef} type="file" className="input file-input" accept=".pdf,.doc,.docx,.xlsx" style={{ width: 180 }} />
        }
        <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={busy || !title.trim()}>
          {busy ? <span className="spinner" /> : t.add ?? "Добавить"}
        </button>
      </div>

      {materials.length === 0 ? <p className="empty-state" style={{ margin: "8px 0" }}>{t.noData}</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {materials.map((m) => (
            <div key={m.id} className="gifted-file-row">
              <span>{activeCategory === "online_lessons" ? "🔗" : "📄"} {m.title}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {m.fileUrl && <a href={`http://localhost:4000${m.fileUrl}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">↓</a>}
                {m.linkUrl && <a href={m.linkUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Открыть</a>}
                <button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(m.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Teacher Students Panel ─────────────────────────────────────────────────────
function TeacherStudentsPanel({ token, teacherId, teacherName, t, onViewCard, onUpdate }: {
  token: string; teacherId: string; teacherName: string; t: Record<string, string>;
  onViewCard: (studentId: string) => void; onUpdate: () => void;
}) {
  const [assignments, setAssignments] = useState<TeacherStudent[]>([]);
  const [allStudents, setAllStudents] = useState<AllStudent[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.getGiftedTeacherStudents(token, teacherId).then(setAssignments).catch(console.error);
  }, [teacherId, token]);

  async function openAdd() {
    setShowAdd(true);
    const all = await api.searchAllStudents(token);
    setAllStudents(all);
  }

  async function handleAdd(studentId: string) {
    await api.markGifted(token, studentId);
    await api.addGiftedAssignment(token, teacherId, studentId);
    setAssignments(await api.getGiftedTeacherStudents(token, teacherId));
    setShowAdd(false); onUpdate();
  }

  async function handleRemove(assignmentId: string) {
    await api.removeGiftedAssignment(token, assignmentId);
    setAssignments(await api.getGiftedTeacherStudents(token, teacherId));
    onUpdate();
  }

  const filteredAll = allStudents.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.classroom.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ {t.gifted_add_student ?? "Добавить ученика"}</button>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>Добавить ученика к {teacherName}</h3>
            <input className="input" placeholder="🔍 Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {filteredAll.map((s) => (
                <div key={s.id} className="add-student-row" onClick={() => handleAdd(s.id)}>
                  <span>{s.fullName}</span>
                  <span className="muted">{s.classroom.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {assignments.length === 0 ? <p className="empty-state">{t.noData}</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {assignments.map((a) => (
            <div key={a.id} className="gifted-student-row">
              <button className="gifted-student-name-btn" onClick={() => onViewCard(a.student.id)}>
                {a.student.fullName}
              </button>
              <span className="muted">{a.student.classroom.name}</span>
              <button className="btn btn-ghost btn-sm danger" onClick={() => handleRemove(a.id)}>Убрать</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Student Card Modal ─────────────────────────────────────────────────────────
function StudentCardModal({ token, studentId, onClose, t }: { token: string; studentId: string; onClose: () => void; t: Record<string, string> }) {
  const [card, setCard] = useState<StudentCard | null>(null);
  const [showAddAch, setShowAddAch] = useState(false);

  useEffect(() => {
    api.getGiftedStudentCard(token, studentId).then(setCard).catch(console.error);
  }, [token, studentId]);

  async function handleAddAchievement(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api.addGiftedAchievement(token, {
      studentId,
      title: String(fd.get("title")),
      date: String(fd.get("date")) || undefined,
      level: String(fd.get("level")),
      subject: String(fd.get("subject")) || undefined,
      place: String(fd.get("place")) || undefined,
    });
    setCard(await api.getGiftedStudentCard(token, studentId));
    setShowAddAch(false);
  }

  async function handleDeleteAch(id: string) {
    await api.deleteGiftedAchievement(token, id);
    setCard(await api.getGiftedStudentCard(token, studentId));
  }

  if (!card) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card"><p className="empty-state">{t.loading ?? "Загрузка..."}</p></div>
    </div>
  );

  const scheduleByDay: Record<number, typeof card.schedule> = {};
  for (const s of card.schedule) {
    if (!scheduleByDay[s.dayOfWeek]) scheduleByDay[s.dayOfWeek] = [];
    scheduleByDay[s.dayOfWeek].push(s);
  }

  const avgScore = card.grades.length
    ? Math.round(card.grades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / card.grades.length)
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card student-card-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="student-card-header">
          <div className="profile-avatar">{card.fullName.charAt(0)}</div>
          <div>
            <h2 style={{ margin: 0 }}>{card.fullName}</h2>
            <p className="muted" style={{ margin: "2px 0 0" }}>
              {card.classroom.name} класс · Кл. рук.: {card.classroom.classTeacher?.fullName ?? "—"}
            </p>
            {avgScore !== null && (
              <span className={`score-chip ${avgScore < 60 ? "score-low" : avgScore < 80 ? "score-mid" : "score-high"}`} style={{ marginTop: 6, display: "inline-block" }}>
                Ср. балл: {avgScore}%
              </span>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onClose}>✕</button>
        </div>

        <div className="student-card-body">
          {/* Schedule */}
          {card.schedule.length > 0 && (
            <section>
              <h4 className="student-card-section-title">📅 Расписание</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Урок</th>
                    {[1, 2, 3, 4, 5].map((d) => <th key={d}>{DAY_LABELS[d]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((period) => {
                    const hasAny = [1, 2, 3, 4, 5].some((d) => scheduleByDay[d]?.find((s) => s.period === period));
                    if (!hasAny) return null;
                    return (
                      <tr key={period}>
                        <td className="muted">{period}</td>
                        {[1, 2, 3, 4, 5].map((day) => {
                          const slot = scheduleByDay[day]?.find((s) => s.period === period);
                          return <td key={day}>{slot ? slot.subject : ""}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {/* Grades */}
          {card.grades.length > 0 && (
            <section>
              <h4 className="student-card-section-title">📊 Успеваемость</h4>
              <table className="data-table">
                <thead><tr><th>Тема</th><th>Балл</th><th>%</th></tr></thead>
                <tbody>
                  {card.grades.map((g, i) => {
                    const pct = Math.round((g.score / g.maxScore) * 100);
                    return (
                      <tr key={i}>
                        <td>{g.topic}</td>
                        <td>{g.score}/{g.maxScore}</td>
                        <td><span className={`score-chip ${pct < 60 ? "score-low" : pct < 80 ? "score-mid" : "score-high"}`}>{pct}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {/* Achievements */}
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h4 className="student-card-section-title" style={{ margin: 0 }}>🏆 {t.gifted_achievements ?? "Достижения"}</h4>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddAch(!showAddAch)}>+ Добавить</button>
            </div>

            {showAddAch && (
              <form onSubmit={handleAddAchievement} className="form-stack" style={{ marginBottom: 12 }}>
                <div className="form-row">
                  <div className="field"><label className="field-label">Название</label><input name="title" className="input" required /></div>
                  <div className="field"><label className="field-label">Предмет</label><input name="subject" className="input" /></div>
                </div>
                <div className="form-row">
                  <div className="field"><label className="field-label">Дата</label><input name="date" type="date" className="input" /></div>
                  <div className="field"><label className="field-label">Место</label><input name="place" className="input" placeholder="1 место" /></div>
                </div>
                <div className="field">
                  <label className="field-label">Уровень</label>
                  <select name="level" className="input">
                    {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <button className="btn btn-primary btn-sm">Сохранить</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddAch(false)}>Отмена</button>
                </div>
              </form>
            )}

            {card.achievements.length === 0 ? <p className="empty-state">{t.noData}</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {card.achievements.map((a) => (
                  <div key={a.id} className="gifted-file-row">
                    <div>
                      <span className="table-name">{a.title}</span>
                      {a.subject && <span className="muted"> · {a.subject}</span>}
                      {a.place && <span> · {a.place}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="badge badge-sm">{LEVEL_LABELS[a.level] ?? a.level}</span>
                      {a.date && <span className="muted" style={{ fontSize: 12 }}>{new Date(a.date).toLocaleDateString("ru-RU")}</span>}
                      <button className="btn btn-ghost btn-sm danger" onClick={() => handleDeleteAch(a.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
