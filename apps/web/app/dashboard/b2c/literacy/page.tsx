"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getValidAccessToken } from "../../../../lib/auth";
import { api, API_URL, type LitSet, type LitCreateInput } from "../../../../lib/api";
import { useLang, LT } from "../../../../lib/lesson-translations";
import { LangSwitcher } from "../../../../components/lang-switcher";

const BRAND = "#6B5CE7";
const DARK = "#0D0E1A";
const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid #d9d9e3", fontSize: 14, boxSizing: "border-box" };
const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 5, display: "block" };
const card: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: "22px 20px", boxShadow: "0 4px 18px rgba(13,14,26,0.06)", marginBottom: 16 };
const btnPrimary: React.CSSProperties = { background: BRAND, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" };
const btnGhost: React.CSSProperties = { background: "none", border: "1px solid #d9d9e3", color: DARK, borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer" };
const badge = (bg: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color: "#fff", background: bg, borderRadius: 999, padding: "2px 8px", marginLeft: 6 });

const Q_TYPES = ["single", "multiple", "truefalse", "short", "open", "matching"];
function defaultPisa(grade: number): number[] {
  if (grade <= 4) return [1, 2];
  if (grade <= 7) return [2, 3, 4];
  if (grade <= 9) return [3, 4, 5];
  return [4, 5, 6];
}

export default function LiteracyPage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = LT[lang];
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [setId, setSetId] = useState<string | null>(null);
  const [lset, setLset] = useState<LitSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [teacherView, setTeacherView] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // settings
  const [type, setType] = useState<"reading" | "math" | "science">("reading");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("7");
  const [source, setSource] = useState<"own" | "generated">("generated");
  const [count, setCount] = useState("6");
  const [pisa, setPisa] = useState<number[]>([2, 3, 4]);
  const [qtypes, setQtypes] = useState<string[]>(["single", "short", "open"]);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [ownText, setOwnText] = useState("");

  useEffect(() => {
    (async () => {
      const tk = await getValidAccessToken();
      if (!tk) { router.replace("/login"); return; }
      setToken(tk);
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [router]);

  useEffect(() => { setPisa(defaultPisa(Number(grade) || 7)); }, [grade]);

  const toggle = (arr: (number | string)[], v: number | string, set: (a: never) => void) =>
    set((arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]) as never);

  async function toStep2() {
    if (!token) return;
    setError(null);
    if (!subject || !grade) { setError(t.reqFields); return; }
    if (!qtypes.length || !pisa.length) { setError(t.litPickTypes); return; }
    if (source === "generated" && !topic.trim()) { setError(t.litTopic + " —?"); return; }
    setBusy(true);
    try {
      const input: LitCreateInput = {
        literacyType: type, subject, grade: Number(grade), language: lang === "en" ? "en" : lang === "kz" ? "kz" : "ru",
        sourceMode: source, sourceTopic: topic || undefined, sourceNotes: notes || undefined,
        questionCount: Number(count), pisaLevels: pisa, questionTypes: qtypes,
      };
      const s = await api.litCreate(token, input);
      setSetId(s.id);
      setStep(2);
    } catch (e) { setError(msg(e)); } finally { setBusy(false); }
  }

  async function onUpload(file: File) {
    if (!token || !setId) return;
    setBusy(true); setError(null);
    try { const { text } = await api.litUpload(token, setId, file); setOwnText(text); }
    catch (e) { setError(msg(e)); } finally { setBusy(false); }
  }

  async function generate() {
    if (!token || !setId) return;
    setError(null); setBusy(true);
    try {
      if (source === "own") {
        if (ownText.trim().length < 200) { setError("Текст слишком короткий (мин. ~200 символов)."); setBusy(false); return; }
        await api.litStimulus(token, setId, { mode: "own", text: ownText });
      } else {
        await api.litStimulus(token, setId, { mode: "generated" });
      }
      await api.litGenerate(token, setId);
      setStep(3);
      startPolling(setId);
    } catch (e) { setError("Не удалось запустить генерацию (нужен ключ ИИ). " + msg(e)); setBusy(false); }
  }

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (!token) return;
      try {
        const s = await api.litGet(token, id);
        if (s.status === "ready" || s.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
          setLset(s); setBusy(false); setStep(4);
        }
      } catch { /* keep polling */ }
    }, 2000);
  }

  async function regenQ(qid: string) { if (!token || !setId) return; try { setLset(await api.litRegenQuestion(token, setId, qid)); } catch (e) { setError(msg(e)); } }
  async function delQ(qid: string) { if (!token || !setId) return; try { setLset(await api.litDeleteQuestion(token, setId, qid)); } catch (e) { setError(msg(e)); } }
  function download(mode: "student" | "teacher") {
    if (!token || !setId) return;
    fetch(`${API_URL}/literacy/sets/${setId}/export?mode=${mode}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob()).then((b) => { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `literacy-${mode}.docx`; a.click(); URL.revokeObjectURL(u); });
  }

  if (!token) return <Center>{t.loading}</Center>;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: DARK, color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => (step > 1 && step < 3 ? setStep(step - 1) : router.push("/dashboard/b2c"))} style={{ ...btnGhost, color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>← {t.back}</button>
        <span style={{ fontWeight: 700 }}>📊 {t.litTitle}</span>
        <div style={{ marginLeft: "auto" }}><LangSwitcher lang={lang} setLang={setLang} dark /></div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
        {error && <div style={{ background: "#fdeaea", border: "1px solid #e0575755", color: DARK, padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {step === 1 && (
          <div>
            <h2 style={{ color: DARK, marginTop: 0 }}>{t.litTitle}</h2>
            <div style={card}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><span style={label}>{t.litType}</span>
                  <select style={inp} value={type} onChange={(e) => setType(e.target.value as never)}>
                    <option value="reading">{t.litTypeReading}</option><option value="math">{t.litTypeMath}</option><option value="science">{t.litTypeScience}</option>
                  </select>
                </div>
                <div><span style={label}>{t.litSubjectF} *</span><input style={inp} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
                <div><span style={label}>{t.litGradeF} *</span><select style={inp} value={grade} onChange={(e) => setGrade(e.target.value)}>{Array.from({ length: 11 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
                <div><span style={label}>{t.litLang}</span><select style={inp} value={lang} onChange={(e) => setLang(e.target.value as never)}><option value="ru">РУ</option><option value="kz">ҚАЗ</option><option value="en">EN</option></select></div>
                <div><span style={label}>{t.litCount}</span><input type="number" min={3} max={15} style={inp} value={count} onChange={(e) => setCount(e.target.value)} /></div>
                <div><span style={label}>{t.litSource}</span>
                  <select style={inp} value={source} onChange={(e) => setSource(e.target.value as never)}>
                    <option value="generated">{t.litSourceGen}</option><option value="own">{t.litSourceOwn}</option>
                  </select>
                </div>
              </div>
              {source === "generated" && (
                <div style={{ marginTop: 12 }}>
                  <span style={label}>{t.litTopic} *</span><input style={inp} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="напр. водные ресурсы Казахстана" />
                  <div style={{ marginTop: 8 }}><span style={label}>{t.litNotes}</span><input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <span style={label}>{t.litPisa}</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5, 6].map((lv) => (
                    <label key={lv} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, cursor: "pointer" }}>
                      <input type="checkbox" checked={pisa.includes(lv)} onChange={() => toggle(pisa, lv, setPisa as never)} /> {lv}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <span style={label}>{t.litQTypes}</span>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {Q_TYPES.map((q) => (
                    <label key={q} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, cursor: "pointer" }}>
                      <input type="checkbox" checked={qtypes.includes(q)} onChange={() => toggle(qtypes, q, setQtypes as never)} /> {t[`qt_${q}`]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}><button onClick={toStep2} disabled={busy} style={btnPrimary}>{t.next}</button></div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ color: DARK }}>{t.litSource}: {source === "own" ? t.litSourceOwn : t.litSourceGen}</h2>
            {source === "own" ? (
              <div style={card}>
                <span style={label}>{t.litPasteText}</span>
                <textarea style={{ ...inp, minHeight: 220, fontFamily: "inherit" }} value={ownText} onChange={(e) => setOwnText(e.target.value)} />
                <div style={{ marginTop: 10 }}>
                  <label style={{ ...btnGhost, display: "inline-block" }}>
                    {t.litUploadFile}
                    <input type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                  </label>
                  <span style={{ marginLeft: 10, fontSize: 12, color: "#6b7280" }}>{ownText.length} симв.</span>
                </div>
              </div>
            ) : (
              <div style={card}>
                <div style={{ fontSize: 14, color: "#374151" }}>{t.litTopic}: <b>{topic}</b></div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Стимул сгенерируется автоматически перед заданиями.</div>
              </div>
            )}
            <div style={{ textAlign: "right" }}><button onClick={generate} disabled={busy} style={btnPrimary}>{busy ? t.generating : t.litGenQuestions}</button></div>
          </div>
        )}

        {step === 3 && (
          <Center><div style={{ textAlign: "center" }}><div style={{ fontSize: 40 }}>⏳</div><div style={{ fontWeight: 700, color: DARK, fontSize: 18, marginTop: 10 }}>{t.litGenerating}</div></div></Center>
        )}

        {step === 4 && lset && (
          <div>
            {lset.status === "error" ? (
              <div style={card}><b>{t.genError}</b><div style={{ color: "#6b7280", marginTop: 6 }}>{lset.generationError ?? t.genErrorHint}</div></div>
            ) : (
              <>
                <div style={card}>
                  <h2 style={{ marginTop: 0, color: DARK }}>{t.litTitle}</h2>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>{t[`litType${lset.literacyType === "reading" ? "Reading" : lset.literacyType === "math" ? "Math" : "Science"}`]} · {lset.subject} · {lset.grade} {t.gradeWord}</div>
                  <div style={{ marginTop: 10, fontWeight: 700, color: DARK }}>{t.litStimulus}</div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "#374151", marginTop: 4 }}>{lset.stimulusText}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ color: DARK }}>{t.litQuestions} ({lset.questions?.length ?? 0})</strong>
                  <label style={{ fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={teacherView} onChange={(e) => setTeacherView(e.target.checked)} /> {t.litForTeacher}</label>
                </div>

                {(lset.questions ?? []).map((q, i) => (
                  <div key={q.id} style={card}>
                    <div style={{ fontWeight: 700, color: DARK }}>
                      {i + 1}. {q.questionText}
                      <span style={badge("#0ea5e9")}>{t[`qt_${q.questionType}`] ?? q.questionType}</span>
                      <span style={badge("#6B5CE7")}>{t.pisaBadge} {q.pisaLevel}</span>
                      <span style={badge("#2DC08E")}>{q.points} {t.pointsShort}</span>
                    </div>
                    {Array.isArray(q.options) && (
                      <ul style={{ margin: "6px 0", paddingLeft: 20, fontSize: 14 }}>{(q.options as unknown[]).map((o, j) => <li key={j}>{typeof o === "string" ? o : JSON.stringify(o)}</li>)}</ul>
                    )}
                    {teacherView && (
                      <div style={{ marginTop: 6, fontSize: 13, color: "#374151", background: "#f6f6fb", borderRadius: 8, padding: "8px 10px" }}>
                        <div><b>{t.litKey}:</b> {typeof q.correctAnswer === "string" ? q.correctAnswer : JSON.stringify(q.correctAnswer)}</div>
                        {q.answerCriteria && <div><b>{t.litCriteriaF}:</b> {q.answerCriteria}</div>}
                      </div>
                    )}
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <button onClick={() => regenQ(q.id)} style={{ ...btnGhost, fontSize: 12 }}>{t.litRegenQ}</button>
                      <button onClick={() => delQ(q.id)} style={{ ...btnGhost, fontSize: 12, color: "#e05757" }}>{t.litDelQ}</button>
                    </div>
                  </div>
                ))}

                {teacherView && <div style={{ ...card, fontWeight: 700 }}>{t.litTotalF}: {lset.totalPoints}</div>}

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button onClick={() => download("student")} style={btnPrimary}>{t.litDownloadStudent}</button>
                  <button onClick={() => download("teacher")} style={{ ...btnPrimary, background: "#0D0E1A" }}>{t.litDownloadTeacher}</button>
                  <button onClick={() => router.push("/dashboard/b2c/materials")} style={btnGhost}>{t.materials}</button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) { return <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>{children}</div>; }
function msg(e: unknown): string { return e instanceof Error ? e.message : String(e); }
