"use client";
import { useState, useEffect } from "react";
import { api, FLTask, FLAssignment, FLSubmission } from "../../lib/api";
import { Language, translations } from "../../lib/translations";

type Tab = "bank" | "works" | "analytics";

const DIRECTIONS = [
  { value: "", label: "Все" },
  { value: "reading", label: "Чтение" },
  { value: "math", label: "Математика" },
  { value: "science", label: "Наука" },
];
const DIFFICULTIES = [
  { value: "", label: "Все" },
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
];
const TASK_TYPES = [
  { value: "test", label: "Тест" },
  { value: "open", label: "Открытый ответ" },
  { value: "practical", label: "Практическое" },
];
const FORMATS = [
  { value: "test", label: "Тест" },
  { value: "text_work", label: "Текстовая работа" },
  { value: "practical", label: "Практическая" },
];

function dirBadge(dir?: string) {
  const map: Record<string, { label: string; color: string }> = {
    reading: { label: "📖 Чтение", color: "#3b82f6" },
    math: { label: "🔢 Математика", color: "#8b5cf6" },
    science: { label: "🔬 Наука", color: "#10b981" },
  };
  const d = dir ? map[dir] : null;
  if (!d) return null;
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: d.color + "20", color: d.color, fontWeight: 600 }}>{d.label}</span>;
}

function diffBadge(diff?: string) {
  const map: Record<string, { label: string; color: string }> = {
    low: { label: "Низкий", color: "#10b981" },
    medium: { label: "Средний", color: "#f59e0b" },
    high: { label: "Высокий", color: "#ef4444" },
  };
  const d = diff ? map[diff] : null;
  if (!d) return null;
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: d.color + "20", color: d.color, fontWeight: 600 }}>{d.label}</span>;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: "Черновик", color: "#6b7280" },
    published: { label: "Опубликовано", color: "#10b981" },
    closed: { label: "Закрыто", color: "#ef4444" },
  };
  const d = map[status] ?? { label: status, color: "#6b7280" };
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: d.color + "20", color: d.color, fontWeight: 600 }}>{d.label}</span>;
}

function subStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    in_progress: { label: "В процессе", color: "#f59e0b" },
    submitted: { label: "Отправлено", color: "#3b82f6" },
    graded: { label: "Оценено", color: "#10b981" },
  };
  const d = map[status] ?? { label: status, color: "#6b7280" };
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: d.color + "20", color: d.color, fontWeight: 600 }}>{d.label}</span>;
}

