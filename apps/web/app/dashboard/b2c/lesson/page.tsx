"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getValidAccessToken } from "../../../../lib/auth";
import { api, API_URL, type LpLesson, type LpToolsResponse, type LpStageInput, type LpHeader, type LpHandout, type LpHandoutPackage, type LpCost } from "../../../../lib/api";
import { useLang, LT, VALUE_MONTHS, type Lang } from "../../../../lib/lesson-translations";
import { LangSwitcher } from "../../../../components/lang-switcher";
import { Icon } from "../../../../components/ui/icon";

// Бренд-токены применяются через класс .aqyl-b2c на корне (см. globals.css).
const BRAND = "var(--lavender)";
const DARK = "var(--white)";

const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid var(--line)", background: "var(--ink)", color: "var(--white)", fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" };
const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--white)", marginBottom: 5, display: "block" };
const card: React.CSSProperties = { background: "var(--ink-2)", borderRadius: 14, padding: "22px 20px", border: "1px solid var(--line)", marginBottom: 16 };
const btnPrimary: React.CSSProperties = { background: "var(--amber)", color: "var(--on-amber)", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const btnGhost: React.CSSProperties = { background: "rgba(139,127,232,.12)", border: "1px solid var(--line)", color: "var(--lavender)", borderRadius: 10, padding: "10px 18px", fontSize: 14, cursor: "pointer", fontFamily: "inherit" };
const radioRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--white)", cursor: "pointer" };
const recBadge: React.CSSProperties = { fontSize: 11, color: "var(--lavender)", fontWeight: 700 };

type T = Record<string, string>;

interface HeaderForm {
  unit: string; teacherName: string; date: string; lessonNumber: string; grade: string;
  presentCount: string; absentCount: string; subject: string; lessonTitle: string; languageFocus: string;
  learningObjectives: string; valueMonth: string; durationMinutes: string; language: string;
}
const EMPTY: HeaderForm = {
  unit: "", teacherName: "", date: "", lessonNumber: "", grade: "", presentCount: "", absentCount: "",
  subject: "", lessonTitle: "", languageFocus: "", learningObjectives: "", valueMonth: "", durationMinutes: "45",
  language: "kz",
};

// Состояние конструктора (срез 2). Этап «Задание» — массив заданий (мультивыбор),
// у каждого свои флаги оцениваемости и привязки к ценности. Квиз — необязательный.
interface ConsTask { toolId: string; time: number; isAssessed: boolean; linkedToValue: boolean }
interface ConsState {
  warmup: { toolId: string; time: number; linkedToValue: boolean };
  explanation: { toolId: string; time: number; linkedToValue: boolean };
  tasks: ConsTask[];
  quiz: { enabled: boolean; toolId: string; time: number; isAssessed: boolean };
  reflection: { toolId: string; time: number };
}

