"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";

type SchoolStats = Awaited<ReturnType<typeof api.getSchoolStats>>;
type ClassStats = Awaited<ReturnType<typeof api.getClassesStats>>[number];
type StudentStat = Awaited<ReturnType<typeof api.getStudentsStats>>[number];

type Tab = "dashboard" | "classes" | "students" | "ai" | "docs";

interface Props { token: string; language: Language; t: Record<string, string> }

function scoreClass(s: number) {
  return s < 60 ? "score-low" : s < 80 ? "score-mid" : "score-high";
}
function barColor(s: number) {
  return s < 60 ? "var(--warn)" : s < 80 ? "#f59e0b" : "var(--success)";
}

function fmLabels(t: Record<string, string>) {
  return {
    home: t.fm_home, newFolder: t.fm_new_folder, upload: t.fm_upload,
    uploading: t.fm_uploading, search: t.fm_search, folderName: t.fm_folder_name,
    create: t.fm_create, cancel: t.cancel, noFiles: t.fm_no_files,
    download: t.fm_download, delete: t.fm_delete, loading: t.loading,
  };
}

// Simple CSS bar chart
function BarChart({ items, labelKey, valueKey }: { items: Record<string, unknown>[]; labelKey: string; valueKey: string }) {
  const max = Math.max(...items.map((i) => Number(i[valueKey])), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, idx) => {
        const val = Number(item[valueKey]);
        const pct = Math.round((val / max) * 100);
        return (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 110, fontSize: 12, color: "var(--muted)", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {String(item[labelKey])}
            </div>
            <div style={{ flex: 1, background: "var(--bg)", borderRadius: 4, height: 20, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: barColor(val), borderRadius: 4, transition: "width 0.4s ease", display: "flex", alignItems: "center", paddingLeft: 6 }}>
                {pct > 20 && <span style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>{val}%</span>}
              </div>
            </div>
            {pct <= 20 && <span style={{ fontSize: 12, fontWeight: 600, color: barColor(val) }}>{val}%</span>}
          </div>
        );
      })}
    </div>
  );
}

