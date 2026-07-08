"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getValidAccessToken } from "../../../../lib/auth";
import { api, API_URL, type LpLesson, type LpToolsResponse, type LpStageInput, type LpHeader } from "../../../../lib/api";

const BRAND = "#6B5CE7";
const DARK = "#0D0E1A";

// Месяц → ценность (Адал Азамат), для селектора ценностей (Экран 1).
const VALUE_MONTHS: { month: string; label: string; value: string }[] = [
  { month: "09", label: "Сентябрь", value: "Патриотизм" },
  { month: "10", label: "Октябрь", value: "Доброта" },
  { month: "11", label: "Ноябрь", value: "Трудолюбие" },
  { month: "12", label: "Декабрь", value: "Семья" },
  { month: "01", label: "Январь", value: "Здоровье" },
  { month: "02", label: "Февраль", value: "Дружба" },
  { month: "03", label: "Март", value: "Творчество" },
  { month: "04", label: "Апрель", value: "Природа" },
  { month: "05", label: "Май", value: "Знание" },
];

const STAGE_LABELS: Record<string, string> = {
  warmup: "Разогрев", explanation: "Объяснение", task: "Задание", quiz: "Квиз", reflection: "Рефлексия",
};

const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid #d9d9e3", fontSize: 14, boxSizing: "border-box" };
const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 5, display: "block" };
const card: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: "22px 20px", boxShadow: "0 4px 18px rgba(13,14,26,0.06)", marginBottom: 16 };
const btnPrimary: React.CSSProperties = { background: BRAND, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" };
const btnGhost: React.CSSProperties = { background: "none", border: "1px solid #d9d9e3", color: DARK, borderRadius: 10, padding: "10px 18px", fontSize: 14, cursor: "pointer" };

interface HeaderForm {
  unit: string; teacherName: string; date: string; lessonNumber: string; grade: string;
  presentCount: string; absentCount: string; subject: string; lessonTitle: string; languageFocus: string;
  learningObjectives: string; valueMonth: string; durationMinutes: string;
}

const EMPTY: HeaderForm = {
  unit: "", teacherName: "", date: "", lessonNumber: "", grade: "", presentCount: "", absentCount: "",
  subject: "", lessonTitle: "", languageFocus: "", learningObjectives: "", valueMonth: "", durationMinutes: "45",
};

export default function LessonGeneratorPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [form, setForm] = useState<HeaderForm>(EMPTY);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [genObjLoading, setGenObjLoading] = useState(false);
  const [tools, setTools] = useState<LpToolsResponse | null>(null);
  const [stageSel, setStageSel] = useState<Record<string, { toolId: string; time: number }>>({});
  const [lesson, setLesson] = useState<LpLesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const t = await getValidAccessToken();
      if (!t) { router.replace("/login"); return; }
      setToken(t);
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [router]);

  function set<K extends keyof HeaderForm>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function headerPayload(): LpHeader {
    const codes = form.learningObjectives.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    return {
      unit: form.unit || undefined, teacherName: form.teacherName || undefined, date: form.date || undefined,
      lessonNumber: form.lessonNumber || undefined, grade: form.grade ? Number(form.grade) : undefined,
      presentCount: form.presentCount ? Number(form.presentCount) : undefined,
      absentCount: form.absentCount ? Number(form.absentCount) : undefined,
      subject: form.subject || undefined, lessonTitle: form.lessonTitle || undefined,
      languageFocus: form.languageFocus || undefined, learningObjectives: codes,
      valueMonth: form.valueMonth || undefined, durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : 45,
    };
  }

  async function ensureLesson(): Promise<string> {
    if (!token) throw new Error("no token");
    if (lessonId) { await api.lpUpdate(token, lessonId, headerPayload()); return lessonId; }
    const l = await api.lpCreate(token, headerPayload());
    setLessonId(l.id);
    return l.id;
  }

  async function genObjectives() {
    if (!token) return;
    setError(null);
    const codes = form.learningObjectives.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    if (!codes.length) { setError("Сначала заполните цели обучения (коды)."); return; }
    setGenObjLoading(true);
    try {
      const id = await ensureLesson();
      const obj = await api.lpObjectives(token, id);
      setObjectives(obj);
    } catch (e: unknown) {
      setError("Не удалось сгенерировать цели (нужен ключ ИИ). " + msg(e));
    } finally { setGenObjLoading(false); }
  }

  async function toStep2() {
    if (!token) return;
    setError(null);
    if (!form.subject || !form.lessonTitle || !form.grade) { setError("Заполните обязательные поля: класс, предмет, тема."); return; }
    setBusy(true);
    try {
      await ensureLesson();
      if (!tools) setTools(await api.lpTools(token));
      setStep(2);
    } catch (e) { setError(msg(e)); } finally { setBusy(false); }
  }

  async function chooseMode(mode: "quick" | "constructor") {
    if (mode === "constructor") {
      // init default selections per stage type
      if (tools) {
        const sel: Record<string, { toolId: string; time: number }> = {};
        const timeByType: Record<string, number> = { warmup: 7, explanation: 10, task: 8, quiz: 5, reflection: 5 };
        for (const st of tools.stages) {
          const list = tools.tools[st] ?? [];
          const def = list.find((t) => t.isDefault) ?? list[0];
          if (def) sel[st] = { toolId: def.toolId, time: timeByType[st] ?? 5 };
        }
        setStageSel(sel);
      }
      setStep(3);
    } else {
      await runGenerate("quick");
    }
  }

  async function saveStagesAndGenerate() {
    if (!token || !lessonId || !tools) return;
    const stages: LpStageInput[] = tools.stages
      .filter((st) => stageSel[st])
      .map((st) => ({ stageType: st, toolId: stageSel[st].toolId, timeMinutes: stageSel[st].time }));
    setBusy(true);
    try {
      await api.lpSetStages(token, lessonId, stages);
      await runGenerate("constructor");
    } catch (e) { setError(msg(e)); setBusy(false); }
  }

  async function runGenerate(mode: "quick" | "constructor") {
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      const id = lessonId ?? (await ensureLesson());
      await api.lpGenerate(token, id, mode);
      setStep(4);
      startPolling(id);
    } catch (e) {
      setError("Не удалось запустить генерацию (нужен ключ ИИ). " + msg(e));
      setBusy(false);
    }
  }

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (!token) return;
      try {
        const l = await api.lpGet(token, id);
        if (l.status === "ready" || l.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
          setLesson(l);
          setBusy(false);
          setStep(5);
        }
      } catch { /* keep polling */ }
    }, 2000);
  }

  async function regenStage(sid: string) {
    if (!token || !lessonId) return;
    try {
      await api.lpRegenerateStage(token, lessonId, sid);
      setLesson(await api.lpGet(token, lessonId));
    } catch (e) { setError(msg(e)); }
  }

  if (!token) return <Center>Загрузка…</Center>;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: DARK, color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => (step > 1 && step < 4 ? setStep(step - 1) : router.push("/dashboard/b2c"))} style={{ ...btnGhost, color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>← Назад</button>
        <span style={{ fontWeight: 700 }}>Создать урок (КСП)</span>
        <span style={{ marginLeft: "auto", fontSize: 13, opacity: 0.8 }}>Шаг {Math.min(step, 5)} из 5</span>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
        {error && <div style={{ background: "#fdeaea", border: "1px solid #e0575755", color: DARK, padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {step === 1 && (
          <div>
            <h2 style={{ color: DARK, fontSize: 20, marginTop: 0 }}>Шапка КСП</h2>
            <div style={card}>
              <Grid>
                <Field l="Глава / Раздел"><input style={inp} value={form.unit} onChange={(e) => set("unit", e.target.value)} /></Field>
                <Field l="Имя учителя"><input style={inp} value={form.teacherName} onChange={(e) => set("teacherName", e.target.value)} /></Field>
                <Field l="Дата"><input type="date" style={inp} value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
                <Field l="№ урока"><input style={inp} value={form.lessonNumber} onChange={(e) => set("lessonNumber", e.target.value)} /></Field>
                <Field l="Класс *"><select style={inp} value={form.grade} onChange={(e) => set("grade", e.target.value)}><option value="">—</option>{Array.from({ length: 11 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
                <Field l="Предмет *"><input style={inp} value={form.subject} onChange={(e) => set("subject", e.target.value)} /></Field>
                <Field l="Присутствует"><input type="number" style={inp} value={form.presentCount} onChange={(e) => set("presentCount", e.target.value)} /></Field>
                <Field l="Отсутствует"><input type="number" style={inp} value={form.absentCount} onChange={(e) => set("absentCount", e.target.value)} /></Field>
              </Grid>
              <div style={{ marginTop: 12 }}>
                <Field l="Тема урока *"><input style={inp} value={form.lessonTitle} onChange={(e) => set("lessonTitle", e.target.value)} /></Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <Field l="Языковая цель (для языков)"><input style={inp} value={form.languageFocus} onChange={(e) => set("languageFocus", e.target.value)} /></Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <Field l="Цели обучения (коды, по одному в строке) *">
                  <textarea style={{ ...inp, minHeight: 70, fontFamily: "inherit" }} value={form.learningObjectives} onChange={(e) => set("learningObjectives", e.target.value)} placeholder="7.6.7.1&#10;7.5.4.1" />
                </Field>
              </div>
              <Grid>
                <Field l="Ценности (месяц)">
                  <select style={inp} value={form.valueMonth} onChange={(e) => set("valueMonth", e.target.value)}>
                    <option value="">—</option>
                    {VALUE_MONTHS.map((m) => <option key={m.month} value={m.month}>{m.label} — {m.value}</option>)}
                  </select>
                </Field>
                <Field l="Длительность (мин)"><input type="number" style={inp} value={form.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} /></Field>
              </Grid>
            </div>

            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <strong style={{ color: DARK }}>Цели урока</strong>
                <button onClick={genObjectives} disabled={genObjLoading} style={{ ...btnGhost, opacity: genObjLoading ? 0.6 : 1 }}>
                  {genObjLoading ? "Генерация…" : "Сгенерировать цели урока"}
                </button>
              </div>
              {objectives.length ? (
                objectives.map((o, i) => (
                  <textarea key={i} style={{ ...inp, minHeight: 44, marginBottom: 8, fontFamily: "inherit" }} value={o}
                    onChange={(e) => setObjectives((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} />
                ))
              ) : (
                <div style={{ color: "#6b7280", fontSize: 13 }}>Заполните цели обучения и нажмите «Сгенерировать цели урока».</div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <button onClick={toStep2} disabled={busy} style={btnPrimary}>Далее →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ color: DARK }}>Выберите режим</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <button onClick={() => chooseMode("quick")} disabled={busy} style={{ ...card, cursor: "pointer", textAlign: "left", border: "1px solid #ececf3" }}>
                <div style={{ fontSize: 34 }}>⚡</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: DARK }}>Быстрый урок</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Платформа подберёт инструменты и сразу сгенерирует урок.</div>
              </button>
              <button onClick={() => chooseMode("constructor")} disabled={busy} style={{ ...card, cursor: "pointer", textAlign: "left", border: "1px solid #ececf3" }}>
                <div style={{ fontSize: 34 }}>🧩</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: DARK }}>Собрать самому</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Выберите инструменты и тайминг для каждого этапа.</div>
              </button>
            </div>
          </div>
        )}

        {step === 3 && tools && (
          <div>
            <h2 style={{ color: DARK }}>Конструктор урока</h2>
            {tools.stages.map((st) => (
              <div key={st} style={card}>
                <strong style={{ color: DARK }}>{STAGE_LABELS[st] ?? st}</strong>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {(tools.tools[st] ?? []).map((t) => (
                    <label key={t.toolId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: DARK, cursor: "pointer" }}>
                      <input type="radio" name={st} checked={stageSel[st]?.toolId === t.toolId}
                        onChange={() => setStageSel((s) => ({ ...s, [st]: { toolId: t.toolId, time: s[st]?.time ?? 5 } }))} />
                      {t.nameRu}{t.isDefault && <span style={{ fontSize: 11, color: BRAND, fontWeight: 700 }}>· Рекомендуем</span>}
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>Время (мин):</span>
                  <input type="number" style={{ ...inp, width: 90 }} value={stageSel[st]?.time ?? 5}
                    onChange={(e) => setStageSel((s) => ({ ...s, [st]: { toolId: s[st]?.toolId ?? "", time: Number(e.target.value) } }))} />
                </div>
              </div>
            ))}
            <div style={{ textAlign: "right" }}>
              <button onClick={saveStagesAndGenerate} disabled={busy} style={btnPrimary}>{busy ? "Запуск…" : "Сгенерировать урок"}</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <Center>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 700, color: DARK, fontSize: 18 }}>Генерируем урок…</div>
              <div style={{ color: "#6b7280", fontSize: 14, marginTop: 6 }}>Обычно занимает 20–40 секунд. Не закрывайте страницу.</div>
            </div>
          </Center>
        )}

        {step === 5 && lesson && (
          <LessonView lesson={lesson} onRegen={regenStage} onExport={() => token && downloadExport(lesson, token)} />
        )}
      </main>
    </div>
  );
}

function LessonView({ lesson, onRegen, onExport }: { lesson: LpLesson; onRegen: (sid: string) => void; onExport: () => void }) {
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", background: "#f0f0f7", fontSize: 12, color: "#374151", border: "1px solid #e5e5ee" };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13, color: DARK, border: "1px solid #e5e5ee", verticalAlign: "top" };
  if (lesson.status === "error") {
    return <div style={card}><strong>Ошибка генерации.</strong><div style={{ color: "#6b7280", marginTop: 6 }}>{lesson.generationError ?? "Попробуйте ещё раз."}</div></div>;
  }
  return (
    <div>
      <div style={card}>
        <h2 style={{ marginTop: 0, color: DARK }}>{lesson.lessonTitle || "Урок"}</h2>
        <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
          <div><b>Раздел:</b> {lesson.unit || "—"} · <b>Класс:</b> {lesson.grade ?? "—"} · <b>Предмет:</b> {lesson.subject || "—"}</div>
          <div><b>Учитель:</b> {lesson.teacherName || "—"} · <b>Дата:</b> {lesson.date || "—"} · <b>№:</b> {lesson.lessonNumber || "—"}</div>
          <div><b>Ценность:</b> {lesson.valueLink || "—"}</div>
          {!!lesson.lessonObjectives?.length && <div style={{ marginTop: 6 }}><b>Цели урока:</b><ul style={{ margin: "4px 0", paddingLeft: 18 }}>{lesson.lessonObjectives.map((o, i) => <li key={i}>{o}</li>)}</ul></div>}
          <div><b>Итого баллов:</b> {lesson.totalPoints}/10</div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff" }}>
          <thead><tr><th style={th}>Этап / Время</th><th style={th}>Действия учителя</th><th style={th}>Действия обучающегося</th><th style={th}>Критерии оценивания</th><th style={th}>Ресурсы</th></tr></thead>
          <tbody>
            {(lesson.stages ?? []).map((s) => (
              <tr key={s.id}>
                <td style={td}>
                  <b>{s.stageName || STAGE_LABELS[s.stageType] || s.stageType}</b><br />({s.timeMinutes} мин)
                  <br /><button onClick={() => onRegen(s.id)} style={{ ...btnGhost, padding: "3px 8px", fontSize: 11, marginTop: 6 }}>↻ Перегенерировать</button>
                </td>
                <td style={td}>{s.teacherActions}</td>
                <td style={td}>
                  {s.studentActions}
                  {!!s.descriptors?.length && (
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      <b>Дескрипторы:</b>
                      <ol style={{ margin: "2px 0", paddingLeft: 16 }}>{s.descriptors.map((d) => <li key={d.id}>{d.text}</li>)}</ol>
                      <b>Total: {s.points} points</b>
                    </div>
                  )}
                </td>
                <td style={td}>{s.assessmentCriteria}{s.method ? <div style={{ marginTop: 4 }}><b>Method:</b> {s.method}</div> : null}</td>
                <td style={td}>{s.resources}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button onClick={onExport} style={btnPrimary}>Скачать план урока</button>
        <button disabled title="Скоро" style={{ ...btnGhost, opacity: 0.5, cursor: "not-allowed" }}>Создать презентацию (скоро)</button>
      </div>
    </div>
  );
}

async function downloadExport(lesson: LpLesson, token: string) {
  // №130 export (.docx) from the API.
  const res = await fetch(`${API_URL}/lesson-plans/${lesson.id}/export`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `ksp-${lesson.id}.docx`; a.click();
  URL.revokeObjectURL(url);
}

function Field({ l, children }: { l: string; children: React.ReactNode }) {
  return <div><span style={label}>{l}</span>{children}</div>;
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}
function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>{children}</div>;
}
function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
