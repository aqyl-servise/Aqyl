"use client";
import { useState, useEffect, useCallback } from "react";
import { api, AuthUser, API_URL } from "../../lib/api";
import { Language } from "../../lib/translations";
import { handleError } from "../../lib/handle-error";

interface StudentRef {
  id: string;
  fullName: string;
}

type GroupKey = "excellent" | "good" | "failing";

interface MalimetState {
  lang: "kz" | "ru";
  quarter: 1 | 2 | 3 | 4;
  classroomName: string;
  academicYear: string;
  teacherFullName: string;
  startCount: number;
  startGirlCount: number;
  arrivedCount: number;
  arrivedFrom: string;
  leftCount: number;
  leftTo: string;
  endCount: number;
  endCountOverridden: boolean;
  endGirlCount: number;
  excellentStudents: StudentRef[];
  excellentGirls: number;
  goodStudents: StudentRef[];
  goodGirls: number;
  failingStudents: StudentRef[];
  failingGirls: number;
}

// ── Student group input (defined outside to avoid re-mount on parent render) ──

interface StudentGroupProps {
  students: StudentRef[];
  girlCount: number;
  label: string;
  addLabel: string;
  girlsLabel: string;
  onGirlCountChange: (v: number) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

function StudentGroupInput({
  students, girlCount, label, addLabel, girlsLabel,
  onGirlCountChange, onRemove, onAdd,
}: StudentGroupProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{label}</span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{students.length} чел.</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
        <label style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{girlsLabel}:</label>
        <input
          type="number" min={0} max={students.length}
          className="input" style={{ width: 70, padding: "3px 6px" }}
          value={girlCount}
          onChange={e => onGirlCountChange(parseInt(e.target.value) || 0)}
        />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
        {students.map(s => (
          <span key={s.id} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 14, padding: "2px 10px", fontSize: 12,
          }}>
            {s.fullName}
            <button
              onClick={() => onRemove(s.id)}
              style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", padding: 0, fontSize: 16, lineHeight: 1, marginLeft: 2 }}
              title="Удалить"
            >×</button>
          </span>
        ))}
      </div>
      <button className="btn btn-outline btn-sm" onClick={onAdd}>+ {addLabel}</button>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function MalimetPanel({ token, language, teacher }: {
  token: string;
  language: Language;
  teacher: AuthUser;
}) {
  const [state, setState] = useState<MalimetState>({
    lang: language === "kz" ? "kz" : "ru",
    quarter: 1,
    classroomName: teacher.managedClassroomName ?? "",
    academicYear: "",
    teacherFullName: teacher.fullName,
    startCount: 0,
    startGirlCount: 0,
    arrivedCount: 0,
    arrivedFrom: "",
    leftCount: 0,
    leftTo: "",
    endCount: 0,
    endCountOverridden: false,
    endGirlCount: 0,
    excellentStudents: [],
    excellentGirls: 0,
    goodStudents: [],
    goodGirls: 0,
    failingStudents: [],
    failingGirls: 0,
  });

  const [classroomStudents, setClassroomStudents] = useState<StudentRef[]>([]);
  const [addingTo, setAddingTo] = useState<GroupKey | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSelected, setPickerSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "word" | null>(null);
  const [saveMsg, setSaveMsg] = useState("");

  const update = useCallback((fields: Partial<MalimetState>) =>
    setState(prev => ({ ...prev, ...fields })), []);

  // Fetch prefill + students on mount
  useEffect(() => {
    const classroomId = teacher.managedClassroomId;
    if (!classroomId) { setLoading(false); return; }
    Promise.all([
      api.malimetPrefill(token, 1),
      api.getStudents(token, classroomId),
    ]).then(([prefill, students]) => {
      const refs: StudentRef[] = students.map(s => ({ id: s.id, fullName: s.fullName }));
      setClassroomStudents(refs);
      setState(prev => ({
        ...prev,
        academicYear: prefill.academicYear,
        startCount: students.length,
        endCount: students.length,
      }));
    }).catch(err => handleError(err, 'Не удалось загрузить данные')).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, teacher.managedClassroomId]);

  // Auto-calculate endCount when not overridden
  useEffect(() => {
    setState(prev => {
      if (prev.endCountOverridden) return prev;
      const auto = prev.startCount + prev.arrivedCount - prev.leftCount;
      return auto === prev.endCount ? prev : { ...prev, endCount: auto };
    });
  }, [state.startCount, state.arrivedCount, state.leftCount, state.endCountOverridden]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const usedStudentIds = new Set([
    ...state.excellentStudents.map(s => s.id),
    ...state.goodStudents.map(s => s.id),
    ...state.failingStudents.map(s => s.id),
  ]);

  function openPicker(group: GroupKey) {
    setAddingTo(group);
    setPickerSearch("");
    setPickerSelected([]);
  }

  function closePicker() {
    setAddingTo(null);
    setPickerSearch("");
    setPickerSelected([]);
  }

  function confirmPicker() {
    if (!addingTo) return;
    const toAdd = classroomStudents.filter(s => pickerSelected.includes(s.id));
    if (addingTo === "excellent") update({ excellentStudents: [...state.excellentStudents, ...toAdd] });
    else if (addingTo === "good") update({ goodStudents: [...state.goodStudents, ...toAdd] });
    else update({ failingStudents: [...state.failingStudents, ...toAdd] });
    closePicker();
  }

  function removeStudent(group: GroupKey, id: string) {
    if (group === "excellent") update({ excellentStudents: state.excellentStudents.filter(s => s.id !== id) });
    else if (group === "good") update({ goodStudents: state.goodStudents.filter(s => s.id !== id) });
    else update({ failingStudents: state.failingStudents.filter(s => s.id !== id) });
  }

  function buildFormData() {
    return {
      classroomId: teacher.managedClassroomId ?? "",
      classroomName: state.classroomName,
      quarter: state.quarter,
      academicYear: state.academicYear,
      teacherFullName: state.teacherFullName,
      startCount: state.startCount,
      startGirlCount: state.startGirlCount,
      arrivedCount: state.arrivedCount,
      arrivedFrom: state.arrivedFrom,
      leftCount: state.leftCount,
      leftTo: state.leftTo,
      endCount: state.endCount,
      endGirlCount: state.endGirlCount,
      excellent: { students: state.excellentStudents, girlCount: state.excellentGirls },
      good: { students: state.goodStudents, girlCount: state.goodGirls },
      failing: { students: state.failingStudents, girlCount: state.failingGirls },
    };
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    try {
      await api.saveMalimet(token, { formData: buildFormData(), lang: state.lang });
      setSaveMsg("✓ Сохранено");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch { setSaveMsg("Ошибка сохранения"); }
    setSaving(false);
  }

  async function handleDownload(format: "pdf" | "word") {
    setDownloading(format);
    try {
      const res = await fetch(`${API_URL}/malimet/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ formData: buildFormData(), format, lang: state.lang }),
      });
      if (!res.ok) { handleError(new Error('Ошибка генерации документа'), 'Ошибка генерации документа'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `malimet_${state.classroomName.replace(/\s/g, "")}_Q${state.quarter}.${format === "pdf" ? "pdf" : "docx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { handleError(err, 'Не удалось скачать документ'); }
    setDownloading(null);
  }

  // ── Labels ────────────────────────────────────────────────────────────────

  const isKz = state.lang === "kz";
  const L = {
    title: isKz ? "Мәлімет" : "Сведения",
    classWord: isKz ? "сынып" : "класс",
    quarterWord: isKz ? "тоқсан" : "четверть",
    yearWord: isKz ? "оқу жылы" : "учебный год",
    startLabel: isKz ? "Тоқсан басындағы оқушылар саны:" : "Кол-во учащихся на начало четверти:",
    girlsStart: isKz ? "оның ішіндегі қыздар" : "из них девочек",
    girlsOf: isKz ? "оның ішінде қыздар" : "из них девочек",
    arrivedLabel: isKz ? "Келген оқушылар:" : "Прибыло учащихся:",
    fromWhere: isKz ? "қайдан (республикасы, облысы, ауданы, мектебі):" : "откуда (республика, область, район, школа):",
    leftLabel: isKz ? "Кеткен оқушылар:" : "Выбыло учащихся:",
    toWhere: isKz ? "қайда (республикасы, облысы, ауданы, мектебі):" : "куда (республика, область, район, школа):",
    endLabel: isKz ? "Тоқсан соңындағы оқушылар саны:" : "Кол-во учащихся на конец четверти:",
    excellentLabel: isKz ? "Өте жақсы оқитын оқушылар:" : "Отличники:",
    goodLabel: isKz ? "Жақсы оқитын оқушылар:" : "Ударники:",
    failingLabel: isKz ? "Үлгермейтін оқушылар:" : "Неуспевающие:",
    teacherLabel: isKz ? "Сынып жетекшісі:" : "Классный руководитель:",
    signLabel: isKz ? "(қолы)" : "(подпись)",
    nameLabel: isKz ? "(аты-жөні)" : "(ФИО)",
    addStudent: isKz ? "Оқушы қосу" : "Добавить ученика",
    confirm: isKz ? "Растау" : "Подтвердить",
    girls: isKz ? "Қыздар" : "Девочек",
    cancel: isKz ? "Болдырмау" : "Отмена",
    allStudents: isKz ? "Барлығы" : "Всего",
    girls2: isKz ? "Қыздар" : "Девочек",
    start: isKz ? "Тоқсан басы" : "Начало четверти",
    arrivedLeft: isKz ? "Келді / Кетті" : "Прибыло / Выбыло",
    arrived: isKz ? "Келді" : "Прибыло",
    left: isKz ? "Кетті" : "Выбыло",
    from: isKz ? "Қайдан" : "Откуда",
    to: isKz ? "Қайда" : "Куда",
    end: isKz ? "Тоқсан соңы" : "Конец четверти",
    class: isKz ? "Сынып" : "Класс",
    academicYear: isKz ? "Оқу жылы" : "Учебный год",
    teacher: isKz ? "Сынып жетекшісі" : "Классный руководитель",
    autoReset: isKz ? "↺ Авто" : "↺ Авто",
    excellent: isKz ? "Өте жақсы оқитын оқушылар" : "Отличники",
    good: isKz ? "Жақсы оқитын оқушылар" : "Ударники",
    failing: isKz ? "Үлгермейтін оқушылар" : "Неуспевающие",
  };

  const filteredPickerStudents = classroomStudents.filter(s =>
    s.fullName.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  // ── Guard: no classroom ───────────────────────────────────────────────────

  if (!teacher.managedClassroomId) {
    return (
      <div className="page">
        <h1 className="page-title">📋 {L.title}</h1>
        <div className="card"><p className="fm-empty">Вы не являетесь классным руководителем.</p></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <h1 className="page-title">📋 {L.title}</h1>
        <div className="card"><p className="fm-empty">Загрузка...</p></div>
      </div>
    );
  }

  // ── Preview helpers ───────────────────────────────────────────────────────

  const pTd: React.CSSProperties = { fontWeight: "bold", width: "55%", padding: "4px 8px", verticalAlign: "top" };
  const pTdV: React.CSSProperties = { padding: "4px 8px", verticalAlign: "top" };
  const pTable: React.CSSProperties = { width: "100%", borderCollapse: "collapse", marginBottom: 4 };

  const previewGroups = [
    { label: L.excellentLabel, count: state.excellentStudents.length, girls: state.excellentGirls, students: state.excellentStudents },
    { label: L.goodLabel, count: state.goodStudents.length, girls: state.goodGirls, students: state.goodStudents },
    { label: L.failingLabel, count: state.failingStudents.length, girls: state.failingGirls, students: state.failingStudents },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <style>{`
        @media print {
          body > *:not(.malimet-print-target) { display: none !important; }
          .malimet-print-target { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; background: #fff; }
        }
      `}</style>

      <div className="page-header" style={{ marginBottom: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          📋 {isKz ? "Мәлімет / Сведения" : "Сведения / Мәлімет"}
        </h1>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* ── Left: Form ────────────────────────────────────────────── */}
        <div className="card" style={{ flex: "0 0 44%", maxWidth: 440, padding: 16 }}>

          {/* Lang toggle + Quarter */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {(["kz", "ru"] as const).map(l => (
                <button key={l} className={`btn btn-sm ${state.lang === l ? "btn-primary" : "btn-outline"}`}
                  onClick={() => update({ lang: l })}>
                  {l === "kz" ? "ҚАЗ" : "РУС"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {([1, 2, 3, 4] as const).map(q => (
                <button key={q} className={`btn btn-sm ${state.quarter === q ? "btn-primary" : "btn-outline"}`}
                  onClick={() => update({ quarter: q })}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Class name + academic year */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>{L.class}</label>
              <input className="input" value={state.classroomName}
                onChange={e => update({ classroomName: e.target.value })} style={{ marginTop: 2 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>{L.academicYear}</label>
              <input className="input" value={state.academicYear}
                onChange={e => update({ academicYear: e.target.value })} style={{ marginTop: 2 }} />
            </div>
          </div>

          {/* Start counts */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>{L.start}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "var(--muted)" }}>{L.allStudents}</label>
                <input type="number" min={0} className="input"
                  value={state.startCount} onChange={e => update({ startCount: parseInt(e.target.value) || 0 })}
                  style={{ marginTop: 2 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "var(--muted)" }}>{L.girls2}</label>
                <input type="number" min={0} className="input"
                  value={state.startGirlCount} onChange={e => update({ startGirlCount: parseInt(e.target.value) || 0 })}
                  style={{ marginTop: 2 }} />
              </div>
            </div>
          </div>

          {/* Arrived / Left */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>{L.arrivedLeft}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: "0 0 80px" }}>
                <label style={{ fontSize: 11, color: "var(--muted)" }}>{L.arrived}</label>
                <input type="number" min={0} className="input"
                  value={state.arrivedCount} onChange={e => update({ arrivedCount: parseInt(e.target.value) || 0 })}
                  style={{ marginTop: 2 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "var(--muted)" }}>{L.from}</label>
                <input className="input" value={state.arrivedFrom}
                  onChange={e => update({ arrivedFrom: e.target.value })}
                  style={{ marginTop: 2 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: "0 0 80px" }}>
                <label style={{ fontSize: 11, color: "var(--muted)" }}>{L.left}</label>
                <input type="number" min={0} className="input"
                  value={state.leftCount} onChange={e => update({ leftCount: parseInt(e.target.value) || 0 })}
                  style={{ marginTop: 2 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "var(--muted)" }}>{L.to}</label>
                <input className="input" value={state.leftTo}
                  onChange={e => update({ leftTo: e.target.value })}
                  style={{ marginTop: 2 }} />
              </div>
            </div>
          </div>

          {/* End counts */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>{L.end}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "var(--muted)" }}>
                  {L.allStudents}
                  {!state.endCountOverridden && (
                    <span style={{ marginLeft: 4, color: "var(--primary)", fontSize: 10 }}>⚡ авто</span>
                  )}
                </label>
                <input type="number" min={0} className="input"
                  value={state.endCount}
                  onChange={e => update({ endCount: parseInt(e.target.value) || 0, endCountOverridden: true })}
                  style={{ marginTop: 2 }} />
                {state.endCountOverridden && (
                  <button
                    style={{ fontSize: 10, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}
                    onClick={() => update({ endCountOverridden: false })}
                  >{L.autoReset}</button>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "var(--muted)" }}>{L.girls2}</label>
                <input type="number" min={0} className="input"
                  value={state.endGirlCount} onChange={e => update({ endGirlCount: parseInt(e.target.value) || 0 })}
                  style={{ marginTop: 2 }} />
              </div>
            </div>
          </div>

          {/* Student groups */}
          <div style={{ paddingTop: 10, borderTop: "1px solid var(--border)", marginBottom: 12 }}>
            <StudentGroupInput
              students={state.excellentStudents} girlCount={state.excellentGirls}
              label={L.excellent} addLabel={L.addStudent} girlsLabel={L.girls}
              onGirlCountChange={v => update({ excellentGirls: v })}
              onRemove={id => removeStudent("excellent", id)}
              onAdd={() => openPicker("excellent")}
            />
            <StudentGroupInput
              students={state.goodStudents} girlCount={state.goodGirls}
              label={L.good} addLabel={L.addStudent} girlsLabel={L.girls}
              onGirlCountChange={v => update({ goodGirls: v })}
              onRemove={id => removeStudent("good", id)}
              onAdd={() => openPicker("good")}
            />
            <StudentGroupInput
              students={state.failingStudents} girlCount={state.failingGirls}
              label={L.failing} addLabel={L.addStudent} girlsLabel={L.girls}
              onGirlCountChange={v => update({ failingGirls: v })}
              onRemove={id => removeStudent("failing", id)}
              onAdd={() => openPicker("failing")}
            />
          </div>

          {/* Teacher name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "var(--muted)" }}>{L.teacher}</label>
            <input className="input" value={state.teacherFullName}
              onChange={e => update({ teacherFullName: e.target.value })}
              style={{ marginTop: 2 }} />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? "..." : (isKz ? "Сақтау" : "Сохранить")}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => handleDownload("word")} disabled={!!downloading}>
              {downloading === "word" ? "..." : "Word"}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => handleDownload("pdf")} disabled={!!downloading}>
              {downloading === "pdf" ? "..." : "PDF"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
              🖨
            </button>
          </div>
          {saveMsg && (
            <p style={{ marginTop: 8, fontSize: 12, color: saveMsg.startsWith("✓") ? "var(--success, #16a34a)" : "var(--danger, #ef4444)" }}>
              {saveMsg}
            </p>
          )}
        </div>

        {/* ── Right: Preview ───────────────────────────────────────── */}
        <div style={{ flex: 1, overflowX: "auto" }}>
          <div
            className="malimet-print-target"
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: 12,
              lineHeight: 1.6,
              color: "#000",
              background: "#fff",
              padding: "2cm 2cm 2cm 2.5cm",
              minHeight: "29.7cm",
              width: "21cm",
              boxShadow: "0 2px 16px rgba(0,0,0,0.15)",
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
          >
            <h2 style={{ textAlign: "center", fontWeight: "bold", fontSize: 14, marginBottom: 4, marginTop: 0 }}>
              {L.title}
            </h2>
            <p style={{ textAlign: "center", fontSize: 12, marginBottom: 20, marginTop: 0 }}>
              {state.classroomName} {L.classWord} &nbsp;&nbsp;&nbsp;
              {state.quarter} {L.quarterWord} &nbsp;&nbsp;&nbsp;
              {state.academicYear} {L.yearWord}
            </p>

            <table style={pTable}>
              <tbody>
                <tr><td style={pTd}>{L.startLabel}</td>
                  <td style={pTdV}>{state.startCount} ({L.girlsStart}: {state.startGirlCount})</td></tr>
                <tr><td style={pTd}>{L.arrivedLabel}</td>
                  <td style={pTdV}>{state.arrivedCount} {L.fromWhere} {state.arrivedFrom || "_________________________"}</td></tr>
                <tr><td style={pTd}>{L.leftLabel}</td>
                  <td style={pTdV}>{state.leftCount} {L.toWhere} {state.leftTo || "_________________________"}</td></tr>
                <tr><td style={pTd}>{L.endLabel}</td>
                  <td style={pTdV}>{state.endCount} ({L.girlsOf}: {state.endGirlCount})</td></tr>
              </tbody>
            </table>

            {previewGroups.map(g => (
              <div key={g.label} style={{ marginTop: 10 }}>
                <table style={pTable}>
                  <tbody>
                    <tr>
                      <td style={pTd}>{g.label}</td>
                      <td style={pTdV}>{g.count} ({L.girlsOf}: {g.girls})</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginLeft: 20, marginBottom: 6 }}>
                  {g.students.map((s, i) => (
                    <p key={s.id} style={{ margin: "2px 0", fontSize: 12 }}>{i + 1}. {s.fullName}</p>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ marginTop: 40 }}>
              <p style={{ margin: 0, fontSize: 12 }}>
                <strong>{L.teacherLabel}</strong>
                {" "}
                <span style={{
                  display: "inline-block", width: 180,
                  borderBottom: "1px solid #000", marginRight: 10, verticalAlign: "bottom",
                }}></span>
                {state.teacherFullName}
              </p>
              <p style={{ fontSize: 10, color: "#555", marginLeft: 150, marginTop: 2 }}>
                {L.signLabel} &nbsp;&nbsp;&nbsp;&nbsp; {L.nameLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Student Picker Modal ────────────────────────────────────── */}
      {addingTo && (
        <div className="modal-overlay" onClick={closePicker}>
          <div className="modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>
              {L.addStudent} —{" "}
              {addingTo === "excellent" ? L.excellent : addingTo === "good" ? L.good : L.failing}
            </h3>
            <input
              className="input" style={{ marginBottom: 10 }}
              placeholder="🔍 Поиск..."
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              autoFocus
            />
            <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 12 }}>
              {filteredPickerStudents.length === 0 ? (
                <p className="fm-empty">Нет учеников</p>
              ) : (
                <table className="data-table">
                  <tbody>
                    {filteredPickerStudents.map((s, idx) => {
                      const isUsed = usedStudentIds.has(s.id);
                      return (
                        <tr key={s.id} style={{ opacity: isUsed ? 0.4 : 1 }}>
                          <td style={{ width: 32, color: "var(--muted)", fontSize: 12 }}>{idx + 1}</td>
                          <td style={{ fontSize: 13 }}>{s.fullName}</td>
                          <td style={{ width: 36 }}>
                            {!isUsed && (
                              <input type="checkbox"
                                checked={pickerSelected.includes(s.id)}
                                onChange={() => setPickerSelected(prev =>
                                  prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                                )}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={closePicker}>{L.cancel}</button>
              <button className="btn btn-primary btn-sm" onClick={confirmPicker} disabled={pickerSelected.length === 0}>
                {L.confirm} ({pickerSelected.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
