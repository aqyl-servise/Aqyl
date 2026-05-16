"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";

interface Props { token: string; language: Language; userRole: string; }

type Questionnaire = { id: string; title: string; description?: string; content: string; type: string; status: string; assignedClassroomIds: string[]; aiAnalysisResult?: string; createdAt: string };
type Classroom = { id: string; name: string; grade: number };

export function QuestionnairesPanel({ token, language, userRole }: Props) {
  const t = translations[language];
  const [tab, setTab] = useState<"list" | "generate">("list");
  const [items, setItems] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(false);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ topic: "", grade: "5", questionCount: "10", questionType: "multiple_choice" });
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<{ id: string; text: string } | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const canEdit = !["teacher", "student"].includes(userRole);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getQuestionnaires(token),
      api.getClassroomsForDropdown(token),
    ]).then(([qs, cls]) => {
      setItems(qs);
      setClassrooms(cls);
    }).finally(() => setLoading(false));
  }, [token]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const q = await api.generateQuestionnaire(token, {
        topic: form.topic,
        grade: Number(form.grade),
        questionCount: Number(form.questionCount),
        questionType: form.questionType,
      });
      setItems(prev => [q as Questionnaire, ...prev]);
      setTab("list");
    } finally { setGenerating(false); }
  }

  async function handleDelete(id: string) {
    await api.deleteQuestionnaire(token, id);
    setItems(prev => prev.filter(q => q.id !== id));
  }

  async function handleAssign() {
    if (!assignModal) return;
    await api.assignQuestionnaire(token, assignModal, selectedClasses);
    setItems(prev => prev.map(q => q.id === assignModal ? { ...q, status: "assigned", assignedClassroomIds: selectedClasses } : q));
    setAssignModal(null);
    setSelectedClasses([]);
  }

  async function handleAnalyze(id: string) {
    setAnalyzingId(id);
    try {
      const res = await api.analyzeQuestionnaire(token, id);
      setAnalysis({ id, text: res.analysis });
    } finally { setAnalyzingId(null); }
  }

  const statusLabel = (s: string) => ({ draft: t.quest_status_draft, assigned: t.quest_status_assigned, completed: t.quest_status_completed }[s] ?? s);
  const statusColor = (s: string) => ({ draft: "var(--text-muted)", assigned: "#3DB88E", completed: "#7F77DD" }[s] ?? "inherit");

  return (
    <div className="page">
      <h1 className="page-title">{t.nav_questionnaires}</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${tab === "list" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("list")}>{t.quest_my_questionnaires}</button>
        {canEdit && <button className={`btn btn-sm ${tab === "generate" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("generate")}>{t.quest_generate_tab}</button>}
      </div>

      {tab === "list" && (
        loading ? <div className="spinner" style={{ margin: "40px auto" }} /> :
        items.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>{t.quest_no_data}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map(q => (
              <div key={q.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{q.title}</div>
                    {q.description && <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{q.description}</div>}
                    <span style={{ fontSize: 12, color: statusColor(q.status) }}>{statusLabel(q.status)}</span>
                    {q.assignedClassroomIds.length > 0 && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                        {q.assignedClassroomIds.length} {t.nav_classrooms}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setAssignModal(q.id); setSelectedClasses(q.assignedClassroomIds); }}>{t.quest_assign}</button>
                      <button className="btn btn-sm btn-ghost" disabled={analyzingId === q.id} onClick={() => handleAnalyze(q.id)}>
                        {analyzingId === q.id ? <span className="spinner" /> : t.quest_analyze}
                      </button>
                      <button className="btn btn-sm btn-ghost" style={{ color: "var(--error)" }} onClick={() => handleDelete(q.id)}>{t.fm_delete}</button>
                    </div>
                  )}
                </div>
                {analysis?.id === q.id && (
                  <div style={{ marginTop: 12, padding: 12, background: "var(--bg-alt)", borderRadius: 8, fontSize: 13, whiteSpace: "pre-wrap" }}>
                    {analysis.text}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === "generate" && canEdit && (
        <div className="card" style={{ maxWidth: 480, padding: 24 }}>
          <div className="field">
            <label className="field-label">{t.quest_topic}</label>
            <input className="input" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="Профессиональное ориентирование" />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t.quest_grade}</label>
              <input className="input" type="number" min={1} max={11} value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">{t.quest_question_count}</label>
              <input className="input" type="number" min={3} max={30} value={form.questionCount} onChange={e => setForm(f => ({ ...f, questionCount: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label className="field-label">{t.quest_question_type}</label>
            <select className="input" value={form.questionType} onChange={e => setForm(f => ({ ...f, questionType: e.target.value }))}>
              <option value="multiple_choice">{t.quest_type_multiple}</option>
              <option value="text">{t.quest_type_text}</option>
              <option value="scale">{t.quest_type_scale}</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={generating || !form.topic.trim()} onClick={handleGenerate} style={{ width: "100%" }}>
            {generating ? <><span className="spinner" /> {t.mat_generating}</> : t.quest_generate_btn}
          </button>
        </div>
      )}

      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h3 style={{ margin: "0 0 16px" }}>{t.quest_assign}</h3>
            <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {classrooms.map(c => (
                <label key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={selectedClasses.includes(c.id)}
                    onChange={e => setSelectedClasses(prev => e.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id))} />
                  {c.name}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => setAssignModal(null)}>{t.cancel}</button>
              <button className="btn btn-sm btn-primary" onClick={handleAssign}>{t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
