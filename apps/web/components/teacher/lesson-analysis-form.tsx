"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

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
  lesson: Lesson;
  classroomName?: string;
  readOnly?: boolean;
  onClose: () => void;
}

const SURVEY_COLS = ["1 топ", "2 топ", "3 топ", "4 топ"];
const PROGRESS_COLS = ["Сабақ кезеңдері", "Оқытудың түрлері мен әдістері", "Мұғалім іс-әрекеті", "Оқушы іс-әрекеті", "Ұсыныстар"];

function emptyRow(len: number): string[] { return Array(len).fill(""); }

export function LessonAnalysisForm({ token, lesson, classroomName, readOnly, onClose }: Props) {
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
        <p className="muted" style={{ textAlign: "center", padding: 40 }}>Жүктелуде...</p>
      </div>
    );
  }

  const dateStr = lesson.date ? new Date(lesson.date).toLocaleDateString("ru-RU") : "—";

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>← Назад</button>
        <h1 className="page-title">📋 САБАҚТЫ ТАЛДАУ СЫЗБАСЫ</h1>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {!readOnly && (
            <>
              <button className="btn btn-outline btn-sm" disabled={saving} onClick={() => handleSave(true)}>
                Черновик
              </button>
              <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => handleSave(false)}>
                {saving ? <span className="spinner" /> : "Сохранить"}
              </button>
            </>
          )}
          {analysis && !analysis.isDraft && (
            <button className="btn btn-outline btn-sm" onClick={handlePdf}>📄 PDF</button>
          )}
        </div>
      </div>

      <div className="card">
        {/* Header block */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 16 }}>
          <div className="field">
            <label className="field-label">Күні</label>
            <input className="input" readOnly value={dateStr} />
          </div>
          <div className="field">
            <label className="field-label">Уақыты</label>
            <input className="input" readOnly value={lesson.lessonTime ?? "—"} />
          </div>
          <div className="field">
            <label className="field-label">Сынып</label>
            <input className="input" readOnly value={classroomName ?? lesson.classroomId ?? "—"} />
          </div>
          <div className="field">
            <label className="field-label">Кабинет</label>
            <input className="input" readOnly value={lesson.cabinet ?? "—"} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label className="field-label">Мұғалімнің аты-жөні</label>
            <input className="input" readOnly value={lesson.teacher?.fullName ?? "—"} />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label className="field-label">Сабаққа қатынасу мақсаты</label>
          <textarea className="textarea" rows={2} value={visitPurpose}
            onChange={(e) => setVisitPurpose(e.target.value)} readOnly={readOnly} />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label className="field-label">Сабақ тақырыбы</label>
          <input className="input" value={lessonTopic}
            onChange={(e) => setLessonTopic(e.target.value)} readOnly={readOnly} />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label className="field-label">Сабақтың мақсаты</label>
          <textarea className="textarea" rows={2} value={lessonPurpose}
            onChange={(e) => setLessonPurpose(e.target.value)} readOnly={readOnly} />
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label className="field-label">Сабақтың жабдықталуы</label>
          <textarea className="textarea" rows={2} value={equipment}
            onChange={(e) => setEquipment(e.target.value)} readOnly={readOnly} />
        </div>

        {/* Table 1 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <strong>Оқушыларды сұраудың схемалық кестесі</strong>
            {!readOnly && (
              <button className="btn btn-outline btn-sm"
                onClick={() => setSurveyRows((r) => [...r, emptyRow(4)])}>+ Жол</button>
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
            <strong>Сабақтың барысы</strong>
            {!readOnly && (
              <button className="btn btn-outline btn-sm"
                onClick={() => setProgressRows((r) => [...r, emptyRow(5)])}>+ Жол</button>
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
          <label className="field-label">Қорытынды</label>
          <textarea className="textarea" rows={4} value={conclusion}
            onChange={(e) => setConclusion(e.target.value)} readOnly={readOnly} />
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label className="field-label">Сабақты жақсарту мақсатындағы ұсыныстар</label>
          <textarea className="textarea" rows={4} value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)} readOnly={readOnly} />
        </div>

        {/* Signatures */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
            <div className="field">
              <label className="field-label">Қорытынды және ұсыныспен танысқан мұғалім</label>
              <input className="input" value={teacherSignature}
                onChange={(e) => setTeacherSignature(e.target.value)} readOnly={readOnly} placeholder="Қолы" />
            </div>
            <div className="field">
              <label className="field-label">Күні</label>
              <input className="input" type="date" value={teacherSignDate}
                onChange={(e) => setTeacherSignDate(e.target.value)} readOnly={readOnly} />
            </div>
            <div className="field">
              <label className="field-label">Сабаққа қатысушы</label>
              <input className="input" value={analyzerSignature}
                onChange={(e) => setAnalyzerSignature(e.target.value)} readOnly={readOnly} placeholder="Қолы" />
            </div>
            <div className="field">
              <label className="field-label">Күні</label>
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
                {saving ? <span className="spinner" /> : "Сохранить"}
              </button>
              <button className="btn btn-outline" disabled={saving} onClick={() => handleSave(true)}>
                Черновик
              </button>
            </>
          )}
          {analysis && !analysis.isDraft && (
            <button className="btn btn-outline" onClick={handlePdf}>📄 Экспорт в PDF</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>← Назад</button>
        </div>
      </div>
    </div>
  );
}