function TeacherAnalyticsDocsCard({ token, labels, tl }: { token: string; labels: Record<string, string>; tl: Record<string, string> }) {
  const [teachers, setTeachers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [selected, setSelected] = useState<{ id: string; fullName: string } | null>(null);
  const [docType, setDocType] = useState<"quality" | "class">("quality");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    api.getAdminTeachers(token)
      .then(data => { setTeachers(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [token, loaded]);

  return (
    <div className="card">
      <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>👩‍🏫 {tl.nav_teachers} — {tl.nav_analytics}</h3>
      {!selected ? (
        !loaded ? (
          <p className="fm-empty">{tl.loading}</p>
        ) : teachers.length === 0 ? (
          <p className="fm-empty">{tl.noData}</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>{tl.name}</th><th>{tl.actions}</th></tr></thead>
            <tbody>
              {teachers.map(tc => (
                <tr key={tc.id}>
                  <td>{tc.fullName}</td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => setSelected(tc)}>📂 {tl.sc_documents_btn}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>← {tl.attest_back}</button>
            <span style={{ fontWeight: 600 }}>{selected.fullName}</span>
          </div>
          <div className="sc-tabs" style={{ marginBottom: 12 }}>
            <button className={`sc-tab${docType === "quality" ? " sc-tab-active" : ""}`} onClick={() => setDocType("quality")}>
              {tl.teacher_analytics_quality ?? "Білім сапасы"}
            </button>
            <button className={`sc-tab${docType === "class" ? " sc-tab-active" : ""}`} onClick={() => setDocType("class")}>
              {tl.teacher_analytics_class_data ?? "Сынып бойынша мәлімет"}
            </button>
          </div>
          <FileManager
            token={token}
            section={`analytics-${docType === "quality" ? "quality" : "class"}-${selected.id}`}
            canEdit={false}
            canUpload={false}
            labels={labels}
          />
        </div>
      )}
    </div>
  );
}

export function SchoolAnalyticsPanel({ token, language, t }: Props) {
  const tl = translations[language];
  const labels = fmLabels(t);

  const [tab, setTab] = useState<Tab>("dashboard");

  // Dashboard
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);

  // Classes
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [classesLoaded, setClassesLoaded] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassStats | null>(null);

  // Students
  const [studentQ, setStudentQ] = useState("");
  const [studentResults, setStudentResults] = useState<StudentStat[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentStat | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Load dashboard stats
  useEffect(() => {
    if (tab !== "dashboard" || statsLoaded) return;
    setStatsLoading(true);
    api.getSchoolStats(token)
      .then((d) => { setStats(d); setStatsLoaded(true); })
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, [tab, token, statsLoaded]);

  // Load classes
  useEffect(() => {
    if (tab !== "classes" || classesLoaded) return;
    setClassesLoading(true);
    api.getClassesStats(token)
      .then((d) => { setClasses(d); setClassesLoaded(true); })
      .catch(console.error)
      .finally(() => setClassesLoading(false));
  }, [tab, token, classesLoaded]);

  // Student debounced search
  useEffect(() => {
    if (tab !== "students") return;
    if (!studentQ.trim()) { setStudentResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setStudentLoading(true);
      api.getStudentsStats(token, studentQ.trim())
        .then(setStudentResults)
        .catch(console.error)
        .finally(() => setStudentLoading(false));
    }, 400);
  }, [studentQ, tab, token]);

  async function handleAiAnalyze() {
    setAiLoading(true);
    setAiResult("");
    try {
      let data = stats;
      if (!data) {
        data = await api.getSchoolStats(token);
        setStats(data); setStatsLoaded(true);
      }
      const result = await api.aiAnalyzeSchool(token, data as unknown as Record<string, unknown>);
      setAiResult(result.analysis);
    } catch (e) {
      console.error(e);
      setAiResult("Ошибка при получении анализа. Проверьте подключение к сети.");
    } finally {
      setAiLoading(false);
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "dashboard", label: tl.san_tab_dashboard },
    { key: "classes", label: tl.san_tab_classes },
    { key: "students", label: tl.san_tab_students },
    { key: "ai", label: tl.san_tab_ai },
    { key: "docs", label: tl.san_tab_docs },
  ];

  return (
    <div className="page">
      <h1 className="page-title">📈 {t.nav_school_analytics}</h1>

      <div className="sc-tabs">
        {TABS.map((tb) => (
          <button key={tb.key} className={`sc-tab${tab === tb.key ? " sc-tab-active" : ""}`}
            onClick={() => { setTab(tb.key); setSelectedClass(null); setSelectedStudent(null); }}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && (
        <div>
          {statsLoading && <p className="empty-state">{t.loading}</p>}
          {!statsLoading && !stats && !statsLoaded && <p className="empty-state">{t.noData}</p>}
          {stats && (
            <>
              {/* Big metrics */}
              <div className="stats-row">
                <div className="stat-card stat-blue">
                  <span className="stat-icon">📊</span>
                  <div>
                    <p className="stat-label">{tl.san_school_avg}</p>
                    <p className="stat-value">{stats.avgScore}%</p>
                    <div className="progress-bar-wrap" style={{ marginTop: 8 }}>
                      <div className="progress-bar-fill" style={{ width: `${stats.avgScore}%`, background: barColor(stats.avgScore) }} />
                    </div>
                  </div>
                </div>
                <div className="stat-card stat-green">
                  <span className="stat-icon">👩‍🎓</span>
                  <div><p className="stat-label">{t.students}</p><p className="stat-value">{stats.totalStudents}</p></div>
                </div>
                <div className="stat-card stat-purple">
                  <span className="stat-icon">🏫</span>
                  <div><p className="stat-label">{t.classes}</p><p className="stat-value">{stats.totalClassrooms}</p></div>
                </div>
                <div className="stat-card stat-orange">
                  <span className="stat-icon">✅</span>
                  <div>
                    <p className="stat-label">{tl.san_submission_rate}</p>
                    <p className="stat-value">{stats.submissionRate}%</p>
                    <div className="progress-bar-wrap" style={{ marginTop: 8 }}>
                      <div className="progress-bar-fill" style={{ width: `${stats.submissionRate}%`, background: barColor(stats.submissionRate) }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* Bar chart by class */}
                <div className="card">
                  <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>{tl.san_by_class}</h3>
                  {stats.byClass.length === 0 ? <p className="fm-empty">{t.noData}</p> : (
                    <BarChart items={stats.byClass as unknown as Record<string, unknown>[]} labelKey="name" valueKey="avgScore" />
                  )}
                </div>

                {/* Bar chart by subject */}
                <div className="card">
                  <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>{tl.san_by_subject}</h3>
                  {stats.bySubject.length === 0 ? <p className="fm-empty">{t.noData}</p> : (
                    <BarChart items={stats.bySubject as unknown as Record<string, unknown>[]} labelKey="subject" valueKey="avgScore" />
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Top 5 */}
                <div className="card">
                  <h3 style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>🏆 {tl.san_top_students}</h3>
                  {stats.topStudents.length === 0 ? <p className="fm-empty">{t.noData}</p> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {stats.topStudents.map((s, i) => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 20, fontWeight: 700, color: i === 0 ? "#f59e0b" : "var(--muted)", fontSize: 13 }}>#{i + 1}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{s.fullName}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.classroom}</div>
                          </div>
                          <span className={`score-chip ${scoreClass(s.avg)}`}>{s.avg}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom 5 */}
                <div className="card">
                  <h3 style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>⚠️ {tl.san_bottom_students}</h3>
                  {stats.bottomStudents.length === 0 ? <p className="fm-empty">{t.noData}</p> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {stats.bottomStudents.map((s, i) => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 20, fontWeight: 700, color: "var(--warn)", fontSize: 13 }}>#{i + 1}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{s.fullName}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.classroom}</div>
                          </div>
                          <span className={`score-chip ${scoreClass(s.avg)}`}>{s.avg}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── BY CLASSES ── */}
      {tab === "classes" && (
        <div className="card" style={{ marginTop: 0 }}>
          {selectedClass ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedClass(null)}>
                  ← {tl.san_back_classes}
                </button>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>{selectedClass.name}</h2>
                <span className={`score-chip ${scoreClass(selectedClass.avgScore)}`}>{selectedClass.avgScore}%</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>{t.name}</th><th>{t.iin}</th>
                    <th>{t.averageScore}</th><th>{tl.san_submitted}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedClass.students.map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                      <td className="table-name">{s.fullName}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{s.iin ?? "—"}</td>
                      <td><span className={`score-chip ${scoreClass(s.avgScore)}`}>{s.avgScore}%</span></td>
                      <td style={{ fontSize: 13 }}>{s.submitted}/{s.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <>
              {classesLoading && <p className="empty-state">{t.loading}</p>}
              {!classesLoading && classes.length === 0 && <p className="empty-state">{t.noData}</p>}
              {classes.length > 0 && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t.classroom}</th><th>{t.nav_teachers}</th>
                      <th>{t.studentCount}</th><th>{t.averageScore}</th>
                      <th>{tl.san_submission_rate}</th><th>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((c) => (
                      <tr key={c.id}>
                        <td className="table-name">{c.name}</td>
                        <td>{c.teacher}</td>
                        <td>{c.studentCount}</td>
                        <td>
                          <span className={`score-chip ${scoreClass(c.avgScore)}`}>{c.avgScore}%</span>
                        </td>
                        <td>
                          <div className="progress-bar-wrap">
                            <div className="progress-bar-fill" style={{ width: `${c.submissionRate}%`, background: barColor(c.submissionRate) }} />
                          </div>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>{c.submissionRate}%</span>
                        </td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => setSelectedClass(c)}>
                            👁 {t.students}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}

      {/* ── BY STUDENTS ── */}
      {tab === "students" && (
        <div className="card" style={{ marginTop: 0 }}>
          {selectedStudent ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedStudent(null)}>← {t.cancel}</button>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>{selectedStudent.fullName}</h2>
                <span className="muted" style={{ fontSize: 13 }}>{selectedStudent.classroom}</span>
                <span className={`score-chip ${scoreClass(selectedStudent.overallAvg)}`}>{selectedStudent.overallAvg}%</span>
              </div>
              {selectedStudent.subjects.length === 0 ? (
                <p className="fm-empty">{t.noData}</p>
              ) : (
                selectedStudent.subjects.map((subj) => (
                  <div key={subj.subject} style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600 }}>{subj.subject}</h3>
                      <span className={`score-chip ${scoreClass(subj.avgScore)}`}>{subj.avgScore}%</span>
                    </div>
                    <table className="data-table">
                      <thead><tr><th>{t.topic}</th><th>{t.averageScore}</th><th>Макс</th></tr></thead>
                      <tbody>
                        {subj.topics.map((tp, i) => (
                          <tr key={i}>
                            <td>{tp.topic}</td>
                            <td><span className={`score-chip ${scoreClass(Math.round((tp.score / tp.maxScore) * 100))}`}>{tp.score}</span></td>
                            <td style={{ color: "var(--muted)" }}>{tp.maxScore}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <input
                className="input" style={{ maxWidth: 360, marginBottom: 16 }}
                placeholder={`🔍 ${tl.san_student_search}`}
                value={studentQ}
                onChange={(e) => setStudentQ(e.target.value)}
              />
              {studentLoading && <p className="fm-empty">{t.loading}</p>}
              {!studentLoading && studentQ && studentResults.length === 0 && <p className="fm-empty">{t.noData}</p>}
              {!studentQ && <p className="fm-empty" style={{ color: "var(--muted)" }}>Введите имя или ИИН для поиска</p>}
              {studentResults.length > 0 && (
                <table className="data-table">
                  <thead><tr><th>{t.name}</th><th>{t.iin}</th><th>{t.classroom}</th><th>{t.averageScore}</th><th>{t.actions}</th></tr></thead>
                  <tbody>
                    {studentResults.map((s) => (
                      <tr key={s.id}>
                        <td className="table-name">{s.fullName}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{s.iin ?? "—"}</td>
                        <td>{s.classroom}</td>
                        <td><span className={`score-chip ${scoreClass(s.overallAvg)}`}>{s.overallAvg}%</span></td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => setSelectedStudent(s)}>
                            👁 {tl.san_student_card}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}

      {/* ── AI ANALYSIS ── */}
      {tab === "ai" && (
        <div className="card" style={{ marginTop: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: "var(--muted)", marginBottom: 16, fontSize: 14 }}>{tl.san_ai_hint}</p>
            <button className="btn btn-primary" onClick={handleAiAnalyze} disabled={aiLoading}>
              {aiLoading ? `⏳ ${tl.san_analyzing}` : `🤖 ${tl.san_analyze_btn}`}
            </button>
          </div>
          {aiResult && (
            <div style={{ background: "var(--bg)", borderRadius: 10, padding: 20, border: "1px solid var(--border)" }}>
              <h3 style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>📋 {tl.san_ai_result}</h3>
              <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--fg)" }}>
                {aiResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {tab === "docs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 0 }}>
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>📂 {tl.san_docs_quality}</h3>
            <FileManager token={token} section="analytics-quality" canEdit canUpload labels={labels} />
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>📂 {tl.san_docs_progress}</h3>
            <FileManager token={token} section="analytics-progress" canEdit canUpload labels={labels} />
          </div>
          <TeacherAnalyticsDocsCard token={token} labels={labels} tl={tl} />
        </div>
      )}
    </div>
  );
}
