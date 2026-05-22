"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";

type Lesson = {
  id: string; subject: string; classroomId?: string; cabinet?: string; lessonTime?: string;
  date?: string; lessonTopic?: string; visitPurpose?: string; lessonPurpose?: string;
  equipment?: string; status: string; teacher?: { id: string; fullName: string };
};

type Analysis = {
  id: string; lessonId: string; visitPurpose?: string; lessonTopic?: string; lessonPurpose?: string;
  equipment?: string; studentSurveyTable: string[][]; lessonProgressTable: string[][];
  conclusion?: string; recommendations?: string; teacherSignature?: string; teacherSignDate?: string;
  analyzerSignature?: string; analyzerSignDate?: string; isDraft: boolean;
  analyzer?: { fullName: string };
};

interface Props {
  token: string;
  language: Language;
  lesson: Lesson;
  classroomName?: string;
  readOnly?: boolean;
  onClose: () => void;
}

function emptyRow(len: number): string[] { return Array(len).fill(""); }

export function LessonAnalysisForm({ token, language, lesson, classroomName, readOnly, onClose }: Props) {
  const t = translations[language];

  const SURVEY_COLS = [
    t.lesson_analysis_group_1,
    t.lesson_analysis_group_2,
    t.lesson_analysis_group_3,
    t.lesson_analysis_group_4,
  ];

  const PROGRESS_COLS = [
    t.lesson_analysis_stages_col,
    t.lesson_analysis_methods_col,
    t.kmzh_teacher_actions,
    t.kmzh_student_actions,
    t.lesson_analysis_recommendations_col,
  ];

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [visitPurpose, setVisitPurpose] = useState("");
  const [lessonTopic, setLessonTopic] = useState("");
  const [lessonPurpose, setLessonPurpose] = useState("");
  const [equipment, setEquipment] = useState("");
  const [surveyRows, setSurveyRows] = useState<string[][]>([emptyRow(4)]);
  const [progressRows, setProgressRows] = useState<string[][]>([emptyRow(5)]);
  const [conclusion, setConclusion] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [teacherSignature, setTeacherSignature] = useState("");
  const [teacherSignDate, setTeacherSignDate] = useState("");
  const [analyzerSignature, setAnalyzerSignature] = useState("");
  const [analyzerSignDate, setAnalyzerSignDate] = useState("");

  useEffect(() => {
    api.getLessonAnalysis(token, lesson.id)
      .then((a) => {
        if (a) {
          setAnalysis(a);
          setVisitPurpose(a.visitPurpose ?? lesson.visitPurpose ?? "");
          setLessonTopic(a.lessonTopic ?? lesson.lessonTopic ?? "");
          setLessonPurpose(a.lessonPurpose ?? lesson.lessonPurpose ?? "");
          setEquipment(a.equipment ?? lesson.equipment ?? "");
          setSurveyRows(a.studentSurveyTable?.length ? a.studentSurveyTable : [emptyRow(4)]);
          setProgressRows(a.lessonProgressTable?.length ? a.lessonProgressTable : [emptyRow(5)]);
          setConclusion(a.conclusion ?? "");
          setRecommendations(a.recommendations ?? "");
          setTeacherSignature(a.teacherSignature ?? "");
          setTeacherSignDate(a.teacherSignDate ? a.teacherSignDate.substring(0, 10) : "");
          setAnalyzerSignature(a.analyzerSignature ?? "");
          setAnalyzerSignDate(a.analyzerSignDate ? a.analyzerSignDate.substring(0, 10) : "");
        } else {
          setVisitPurpose(lesson.visitPurpose ?? "");
          setLessonTopic(lesson.lessonTopic ?? "");
          setLessonPurpose(lesson.lessonPurpose ?? "");
          setEquipment(lesson.equipment ?? "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, lesson]);

  function buildPayload(isDraft: boolean) {
    return {
      visitPurpose, lessonTopic, lessonPurpose, equipment,
      studentSurveyTable: surveyRows,
      lessonProgressTable: progressRows,
      conclusion, recommendations,
      teacherSignature, teacherSignDate: teacherSignDate || undefined,
      analyzerSignature, analyzerSignDate: analyzerSignDate || undefined,
      isDraft,
    };
  }

  async function handleSave(isDraft: boolean) {
    setSaving(true);
    try {
      await api.saveLessonAnalysis(token, lesson.id, buildPayload(isDraft));
      onClose();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePdf() {
    try {
      const blob = await api.getLessonAnalysisPdf(token, lesson.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analysis-${lesson.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  function updateSurveyCell(row: number, col: number, val: string) {
    setSurveyRows((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = val;
      return next;
    });
  }

  function updateProgressCell(row: number, col: number, val: string) {
    setProgressRows((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = val;
      return next;
    });
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted" style={{ textAlign: "center", padding: 40 }}>{t.loading}</p>
      </div>
    );
  }

  const dateStr = lesson.date ? new Date(lesson.date).toLocaleDateString("ru-RU") : "—";

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>← {t.back}</button>
        <h1 className="page-title">📋 {t.lesson_analysis_title}</h1>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {!readOnly && (
            <>
              <button className="btn btn-outline btn-sm" disabled={saving} onClick={() => handleSave(true)}>
                {t.status_draft}
              </button>
              <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => handleSave(false)}>
                {saving ? <span className="spinner" /> : t.btn_save}
              </button>
            </>
          )}
          {analysis && !analysis.isDraft && (
            <button className="btn btn-outline btn-sm" onClick={handlePdf}>📄 {t.exportPdf}</button>
          )}
        </div>
      </div>

      <div className="card">
        {/* Header block */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 16 }}>
          <div className="field">
            <label className="field-label">{t.date}</label>
            <input className="input" readOnly value={dateStr} />
          </div>
          <div className="field">
            <label className="field-label">{t.lesson_analysis_time}</label>
            <input className="input" readOnly value={lesson.lessonTime ?? "—"} />
          </div>
          <div className="field">
            <label className="field-label">{t.grade}</label>
            <input className="input" readOnly value={classroomName ?? lesson.classroomId ?? "—"} />
          </div>
          <div className="field">
            <label className="field-label">{t.room}</label>
            <input className="input" readOnly value={lesson.cabinet ?? "—"} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label className="field-label">{t.kmzh_teacher_name}</label>
            <input className="input" readOnly value={lesson.teacher?.fullName ?? "—"} />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label className="field-label">{t.lesson_visit_purpose}</label>
          <textarea className="textarea" rows={2} value={visitPurpose}
            onChange={(e) => setVisitPurpose(e.target.value)} readOnly={readOnly} />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label className="field-label">{t.lesson_topic_col}</label>
          <input className="input" value={lessonTopic}
            onChange={(e) => setLessonTopic(e.target.value)} readOnly={readOnly} />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label className="field-label">{t.lesson_purpose}</label>
          <textarea className="textarea" rows={2} value={lessonPurpose}
            onChange={(e) => setLessonPurpose(e.target.value)} readOnly={readOnly} />
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label className="field-label">{t.lesson_equipment}</label>
          <textarea className="textarea" rows={2} value={equipment}
            onChange={(e) => setEquipment(e.target.value)} readOnly={readOnly} />
        </div>

        {/* Table 1 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <strong>{t.lesson_analysis_survey_title}</strong>
            {!readOnly && (
              <button className="btn btn-outline btn-sm"
                onClick={() => setSurveyRows((r) => [...r, emptyRow(4)])}>{t.lesson_analysis_add_row}</button>
            )}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>{SURVEY_COLS.map((c) => <th key={c}>{c}</th>)}{!readOnly && <th style={{ width: 36 }}></th>}</tr>
              </thead>
              <tbody>
                {surveyRows.map((row, ri) => (
                  <tr key={ri}>
                    {SURVEY_COLS.map((_, ci) => (
                      <td key={ci}>
                        {readOnly ? (row[ci] ?? "")
                          : <input className="input" style={{ padding: "4px 6px" }} value={row[ci] ?? ""}
                              onChange={(e) => updateSurveyCell(ri, ci, e.target.value)} />}
                      </td>
                    ))}
                    {!readOnly && (
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}
                          onClick={() => setSurveyRows((r) => r.filter((_, i) => i !== ri))}>✕</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <strong>{t.lesson_analysis_progress_title}</strong>
            {!readOnly && (
              <button className="btn btn-outline btn-sm"
                onClick={() => setProgressRows((r) => [...r, emptyRow(5)])}>{t.lesson_analysis_add_row}</button>
            )}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>{PROGRESS_COLS.map((c) => <th key={c} style={{ fontSize: 11 }}>{c}</th>)}{!readOnly && <th style={{ width: 36 }}></th>}</tr>
              </thead>
              <tbody>
                {progressRows.map((row, ri) => (
                  <tr key={ri}>
                    {PROGRESS_COLS.map((_, ci) => (
                      <td key={ci}>
                        {readOnly ? (row[ci] ?? "")
                          : <input className="input" style={{ padding: "4px 6px" }} value={row[ci] ?? ""}
                              onChange={(e) => updateProgressCell(ri, ci, e.target.value)} />}
                      </td>
                    ))}
                    {!readOnly && (
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}
                          onClick={() => setProgressRows((r) => r.filter((_, i) => i !== ri))}>✕</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conclusion */}
        <div className="field" style={{ marginBottom: 10 }}>
          <label className="field-label">{t.lesson_analysis_conclusion}</label>
          <textarea className="textarea" rows={4} value={conclusion}
            onChange={(e) => setConclusion(e.target.value)} readOnly={readOnly} />
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label className="field-label">{t.lesson_analysis_improvement_recs}</label>
          <textarea className="textarea" rows={4} value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)} readOnly={readOnly} />
        </div>

        {/* Signatures */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
            <div className="field">
              <label className="field-label">{t.lesson_analysis_teacher_reviewed}</label>
              <input className="input" value={teacherSignature}
                onChange={(e) => setTeacherSignature(e.target.value)} readOnly={readOnly}
                placeholder={t.lesson_analysis_signature} />
            </div>
            <div className="field">
              <label className="field-label">{t.date}</label>
              <input className="input" type="date" value={teacherSignDate}
                onChange={(e) => setTeacherSignDate(e.target.value)} readOnly={readOnly} />
            </div>
            <div className="field">
              <label className="field-label">{t.lesson_analysis_observer}</label>
              <input className="input" value={analyzerSignature}
                onChange={(e) => setAnalyzerSignature(e.target.value)} readOnly={readOnly}
                placeholder={t.lesson_analysis_signature} />
            </div>
            <div className="field">
              <label className="field-label">{t.date}</label>
              <input className="input" type="date" value={analyzerSignDate}
                onChange={(e) => setAnalyzerSignDate(e.target.value)} readOnly={readOnly} />
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="form-row">
          {!readOnly && (
            <>
              <button className="btn btn-primary" disabled={saving} onClick={() => handleSave(false)}>
                {saving ? <span className="spinner" /> : t.btn_save}
              </button>
              <button className="btn btn-outline" disabled={saving} onClick={() => handleSave(true)}>
                {t.status_draft}
              </button>
            </>
          )}
          {analysis && !analysis.isDraft && (
            <button className="btn btn-outline" onClick={handlePdf}>📄 {t.exportPdf}</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>← {t.back}</button>
        </div>
      </div>
    </div>
  );
}