export default function LessonGeneratorPage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [form, setForm] = useState<HeaderForm>(EMPTY);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [genObjLoading, setGenObjLoading] = useState(false);
  const [tools, setTools] = useState<LpToolsResponse | null>(null);
  const [cons, setCons] = useState<ConsState | null>(null);
  const [lesson, setLesson] = useState<LpLesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // id этапа, который сейчас перегенерируется: индикатор на самом этапе и
  // защита от параллельных запросов по одному уроку.
  const [regenId, setRegenId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const tk = await getValidAccessToken();
      if (!tk) { router.replace("/login"); return; }
      setToken(tk);
      // Имя учителя подставляется из профиля и остаётся редактируемым:
      // КСП можно составлять и для коллеги. Пустое поле не перетираем.
      try {
        const me = await api.getB2CMe(tk);
        if (me?.fullName) setForm((f) => (f.teacherName ? f : { ...f, teacherName: me.fullName }));
      } catch { /* профиль не критичен для формы */ }
    })();
    // Тема, переданная с дашборда (/dashboard/b2c/lesson?topic=…), сразу подставляется в «Тему урока».
    setForm((f) => ({ ...f, language: lang }));
    const qs = new URLSearchParams(window.location.search);
    const topic = qs.get("topic");
    if (topic) setForm((f) => ({ ...f, lessonTitle: topic }));

    // Открытие существующего урока из «Моих материалов». Возвращаем учителя в
    // ту точку, где работа прервалась: готовый — на просмотр, ошибку — на
    // повтор, черновик — на заполненную шапку, чтобы можно было продолжить.
    const openId = qs.get("id");
    if (openId) {
      (async () => {
        const tk = await getValidAccessToken();
        if (!tk) return;
        try {
          const l = await api.lpGet(tk, openId);
          setLessonId(l.id);
          setLesson(l);
          setForm((f) => ({
            ...f,
            unit: l.unit ?? "", teacherName: l.teacherName ?? "", date: l.date ?? "",
            lessonNumber: l.lessonNumber ?? "", grade: l.grade ? String(l.grade) : "",
            presentCount: l.presentCount != null ? String(l.presentCount) : "",
            absentCount: l.absentCount != null ? String(l.absentCount) : "",
            subject: l.subject ?? "", lessonTitle: l.lessonTitle ?? "",
            languageFocus: l.languageFocus ?? "",
            learningObjectives: (l.learningObjectives ?? []).join("\n"),
            valueMonth: l.valueMonth ?? "",
            durationMinutes: String(l.durationMinutes ?? 45),
            language: l.language ?? "kz",
          }));
          if (l.lessonObjectives?.length) setObjectives(l.lessonObjectives);
          // Шаг 5 — просмотр плана; шаг 4 — экран ожидания генерации. Готовый
          // урок открывался на шаге 4 и висел на «Генерируем урок…» навсегда:
          // опрос статуса там не запускается, потому что генерация уже прошла.
          setStep(l.status === "ready" || l.status === "error" ? 5 : 1);
        } catch {
          setError(t.errLoad ?? "Не удалось открыть урок");
        }
      })();
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [router, lang]);

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
      language: form.language,
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
    if (!codes.length) { setError(t.reqCodes); return; }
    setGenObjLoading(true);
    try {
      const id = await ensureLesson();
      setObjectives(await api.lpObjectives(token, id));
    } catch (e) { setError(t.errNoAiObj + msg(e)); }
    finally { setGenObjLoading(false); }
  }

  async function toStep2() {
    if (!token) return;
    setError(null);
    if (!form.subject || !form.lessonTitle || !form.grade) { setError(t.reqFields); return; }
    setBusy(true);
    try {
      await ensureLesson();
      if (!tools) setTools(await api.lpTools(token));
      setStep(2);
    } catch (e) { setError(msg(e)); } finally { setBusy(false); }
  }

  async function chooseMode(mode: "quick" | "constructor") {
    if (mode === "constructor") {
      if (tools) setCons(initCons(tools));
      setStep(3);
    } else { await runGenerate("quick"); }
  }

  // Точечные обновления заданий в конструкторе.
  function updTask(i: number, patch: Partial<ConsTask>) {
    setCons((c) => (c ? { ...c, tasks: c.tasks.map((tk, j) => (j === i ? { ...tk, ...patch } : tk)) } : c));
  }
  function addTaskRow() {
    setCons((c) => {
      if (!c || !tools) return c;
      const used = c.tasks.map((t) => t.toolId);
      return { ...c, tasks: [...c.tasks, { toolId: firstToolId(tools, "task", used), time: 8, isAssessed: true, linkedToValue: false }] };
    });
  }
  function removeTaskRow(i: number) {
    setCons((c) => (c ? { ...c, tasks: c.tasks.filter((_, j) => j !== i) } : c));
  }

  async function saveStagesAndGenerate() {
    if (!token || !lessonId || !cons) return;
    const aCount = assessedCount(cons);
    if (aCount < 2) { setError(t.needTwoAssessed.replace("{n}", String(aCount))); return; }
    setBusy(true);
    try { await api.lpSetStages(token, lessonId, flattenCons(cons)); await runGenerate("constructor"); }
    catch (e) { setError(msg(e)); setBusy(false); }
  }

  async function runGenerate(mode: "quick" | "constructor") {
    if (!token) return;
    setError(null); setBusy(true);
    try {
      const id = lessonId ?? (await ensureLesson());
      await api.lpGenerate(token, id, mode);
      setStep(4);
      startPolling(id);
    } catch (e) { setError(t.errNoAiGen + msg(e)); setBusy(false); }
  }

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (!token) return;
      try {
        const l = await api.lpGet(token, id);
        if (l.status === "ready" || l.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
          setLesson(l); setBusy(false); setStep(5);
        }
      } catch { /* keep polling */ }
    }, 2000);
  }

  /**
   * Перегенерация одного этапа. Занимает столько же, сколько генерация этапа
   * при сборке урока, поэтому без индикатора клик выглядел как «ничего не
   * произошло», а ошибка молча уходила в общий баннер наверху страницы.
   */
  async function regenStage(sid: string) {
    if (!token || !lessonId || regenId) return;
    setError(null);
    setRegenId(sid);
    try {
      await api.lpRegenerateStage(token, lessonId, sid);
      setLesson(await api.lpGet(token, lessonId));
    } catch (e) {
      setError(t.regenFailed + msg(e));
    } finally {
      setRegenId(null);
    }
  }

  if (!token) return <Center>{t.loading}</Center>;

  return (
    <div className="aqyl-b2c" style={{ minHeight: "100vh" }}>
      <header style={{ background: "var(--ink-2)", color: "var(--white)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--line)" }}>
        <button onClick={() => (step > 1 && step < 4 ? setStep(step - 1) : router.push("/dashboard/b2c"))} style={{ ...btnGhost, color: "var(--white)" }}>← {t.back}</button>
        <span style={{ fontWeight: 700 }}>{t.genTitle}</span>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--muted)" }}>{t.stepOf.replace("{n}", String(Math.min(step, 5)))}</span>
        <LangSwitcher lang={lang} setLang={setLang} dark />
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
        {error && <div style={{ background: "var(--ink-2)", border: "1px solid var(--danger)", color: "var(--white)", padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {step === 1 && (
          <div>
            <h2 style={{ color: DARK, fontSize: 20, marginTop: 0 }}>{t.headerTitle}</h2>
            <div style={card}>
              <Grid>
                <Field l={t.fUnit}><input style={inp} value={form.unit} onChange={(e) => set("unit", e.target.value)} /></Field>
                <Field l={t.fTeacher}><input style={inp} value={form.teacherName} onChange={(e) => set("teacherName", e.target.value)} /></Field>
                <Field l={t.fDate}><input type="date" style={inp} value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
                <Field l={t.fLessonNo}><input style={inp} value={form.lessonNumber} onChange={(e) => set("lessonNumber", e.target.value)} /></Field>
                <Field l={t.fGrade}><select style={inp} value={form.grade} onChange={(e) => set("grade", e.target.value)}><option value="">—</option>{Array.from({ length: 11 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
                <Field l={t.fSubject}><input style={inp} value={form.subject} onChange={(e) => set("subject", e.target.value)} /></Field>
                <Field l={t.fPresent}><input type="number" style={inp} value={form.presentCount} onChange={(e) => set("presentCount", e.target.value)} /></Field>
                <Field l={t.fAbsent}><input type="number" style={inp} value={form.absentCount} onChange={(e) => set("absentCount", e.target.value)} /></Field>
              </Grid>
              <div style={{ marginTop: 12 }}>
                <Field l={t.fTitle}><input style={inp} value={form.lessonTitle} onChange={(e) => set("lessonTitle", e.target.value)} /></Field>
                {/* Содержимое темы уходит поставщику модели за пределы РК —
                    без идентификаторов это не передача персональных данных. */}
                <p style={{ color: "var(--muted)", fontSize: 12, margin: "5px 0 0" }}>{t.noStudentNames}</p>
              </div>
              {/* Язык урока определяет язык ВСЕГО сгенерированного содержания.
                  Отдельно от языка интерфейса: учитель может вести урок на
                  казахском, работая в русском интерфейсе. */}
              <div style={{ marginTop: 12 }}>
                <Field l={t.fLessonLang}>
                  <select style={inp} value={form.language} onChange={(e) => set("language", e.target.value)}>
                    <option value="kz">Қазақша</option>
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                  </select>
                </Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <Field l={t.fLangFocus}>
                  <input style={inp} value={form.languageFocus} onChange={(e) => set("languageFocus", e.target.value)} placeholder={t.fLangFocusHint} />
                </Field>
              </div>
              <div style={{ marginTop: 12 }}><Field l={t.fLearnObj}><textarea style={{ ...inp, minHeight: 70, fontFamily: "inherit" }} value={form.learningObjectives} onChange={(e) => set("learningObjectives", e.target.value)} placeholder="7.6.7.1&#10;7.5.4.1" /></Field></div>
              <Grid>
                <Field l={t.fValues}>
                  <select style={inp} value={form.valueMonth} onChange={(e) => set("valueMonth", e.target.value)}>
                    <option value="">—</option>
                    {VALUE_MONTHS.map((m) => <option key={m.month} value={m.month}>{m.label[lang]} — {m.value[lang]}</option>)}
                  </select>
                </Field>
                <Field l={t.fDuration}><input type="number" style={inp} value={form.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} /></Field>
              </Grid>
            </div>

            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <strong style={{ color: DARK }}>{t.lessonObjectives}</strong>
                <button onClick={genObjectives} disabled={genObjLoading} style={{ ...btnGhost, opacity: genObjLoading ? 0.6 : 1 }}>{genObjLoading ? t.generating : t.genObjectives}</button>
              </div>
              {objectives.length ? objectives.map((o, i) => (
                <textarea key={i} style={{ ...inp, minHeight: 44, marginBottom: 8, fontFamily: "inherit" }} value={o} onChange={(e) => setObjectives((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} />
              )) : <div style={{ color: "var(--muted)", fontSize: 13 }}>{t.objHint}</div>}
            </div>

            <div style={{ textAlign: "right" }}><button onClick={toStep2} disabled={busy} style={btnPrimary}>{t.next}</button></div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ color: DARK }}>{t.chooseMode}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <button onClick={() => chooseMode("quick")} disabled={busy} style={{ ...card, cursor: "pointer", textAlign: "left", border: "1px solid var(--line)" }}>
                <div style={{ marginBottom: 6, color: "var(--amber)" }}><Icon name="bolt" size={32} strokeWidth={1.4} /></div><div style={{ fontWeight: 800, fontSize: 18, color: DARK }}>{t.quickMode}</div><div style={{ fontSize: 13, color: "var(--muted)" }}>{t.quickModeSub}</div>
              </button>
              <button onClick={() => chooseMode("constructor")} disabled={busy} style={{ ...card, cursor: "pointer", textAlign: "left", border: "1px solid var(--line)" }}>
                <div style={{ marginBottom: 6, color: "var(--lavender)" }}><Icon name="puzzle" size={32} strokeWidth={1.4} /></div><div style={{ fontWeight: 800, fontSize: 18, color: DARK }}>{t.constructorMode}</div><div style={{ fontSize: 13, color: "var(--muted)" }}>{t.constructorModeSub}</div>
              </button>
            </div>
          </div>
        )}

        {step === 3 && tools && cons && (() => {
          const aCount = assessedCount(cons);
          const hasValue = !!form.valueMonth; // привязка к ценности осмысленна только если месяц выбран в шапке
          const opts = (st: string) => (tools.tools[st] ?? []);
          return (
          <div>
            <h2 style={{ color: DARK }}>{t.constructorTitle}</h2>

            {/* Разогрев / Объяснение — один инструмент + привязка к ценности */}
            {(["warmup", "explanation"] as const).map((st) => (
              <div key={st} style={card}>
                <strong style={{ color: DARK }}>{t[`st_${st}`]}</strong>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {opts(st).map((tl) => (
                    <label key={tl.toolId} style={radioRow}>
                      <input type="radio" name={st} checked={cons[st].toolId === tl.toolId}
                        onChange={() => setCons((c) => (c ? { ...c, [st]: { ...c[st], toolId: tl.toolId } } : c))} />
                      {toolName(tl, lang)}{tl.isDefault && <span style={recBadge}>· {t.recommend}</span>}
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{t.timeMin}</span>
                  <input type="number" style={{ ...inp, width: 90 }} value={cons[st].time}
                    onChange={(e) => setCons((c) => (c ? { ...c, [st]: { ...c[st], time: Number(e.target.value) } } : c))} />
                  <ValueToggle checked={cons[st].linkedToValue} disabled={!hasValue} label={t.optLinkValue}
                    onChange={(v) => setCons((c) => (c ? { ...c, [st]: { ...c[st], linkedToValue: v } } : c))} />
                </div>
              </div>
            ))}

            {/* Задание — мультивыбор */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ color: DARK }}>{t.st_task}</strong>
                <span style={{ fontSize: 12, color: aCount >= 2 ? "var(--muted)" : "var(--danger)" }}>{aCount} {t.assessedBadge}</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 10px" }}>{t.tasksHint}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cons.tasks.map((tk, i) => (
                  <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <select style={{ ...inp, flex: 1, minWidth: 180 }} value={tk.toolId} onChange={(e) => updTask(i, { toolId: e.target.value })}>
                        {opts("task").map((tl) => <option key={tl.toolId} value={tl.toolId}>{toolName(tl, lang)}</option>)}
                      </select>
                      <input type="number" style={{ ...inp, width: 80 }} value={tk.time} onChange={(e) => updTask(i, { time: Number(e.target.value) })} title={t.timeMin} />
                      {cons.tasks.length > 1 && (
                        <button type="button" onClick={() => removeTaskRow(i)} style={{ ...btnGhost, padding: "8px 12px", color: "var(--danger)" }}>{t.removeItem}</button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <label style={radioRow}>
                        <input type="checkbox" checked={tk.isAssessed} onChange={(e) => updTask(i, { isAssessed: e.target.checked })} />
                        {tk.isAssessed ? t.optAssessed : t.optTraining}
                      </label>
                      <ValueToggle checked={tk.linkedToValue} disabled={!hasValue} label={t.optLinkValue} onChange={(v) => updTask(i, { linkedToValue: v })} />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addTaskRow} style={{ ...btnGhost, marginTop: 10 }}>{t.addTask}</button>
            </div>

            {/* Квиз — необязательный */}
            <div style={card}>
              <label style={{ ...radioRow, fontWeight: 700 }}>
                <input type="checkbox" checked={cons.quiz.enabled} onChange={(e) => setCons((c) => (c ? { ...c, quiz: { ...c.quiz, enabled: e.target.checked } } : c))} />
                {t.addQuizOpt} <span style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)" }}>· {t.quizOffHint}</span>
              </label>
              {cons.quiz.enabled && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {opts("quiz").map((tl) => (
                    <label key={tl.toolId} style={radioRow}>
                      <input type="radio" name="quiz-tool" checked={cons.quiz.toolId === tl.toolId}
                        onChange={() => setCons((c) => (c ? { ...c, quiz: { ...c.quiz, toolId: tl.toolId } } : c))} />
                      {toolName(tl, lang)}{tl.isDefault && <span style={recBadge}>· {t.recommend}</span>}
                    </label>
                  ))}
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{t.timeMin}</span>
                    <input type="number" style={{ ...inp, width: 90 }} value={cons.quiz.time}
                      onChange={(e) => setCons((c) => (c ? { ...c, quiz: { ...c.quiz, time: Number(e.target.value) } } : c))} />
                    <label style={radioRow}>
                      <input type="checkbox" checked={cons.quiz.isAssessed} onChange={(e) => setCons((c) => (c ? { ...c, quiz: { ...c.quiz, isAssessed: e.target.checked } } : c))} />
                      {cons.quiz.isAssessed ? t.optAssessed : t.optTraining}
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Рефлексия — один инструмент */}
            <div style={card}>
              <strong style={{ color: DARK }}>{t.st_reflection}</strong>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {opts("reflection").map((tl) => (
                  <label key={tl.toolId} style={radioRow}>
                    <input type="radio" name="reflection" checked={cons.reflection.toolId === tl.toolId}
                      onChange={() => setCons((c) => (c ? { ...c, reflection: { ...c.reflection, toolId: tl.toolId } } : c))} />
                    {toolName(tl, lang)}{tl.isDefault && <span style={recBadge}>· {t.recommend}</span>}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{t.timeMin}</span>
                <input type="number" style={{ ...inp, width: 90 }} value={cons.reflection.time}
                  onChange={(e) => setCons((c) => (c ? { ...c, reflection: { ...c.reflection, time: Number(e.target.value) } } : c))} />
              </div>
            </div>

            {aCount < 2 && <p style={{ color: "var(--danger)", fontSize: 13 }}>{t.needTwoAssessed.replace("{n}", String(aCount))}</p>}
            <div style={{ textAlign: "right" }}>
              <button onClick={saveStagesAndGenerate} disabled={busy || aCount < 2} style={{ ...btnPrimary, opacity: busy || aCount < 2 ? 0.5 : 1 }}>
                {busy ? t.starting : t.generateLesson}
              </button>
            </div>
          </div>
          );
        })()}

        {step === 4 && (
          <Center>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 700, color: DARK, fontSize: 18 }}>{t.genProgress}</div>
              <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>{t.genProgressSub}</div>
            </div>
          </Center>
        )}

        {step === 5 && lesson && (
          <>
            <LessonView lesson={lesson} onRegen={regenStage} regenId={regenId} onExport={() => token && downloadExport(lesson, token)} t={t} lang={lang} />
            {lesson.status === "ready" && <HandoutsPanel token={token} lessonId={lesson.id} t={t} />}
          </>
        )}
      </main>
    </div>
  );
}

function LessonView({ lesson, onRegen, regenId, onExport, t, lang }: { lesson: LpLesson; onRegen: (sid: string) => void; regenId: string | null; onExport: () => void; t: T; lang: Lang }) {
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", background: "var(--ink)", fontSize: 12, color: "var(--muted)", border: "1px solid var(--line)" };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13, color: DARK, border: "1px solid var(--line)", verticalAlign: "top" };
  if (lesson.status === "error") {
    return <div style={card}><strong>{t.genError}</strong><div style={{ color: "var(--muted)", marginTop: 6 }}>{lesson.generationError ?? t.genErrorHint}</div></div>;
  }
  return (
    <div>
      <div style={card}>
        <h2 style={{ marginTop: 0, color: DARK }}>{lesson.lessonTitle || t.st_task}</h2>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
          <div><b>{t.vUnit}:</b> {lesson.unit || "—"} · <b>{t.vGrade}:</b> {lesson.grade ?? "—"} · <b>{t.vSubject}:</b> {lesson.subject || "—"}</div>
          <div><b>{t.vTeacher}:</b> {lesson.teacherName || "—"} · <b>{t.vDate}:</b> {lesson.date || "—"} · <b>{t.vNo}:</b> {lesson.lessonNumber || "—"}</div>
          <div><b>{t.vValue}:</b> {lesson.valueLink || "—"}</div>
          {!!lesson.lessonObjectives?.length && <div style={{ marginTop: 6 }}><b>{t.lessonObjectives}:</b><ul style={{ margin: "4px 0", paddingLeft: 18 }}>{lesson.lessonObjectives.map((o, i) => <li key={i}>{o}</li>)}</ul></div>}
          <div><b>{t.vTotalPoints}:</b> {lesson.totalPoints}/10</div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", background: "var(--ink-2)" }}>
          <thead><tr><th style={th}>{t.thStage}</th><th style={th}>{t.thTeacher}</th><th style={th}>{t.thStudent}</th><th style={th}>{t.thCriteria}</th><th style={th}>{t.thResources}</th></tr></thead>
          <tbody>
            {(lesson.stages ?? []).map((s) => {
              const regenerating = regenId === s.id;
              return (
              <tr key={s.id} style={regenerating ? { opacity: 0.55 } : undefined}>
                <td style={td}>
                  <b>{s.stageName || t[`st_${s.stageType}`] || s.stageType}</b><br />({s.timeMinutes} {t.min})
                  <br />
                  <button
                    onClick={() => onRegen(s.id)}
                    disabled={regenId !== null}
                    style={{
                      ...btnGhost, padding: "3px 8px", fontSize: 11, marginTop: 6,
                      opacity: regenId !== null ? 0.5 : 1,
                      cursor: regenId !== null ? "not-allowed" : "pointer",
                    }}
                  >
                    {regenerating ? t.regenBusy : t.regen}
                  </button>
                </td>
                <td style={td}>{s.teacherActions}</td>
                <td style={td}>
                  {s.studentActions}
                  {!!s.descriptors?.length && (
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      <b>{t.descriptors}:</b>
                      <ol style={{ margin: "2px 0", paddingLeft: 16 }}>{s.descriptors.map((d) => <li key={d.id}>{d.text}</li>)}</ol>
                      <b>{t.totalW}: {s.points} {t.pointsShort}</b>
                    </div>
                  )}
                </td>
                <td style={td}>{s.assessmentCriteria}{s.method ? <div style={{ marginTop: 4 }}><b>{t.methodW}:</b> {s.method}</div> : null}</td>
                <td style={td}>{s.resources}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button onClick={onExport} style={btnPrimary}>{t.downloadPlan}</button>
        <button disabled title={t.soon} style={{ ...btnGhost, opacity: 0.5, cursor: "not-allowed" }}>{t.createPresentation}</button>
      </div>
    </div>
  );
}

function toolName(tl: { nameRu: string; nameKz: string; nameEn: string }, lang: Lang): string {
  return lang === "kz" ? tl.nameKz : lang === "en" ? tl.nameEn : tl.nameRu;
}

// ── Раздаточные материалы (срез 2): кнопка генерации + просмотр пакета ──
function HandoutsPanel({ token, lessonId, t }: { token: string; lessonId: string; t: T }) {
  const [pkg, setPkg] = useState<LpHandoutPackage | null>(null);
  const [handouts, setHandouts] = useState<LpHandout[]>([]);
  const [cost, setCost] = useState<LpCost | null>(null);
  const [mode, setMode] = useState<"student" | "teacher">("student");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (): Promise<string | undefined> => {
    try {
      const r = await api.lpGetHandouts(token, lessonId);
      setPkg(r.package);
      setHandouts(r.handouts);
      if (r.package?.status === "ready") {
        try { setCost(await api.lpGetCost(token, lessonId)); } catch { /* стоимость не критична */ }
      }
      return r.package?.status;
    } catch { return undefined; }
  }, [token, lessonId]);

  useEffect(() => {
    void load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  function startPoll() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const st = await load();
      if (st === "ready" || st === "error") {
        if (pollRef.current) clearInterval(pollRef.current);
        setBusy(false);
      }
    }, 3000);
  }

  async function generate() {
    setError(null); setBusy(true);
    try {
      await api.lpGenerateHandouts(token, lessonId);
      setPkg({ status: "generating", generationCost: 0 });
      startPoll();
    } catch (e) { setError(t.matError + " " + msg(e)); setBusy(false); }
  }

  async function download(url: string, filename: string) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setError(t.matError); return; }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = filename; a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { setError(t.matError + " " + msg(e)); }
  }

  const status = pkg?.status;
  const generating = busy || status === "generating";
  const ready = status === "ready" && handouts.length > 0;
  const base = `${API_URL}/lesson-plans/${lessonId}/handouts`;

  const toggleBtn = (m: "student" | "teacher", label: string) => (
    <button onClick={() => setMode(m)} style={{
      ...btnGhost, padding: "6px 14px",
      background: mode === m ? "var(--amber)" : "rgba(139,127,232,.12)",
      color: mode === m ? "var(--on-amber)" : "var(--lavender)",
      fontWeight: mode === m ? 700 : 400,
    }}>{label}</button>
  );

  return (
    <div style={{ ...card, marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ color: DARK, fontSize: 16 }}>{t.materialsTitle}</strong>
        {ready && (
          <div style={{ display: "flex", gap: 6 }}>
            {toggleBtn("student", t.versionStudent)}
            {toggleBtn("teacher", t.versionTeacher)}
          </div>
        )}
      </div>

      {error && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{error}</div>}

      {generating && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 32 }}>⏳</div>
          <div style={{ fontWeight: 700, color: DARK }}>{t.matGenerating}</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{t.matGenSub}</div>
        </div>
      )}

      {!generating && !ready && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>{status === "error" ? t.matError : t.matEmpty}</p>
          <button onClick={generate} style={btnPrimary}>{t.genMaterials}</button>
        </div>
      )}

      {ready && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <button onClick={() => download(`${base}/export?mode=${mode}`, `handouts-${mode}.docx`)} style={btnPrimary}>
              ↓ {t.downloadPackage} · {mode === "student" ? t.versionStudent : t.versionTeacher}
            </button>
            {cost && (
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {t.matCost}: {Math.round(cost.total)} {t.tenge}
                {typeof cost.byOperation.plan === "number" && ` (${t.costPlan} ${Math.round(cost.byOperation.plan)} · ${t.costHandouts} ${Math.round(cost.byOperation.handouts ?? 0)})`}
              </span>
            )}
            <button onClick={generate} style={{ ...btnGhost, padding: "8px 14px" }}>↻ {t.regenMaterials}</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {handouts.map((h) => {
              const title = (h.studentContent as { title?: string } | null)?.title ?? "";
              return (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: DARK, fontSize: 13 }}>{t.appendix ?? "Прил."} {h.order}</span>
                  <span style={{ color: DARK, fontSize: 13, flex: 1, minWidth: 120 }}>{title}</span>
                  <span style={{ fontSize: 11, color: "var(--lavender)" }}>{t[`ht_${h.handoutType}`] ?? h.handoutType}</span>
                  {h.linkedToValue && <span style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700 }}>◆ {t.linkedBadge}</span>}
                  <button onClick={() => download(`${base}/${h.id}/export?mode=${mode}`, `handout-${h.order}-${mode}.docx`)} style={{ ...btnGhost, padding: "4px 10px", fontSize: 12 }}>↓ {t.downloadSheet}</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Конструктор: инициализация, сборка в API-формат, подсчёт оцениваемых ──
function firstToolId(tools: LpToolsResponse, st: string, skip?: string | string[]): string {
  const list = tools.tools[st] ?? [];
  const skipped = new Set(Array.isArray(skip) ? skip : skip ? [skip] : []);
  const free = list.filter((x) => !skipped.has(x.toolId));
  const pool = free.length ? free : list;
  return (pool.find((x) => x.isDefault) ?? pool[0])?.toolId ?? "";
}

function initCons(tools: LpToolsResponse): ConsState {
  const t1 = firstToolId(tools, "task");
  const t2 = firstToolId(tools, "task", t1) || t1;
  return {
    warmup: { toolId: firstToolId(tools, "warmup"), time: 7, linkedToValue: false },
    explanation: { toolId: firstToolId(tools, "explanation"), time: 10, linkedToValue: false },
    // По умолчанию два оцениваемых задания — минимум для деления 10 баллов.
    tasks: [
      { toolId: t1, time: 8, isAssessed: true, linkedToValue: false },
      { toolId: t2, time: 8, isAssessed: true, linkedToValue: false },
    ],
    quiz: { enabled: false, toolId: firstToolId(tools, "quiz"), time: 5, isAssessed: true },
    reflection: { toolId: firstToolId(tools, "reflection"), time: 5 },
  };
}

function assessedCount(c: ConsState): number {
  return c.tasks.filter((t) => t.isAssessed).length + (c.quiz.enabled && c.quiz.isAssessed ? 1 : 0);
}

function flattenCons(c: ConsState): LpStageInput[] {
  const out: LpStageInput[] = [
    { stageType: "warmup", toolId: c.warmup.toolId, timeMinutes: c.warmup.time, isAssessed: false, linkedToValue: c.warmup.linkedToValue },
    { stageType: "explanation", toolId: c.explanation.toolId, timeMinutes: c.explanation.time, isAssessed: false, linkedToValue: c.explanation.linkedToValue },
  ];
  for (const tk of c.tasks) {
    out.push({ stageType: "task", toolId: tk.toolId, timeMinutes: tk.time, isAssessed: tk.isAssessed, linkedToValue: tk.linkedToValue });
  }
  if (c.quiz.enabled) {
    out.push({ stageType: "quiz", toolId: c.quiz.toolId, timeMinutes: c.quiz.time, isAssessed: c.quiz.isAssessed, linkedToValue: false });
  }
  out.push({ stageType: "reflection", toolId: c.reflection.toolId, timeMinutes: c.reflection.time, isAssessed: false, linkedToValue: false });
  return out;
}

// Чекбокс «привязать к ценности». Заблокирован, если в шапке не выбран месяц:
// без ценности привязывать не к чему.
function ValueToggle({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <label style={{ ...radioRow, opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      <input type="checkbox" checked={checked && !disabled} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

async function downloadExport(lesson: LpLesson, token: string) {
  const res = await fetch(`${API_URL}/lesson-plans/${lesson.id}/export`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `ksp-${lesson.id}.docx`; a.click();
  URL.revokeObjectURL(url);
}

function Field({ l, children }: { l: string; children: React.ReactNode }) { return <div><span style={label}>{l}</span>{children}</div>; }
function Grid({ children }: { children: React.ReactNode }) { return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>; }
function Center({ children }: { children: React.ReactNode }) { return <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>{children}</div>; }
function msg(e: unknown): string { return e instanceof Error ? e.message : String(e); }
