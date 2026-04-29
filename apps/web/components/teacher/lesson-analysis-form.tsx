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

  if (loading) return (
    <div className="modal-overlay">
      <div className="modal-card"><p className="muted">Жүктелуде...</p></div>
    </div>
  );

  const dateStr = lesson.date ? new Date(lesson.date).toLocaleDateString("ru-RU") : "—";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 900, width: "95%", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>САБАҚТЫ ТАЛДАУ СЫЗБАСЫ</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 12 }}>
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

        <div className="field" style={{ marginBottom: 8 }}>
          <label className="field-label">Сабаққа қатынасу мақсаты</label>
          <textarea className="textarea" rows={2} value={visitPurpose}
            onChange={(e) => setVisitPurpose(e.target.value)} readOnly={readOnly} />
        </div>

        {/* Main fields */}
        <div className="field" style={{ marginBottom: 8 }}>
          <label className="field-label">Сабақ тақырыбы</label>
          <input className="input" value={lessonTopic}
            onChange={(e) => setLessonTopic(e.target.value)} readOnly={readOnly} />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label className="field-label">Сабақтың мақсаты</label>
          <textarea className="textarea" rows={2} value={lessonPurpose}
            onChange={(e) => setLessonPurpose(e.target.value)} readOnly={readOnly} />
        </div>
        <div className="field" style={{ marginBottom: 16 }}>
          <label className="field-label">Сабақтың жабдықталуы</label>
          <textarea className="textarea" rows={2} value={equipment}
            onChange={(e) => setEquipment(e.target.value)} readOnly={readOnly} />
        </div>

        {/* Table 1 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <strong style={{ fontSize: 13 }}>Оқушыларды сұраудың схемалық кестесі</strong>
            {!readOnly && (
              <button className="btn btn-outline btn-sm"
                onClick={() => setSurveyRows((r) => [...r, emptyRow(4)])}>+ Жол</button>
            )}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ minWidth: 500 }}>
              <thead>
                <tr>{SURVEY_COLS.map((c) => <th key={c}>{c}</th>)}{!readOnly && <th></th>}</tr>
              </thead>
              <tbody>
                {surveyRows.map((row, ri) => (
                  <tr key={ri}>
                    {SURVEY_COLS.map((_, ci) => (
                      <td key={ci}>
                        {readOnly
                          ? row[ci]
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
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <strong style={{ fontSize: 13 }}>Сабақтың барысы</strong>
            {!readOnly && (
              <button className="btn btn-outline btn-sm"
                onClick={() => setProgressRows((r) => [...r, emptyRow(5)])}>+ Жол</button>
            )}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>{PROGRESS_COLS.map((c) => <th key={c} style={{ fontSize: 11 }}>{c}</th>)}{!readOnly && <th></th>}</tr>
              </thead>
              <tbody>
                {progressRows.map((row, ri) => (
                  <tr key={ri}>
                    {PROGRESS_COLS.map((_, ci) => (
                      <td key={ci}>
                        {readOnly
                          ? row[ci]
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
        <div className="field" style={{ marginBottom: 8 }}>
          <label className="field-label">Қорытынды</label>
          <textarea className="textarea" rows={3} value={conclusion}
            onChange={(e) => setConclusion(e.target.value)} readOnly={readOnly} />
        </div>
        <div className="field" style={{ marginBottom: 16 }}>
          <label className="field-label">Сабақты жақсарту мақсатындағы ұсыныстар</label>
          <textarea className="textarea" rows={3} value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)} readOnly={readOnly} />
        </div>

        {/* Signatures */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 20, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
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

        {/* Actions */}
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
            <button className="btn btn-outline" onClick={handlePdf}>Экспорт в PDF</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Жабу</button>
        </div>
      </div>
    </div>
  );
}