// ── Add Task Modal ────────────────────────────────────────────────────────────
function AddTaskModal({ token, onClose, onSaved, initialData }: {
  token: string;
  onClose: () => void;
  onSaved: (task: FLTask) => void;
  initialData?: Partial<FLTask>;
}) {
  const [form, setForm] = useState<Partial<FLTask>>({
    title: "", description: "", subject: "", grade: undefined,
    direction: "reading", difficulty: "medium", taskType: "test",
    options: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }],
    ...initialData,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FLTask, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const isTest = form.taskType === "test";

  const addOption = () => set("options", [...(form.options ?? []), { text: "", isCorrect: false }]);
  const setOption = (i: number, k: "text" | "isCorrect", v: string | boolean) => {
    const opts = [...(form.options ?? [])];
    opts[i] = { ...opts[i], [k]: v };
    if (k === "isCorrect" && v === true) {
      opts.forEach((o, j) => { if (j !== i) o.isCorrect = false; });
    }
    set("options", opts);
  };
  const removeOption = (i: number) => set("options", (form.options ?? []).filter((_, j) => j !== i));

  async function handleSave() {
    if (!form.title?.trim() || !form.description?.trim()) return;
    setSaving(true);
    try {
      const saved = await api.flCreateTask(token, { ...form, source: "teacher" });
      onSaved(saved);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>Добавить задание</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="input" placeholder="Название задания *" value={form.title ?? ""} onChange={e => set("title", e.target.value)} />
          <textarea className="input" placeholder="Текст задания / вопрос *" rows={4} value={form.description ?? ""} onChange={e => set("description", e.target.value)} style={{ resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Предмет" value={form.subject ?? ""} onChange={e => set("subject", e.target.value)} />
            <input className="input" style={{ width: 80 }} type="number" placeholder="Класс" min={1} max={11} value={form.grade ?? ""} onChange={e => set("grade", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="input" style={{ flex: 1 }} value={form.direction ?? "reading"} onChange={e => set("direction", e.target.value)}>
              {DIRECTIONS.filter(d => d.value).map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <select className="input" style={{ flex: 1 }} value={form.difficulty ?? "medium"} onChange={e => set("difficulty", e.target.value)}>
              {DIFFICULTIES.filter(d => d.value).map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <select className="input" style={{ flex: 1 }} value={form.taskType ?? "test"} onChange={e => set("taskType", e.target.value as FLTask["taskType"])}>
              {TASK_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          {isTest ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>Варианты ответов</span>
                <button className="btn btn-outline btn-sm" onClick={addOption}>+ Добавить</button>
              </div>
              {(form.options ?? []).map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <input type="radio" checked={opt.isCorrect} onChange={() => setOption(i, "isCorrect", true)} title="Правильный" />
                  <input className="input" style={{ flex: 1 }} placeholder={`Вариант ${i + 1}`} value={opt.text} onChange={e => setOption(i, "text", e.target.value)} />
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => removeOption(i)}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <textarea className="input" placeholder="Эталонный ответ (необязательно)" rows={2} value={form.correctAnswer ?? ""} onChange={e => set("correctAnswer", e.target.value)} style={{ resize: "vertical" }} />
          )}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? "Сохранение..." : "Сохранить"}</button>
        </div>
      </div>
    </div>
  );
}

// ── AI Generate Modal ─────────────────────────────────────────────────────────
function AiGenerateModal({ token, onClose, onGenerated }: {
  token: string;
  onClose: () => void;
  onGenerated: (data: Partial<FLTask>) => void;
}) {
  const [form, setForm] = useState({ topic: "", subject: "", grade: 5, direction: "reading", difficulty: "medium", taskType: "test" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Partial<FLTask> | null>(null);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function generate() {
    if (!form.topic.trim()) return;
    setLoading(true);
    try {
      const res = await api.flGenerateTask(token, { ...form, grade: Number(form.grade) });
      setResult(res);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>🤖 Сгенерировать задание с ИИ</h3>
        {!result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="input" placeholder="Тема *" value={form.topic} onChange={e => set("topic", e.target.value)} />
            <input className="input" placeholder="Предмет" value={form.subject} onChange={e => set("subject", e.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" style={{ width: 80 }} type="number" min={1} max={11} value={form.grade} onChange={e => set("grade", e.target.value)} placeholder="Класс" />
              <select className="input" style={{ flex: 1 }} value={form.direction} onChange={e => set("direction", e.target.value)}>
                {DIRECTIONS.filter(d => d.value).map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <select className="input" style={{ flex: 1 }} value={form.difficulty} onChange={e => set("difficulty", e.target.value)}>
                {DIFFICULTIES.filter(d => d.value).map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <select className="input" style={{ flex: 1 }} value={form.taskType} onChange={e => set("taskType", e.target.value)}>
                {TASK_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
              <button className="btn btn-primary" disabled={loading || !form.topic.trim()} onClick={generate}>
                {loading ? "Генерирую..." : "🤖 Сгенерировать"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 12, padding: 12, background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{result.title}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "pre-wrap" }}>{result.description}</div>
              {result.options && (
                <div style={{ marginTop: 8 }}>
                  {result.options.map((o, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                      <span style={{ color: o.isCorrect ? "#10b981" : "var(--muted)", fontWeight: o.isCorrect ? 700 : 400 }}>{o.isCorrect ? "✓" : "○"}</span>
                      <span style={{ fontSize: 13 }}>{o.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {result.correctAnswer && <div style={{ marginTop: 8, fontSize: 13, color: "#10b981" }}>✓ {result.correctAnswer}</div>}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setResult(null)}>Изменить параметры</button>
              <button className="btn btn-outline" onClick={onClose}>Отмена</button>
              <button className="btn btn-primary" onClick={() => { onGenerated({ ...result, direction: form.direction as FLTask["direction"], difficulty: form.difficulty as FLTask["difficulty"], taskType: form.taskType as FLTask["taskType"], subject: form.subject, grade: Number(form.grade), source: "ai" }); onClose(); }}>
                Редактировать и сохранить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create Assignment Modal ───────────────────────────────────────────────────
function CreateAssignmentModal({ token, tasks, onClose, onSaved }: {
  token: string;
  tasks: FLTask[];
  onClose: () => void;
  onSaved: (a: FLAssignment) => void;
}) {
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ title: "", description: "", classroomId: "", format: "test", timeLimit: "", dueDate: "" });
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [taskSearch, setTaskSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getClassrooms(token).then(data => setClassrooms(data)).catch(() => {});
  }, [token]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const toggleTask = (id: string) => setSelectedTaskIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(taskSearch.toLowerCase()));

  async function handleSave() {
    if (!form.title.trim() || !form.classroomId) return;
    setSaving(true);
    try {
      const saved = await api.flCreateAssignment(token, {
        title: form.title, description: form.description || undefined,
        classroomId: form.classroomId,
        format: form.format as FLAssignment["format"],
        timeLimit: form.timeLimit ? Number(form.timeLimit) : undefined,
        dueDate: form.dueDate || undefined,
        tasks: selectedTaskIds,
      });
      onSaved(saved);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 620, maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>Создать работу</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="input" placeholder="Название работы *" value={form.title} onChange={e => set("title", e.target.value)} />
          <textarea className="input" placeholder="Описание" rows={2} value={form.description} onChange={e => set("description", e.target.value)} style={{ resize: "vertical" }} />
          <select className="input" value={form.classroomId} onChange={e => set("classroomId", e.target.value)}>
            <option value="">Выберите класс *</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <select className="input" style={{ flex: 1 }} value={form.format} onChange={e => set("format", e.target.value)}>
              {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <input className="input" style={{ width: 120 }} type="number" placeholder="Время (мин)" min={1} value={form.timeLimit} onChange={e => set("timeLimit", e.target.value)} />
            <input className="input" type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} style={{ flex: 1 }} />
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 500, fontSize: 13 }}>Выбрать задания ({selectedTaskIds.length})</span>
              <input className="input" style={{ flex: 1, maxWidth: 220 }} placeholder="🔍 Поиск..." value={taskSearch} onChange={e => setTaskSearch(e.target.value)} />
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {filteredTasks.length === 0 ? <p className="fm-empty" style={{ padding: 8 }}>Нет заданий</p> : filteredTasks.map(t => (
                <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", cursor: "pointer", borderRadius: 4, background: selectedTaskIds.includes(t.id) ? "var(--surface)" : undefined }}>
                  <input type="checkbox" checked={selectedTaskIds.includes(t.id)} onChange={() => toggleTask(t.id)} />
                  <span style={{ fontSize: 13, flex: 1 }}>{t.title}</span>
                  {dirBadge(t.direction)}
                </label>
              ))}
            </div>
            {selectedTaskIds.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
                Выбрано: {selectedTaskIds.map(id => tasks.find(t => t.id === id)?.title).filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={saving || !form.title.trim() || !form.classroomId} onClick={handleSave}>
            {saving ? "Создание..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Grade Modal ───────────────────────────────────────────────────────────────
function GradeModal({ submission, token, onClose, onGraded }: {
  submission: FLSubmission & { student?: { id: string; fullName: string } };
  token: string;
  onClose: () => void;
  onGraded: () => void;
}) {
  const [grades, setGrades] = useState<Record<string, { score: string; comment: string }>>({});
  const [totalScore, setTotalScore] = useState("");
  const [saving, setSaving] = useState(false);

  const setGrade = (taskId: string, k: "score" | "comment", v: string) =>
    setGrades(g => ({ ...g, [taskId]: { ...(g[taskId] ?? { score: "", comment: "" }), [k]: v } }));

  async function handleGrade() {
    setSaving(true);
    try {
      await api.flGradeSubmission(token, submission.id, {
        answers: submission.answers.map(a => ({
          taskId: a.taskId,
          score: grades[a.taskId]?.score ? Number(grades[a.taskId].score) : undefined,
          teacherComment: grades[a.taskId]?.comment || undefined,
        })),
        totalScore: totalScore ? Number(totalScore) : undefined,
      });
      onGraded();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 540, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 4 }}>Оценить работу</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>{submission.student?.fullName ?? "Ученик"}</p>
        {submission.answers.map((a, i) => (
          <div key={a.taskId} style={{ marginBottom: 14, padding: 10, background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Задание {i + 1} (ID: {a.taskId.slice(-6)})</div>
            <div style={{ fontSize: 13, marginBottom: 8, whiteSpace: "pre-wrap" }}>{a.answer || "—"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" style={{ width: 80 }} type="number" min={0} placeholder="Балл" value={grades[a.taskId]?.score ?? ""} onChange={e => setGrade(a.taskId, "score", e.target.value)} />
              <input className="input" style={{ flex: 1 }} placeholder="Комментарий" value={grades[a.taskId]?.comment ?? ""} onChange={e => setGrade(a.taskId, "comment", e.target.value)} />
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontWeight: 500, fontSize: 13 }}>Итоговый балл:</span>
          <input className="input" style={{ width: 100 }} type="number" min={0} placeholder="Балл" value={totalScore} onChange={e => setTotalScore(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleGrade}>{saving ? "Сохранение..." : "Сохранить оценку"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Teacher FL Panel ─────────────────────────────────────────────────────
export function FLTeacherPanel({ token, language }: { token: string; language: Language }) {
  const [tab, setTab] = useState<Tab>("bank");
  const t = translations[language];

  // Task bank state
  const [tasks, setTasks] = useState<FLTask[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [dirFilter, setDirFilter] = useState("");
  const [diffFilter, setDiffFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiInitialData, setAiInitialData] = useState<Partial<FLTask> | undefined>(undefined);

  // Assignments state
  const [assignments, setAssignments] = useState<FLAssignment[]>([]);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<FLAssignment | null>(null);
  const [submissions, setSubmissions] = useState<(FLSubmission & { student?: { id: string; fullName: string } })[]>([]);
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false);
  const [showCreateWork, setShowCreateWork] = useState(false);
  const [gradeSubmission, setGradeSubmission] = useState<(FLSubmission & { student?: { id: string; fullName: string } }) | null>(null);

  // Analytics state
  const [analyticsClassrooms, setAnalyticsClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [analyticsClassroomId, setAnalyticsClassroomId] = useState("");
  const [classAnalytics, setClassAnalytics] = useState<{ studentStats: { studentId: string; fullName: string; reading: number | null; math: number | null; science: number | null; totalSubmissions: number }[] } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    if (tab === "bank" && !tasksLoaded) {
      api.flGetTasks(token).then(data => { setTasks(data); setTasksLoaded(true); }).catch(() => setTasksLoaded(true));
    }
    if (tab === "works" && !assignmentsLoaded) {
      api.flGetAssignments(token).then(data => { setAssignments(data); setAssignmentsLoaded(true); }).catch(() => setAssignmentsLoaded(true));
    }
    if (tab === "analytics" && analyticsClassrooms.length === 0) {
      api.getClassrooms(token).then(data => setAnalyticsClassrooms(data)).catch(() => {});
    }
  }, [tab, token, tasksLoaded, assignmentsLoaded, analyticsClassrooms.length]);

  useEffect(() => {
    if (!selectedAssignment) { setSubmissions([]); setSubmissionsLoaded(false); return; }
    setSubmissionsLoaded(false);
    api.flGetSubmissions(token, selectedAssignment.id)
      .then(data => { setSubmissions(data as typeof submissions); setSubmissionsLoaded(true); })
      .catch(() => setSubmissionsLoaded(true));
  }, [selectedAssignment, token]);

  useEffect(() => {
    if (!analyticsClassroomId) return;
    setAnalyticsLoading(true);
    api.flGetClassAnalytics(token, analyticsClassroomId)
      .then(data => { setClassAnalytics(data); setAnalyticsLoading(false); })
      .catch(() => setAnalyticsLoading(false));
  }, [analyticsClassroomId, token]);

  const filteredTasks = tasks.filter(t =>
    (!dirFilter || t.direction === dirFilter) &&
    (!diffFilter || t.difficulty === diffFilter) &&
    (!gradeFilter || String(t.grade) === gradeFilter) &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))
  );

  async function handlePublish(id: string) {
    const updated = await api.flPublishAssignment(token, id);
    setAssignments(prev => prev.map(a => a.id === id ? updated : a));
    if (selectedAssignment?.id === id) setSelectedAssignment(updated);
  }
  async function handleClose(id: string) {
    const updated = await api.flCloseAssignment(token, id);
    setAssignments(prev => prev.map(a => a.id === id ? updated : a));
    if (selectedAssignment?.id === id) setSelectedAssignment(updated);
  }
  async function handleDeleteTask(id: string) {
    if (!confirm("Удалить задание?")) return;
    await api.flDeleteTask(token, id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div className="page">
      <h1 className="page-title">📚 {t.fl_module ?? "Функциональная грамотность"}</h1>

      <div className="sc-tabs">
        {([
          { key: "bank", label: t.fl_task_bank ?? "Банк заданий" },
          { key: "works", label: t.fl_my_works ?? "Мои работы" },
          { key: "analytics", label: t.fl_class_analytics ?? "Аналитика класса" },
        ] as { key: Tab; label: string }[]).map(tb => (
          <button key={tb.key} className={`sc-tab${tab === tb.key ? " sc-tab-active" : ""}`} onClick={() => { setTab(tb.key); setSelectedAssignment(null); }}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── Task Bank Tab ── */}
      {tab === "bank" && (
        <div style={{ marginTop: 0 }}>
          {/* Filter bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <select className="input" style={{ width: 140 }} value={dirFilter} onChange={e => setDirFilter(e.target.value)}>
              {DIRECTIONS.map(d => <option key={d.value} value={d.value}>{d.label || "Направление"}</option>)}
            </select>
            <select className="input" style={{ width: 120 }} value={diffFilter} onChange={e => setDiffFilter(e.target.value)}>
              {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label || "Сложность"}</option>)}
            </select>
            <input className="input" style={{ width: 80 }} type="number" placeholder="Класс" min={1} max={11} value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} />
            <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="🔍 Поиск по названию..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={() => { setAiInitialData(undefined); setShowAddTask(true); }}>+ {t.fl_create_task ?? "Добавить"}</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowAiModal(true)}>🤖 {t.fl_generate_ai ?? "ИИ"}</button>
          </div>

          {/* Task cards */}
          {!tasksLoaded ? (
            <div className="card"><p className="fm-empty">{t.loading}</p></div>
          ) : filteredTasks.length === 0 ? (
            <div className="card"><p className="fm-empty">{t.fl_no_tasks ?? "Нет заданий в банке"}</p></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {filteredTasks.map(task => (
                <div key={task.id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {dirBadge(task.direction)}
                    {diffBadge(task.difficulty)}
                    {task.grade && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}>{task.grade} кл.</span>}
                    {task.taskType && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}>{TASK_TYPES.find(x => x.value === task.taskType)?.label}</span>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{task.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{task.description}</div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => handleDeleteTask(task.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── My Works Tab ── */}
      {tab === "works" && !selectedAssignment && (
        <div style={{ marginTop: 0 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateWork(true)}>+ {t.fl_create_work ?? "Создать работу"}</button>
          </div>
          {!assignmentsLoaded ? (
            <div className="card"><p className="fm-empty">{t.loading}</p></div>
          ) : assignments.length === 0 ? (
            <div className="card"><p className="fm-empty">{t.fl_no_assignments ?? "Нет работ"}</p></div>
          ) : (
            <div className="card" style={{ marginTop: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Формат</th>
                    <th>Статус</th>
                    <th>Создано</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500 }}>{a.title}</td>
                      <td style={{ color: "var(--muted)", fontSize: 13 }}>{FORMATS.find(f => f.value === a.format)?.label ?? a.format ?? "—"}</td>
                      <td>{statusBadge(a.status)}</td>
                      <td style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setSelectedAssignment(a)}>Работы</button>
                          {a.status === "draft" && <button className="btn btn-primary btn-sm" onClick={() => handlePublish(a.id)}>▶ Опубл.</button>}
                          {a.status === "published" && <button className="btn btn-ghost btn-sm" onClick={() => handleClose(a.id)}>■ Закрыть</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Assignment submissions detail */}
      {tab === "works" && selectedAssignment && (
        <div style={{ marginTop: 0 }}>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedAssignment(null)}>← Назад</button>
              <span style={{ fontWeight: 600 }}>{selectedAssignment.title}</span>
              {statusBadge(selectedAssignment.status)}
              {selectedAssignment.status === "draft" && <button className="btn btn-primary btn-sm" onClick={() => handlePublish(selectedAssignment.id)}>▶ Опубликовать</button>}
              {selectedAssignment.status === "published" && <button className="btn btn-ghost btn-sm" onClick={() => handleClose(selectedAssignment.id)}>■ Закрыть</button>}
            </div>
          </div>
          <div className="card" style={{ marginTop: 0 }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>{t.fl_submissions ?? "Работы учеников"}</h3>
            {!submissionsLoaded ? (
              <p className="fm-empty">{t.loading}</p>
            ) : submissions.length === 0 ? (
              <p className="fm-empty">Нет отправленных работ</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ученик</th>
                    <th>Статус</th>
                    <th>Балл</th>
                    <th>Отправлено</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, idx) => (
                    <tr key={sub.id}>
                      <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500 }}>{(sub as { student?: { fullName: string } }).student?.fullName ?? "—"}</td>
                      <td>{subStatusBadge(sub.status)}</td>
                      <td>{sub.totalScore !== undefined && sub.totalScore !== null ? sub.totalScore : "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : "—"}</td>
                      <td>
                        {(sub.status === "submitted" || sub.status === "graded") && (
                          <button className="btn btn-outline btn-sm" onClick={() => setGradeSubmission(sub)}>
                            {t.fl_grade_btn ?? "Оценить"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Class Analytics Tab ── */}
      {tab === "analytics" && (
        <div style={{ marginTop: 0 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <select className="input" style={{ maxWidth: 260 }} value={analyticsClassroomId} onChange={e => setAnalyticsClassroomId(e.target.value)}>
              <option value="">{t.fl_select_classroom ?? "Выберите класс"}</option>
              {analyticsClassrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {!analyticsClassroomId ? (
            <div className="card"><p className="fm-empty">Выберите класс для просмотра аналитики</p></div>
          ) : analyticsLoading ? (
            <div className="card"><p className="fm-empty">{t.loading}</p></div>
          ) : !classAnalytics || classAnalytics.studentStats.length === 0 ? (
            <div className="card"><p className="fm-empty">{t.fl_no_data ?? "Нет данных"}</p></div>
          ) : (
            <div className="card" style={{ marginTop: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ученик</th>
                    <th>📖 Чтение</th>
                    <th>🔢 Математика</th>
                    <th>🔬 Наука</th>
                    <th>Работ сдано</th>
                  </tr>
                </thead>
                <tbody>
                  {classAnalytics.studentStats.map((s, idx) => (
                    <tr key={s.studentId}>
                      <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500 }}>{s.fullName}</td>
                      <td>{s.reading !== null ? s.reading : "—"}</td>
                      <td>{s.math !== null ? s.math : "—"}</td>
                      <td>{s.science !== null ? s.science : "—"}</td>
                      <td style={{ color: "var(--muted)" }}>{s.totalSubmissions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddTask && (
        <AddTaskModal
          token={token}
          initialData={aiInitialData}
          onClose={() => { setShowAddTask(false); setAiInitialData(undefined); }}
          onSaved={task => { setTasks(prev => [task, ...prev]); setShowAddTask(false); setAiInitialData(undefined); }}
        />
      )}
      {showAiModal && (
        <AiGenerateModal
          token={token}
          onClose={() => setShowAiModal(false)}
          onGenerated={data => { setAiInitialData(data); setShowAiModal(false); setShowAddTask(true); }}
        />
      )}
      {showCreateWork && (
        <CreateAssignmentModal
          token={token}
          tasks={tasks}
          onClose={() => setShowCreateWork(false)}
          onSaved={a => { setAssignments(prev => [a, ...prev]); setShowCreateWork(false); }}
        />
      )}
      {gradeSubmission && (
        <GradeModal
          submission={gradeSubmission}
          token={token}
          onClose={() => setGradeSubmission(null)}
          onGraded={() => {
            setGradeSubmission(null);
            if (selectedAssignment) {
              api.flGetSubmissions(token, selectedAssignment.id)
                .then(data => setSubmissions(data as typeof submissions))
                .catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
