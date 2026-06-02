"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { api, API_URL, AuthUser, ClassroomItem } from "../../lib/api";
import { Language, translations } from "../../lib/translations";

type TabType = "presentations" | "illustrations" | "tasks";

interface Presentation {
  id: string;
  title: string;
  prompt: string;
  slideCount: number;
  fileUrl?: string;
  status: "generating" | "ready" | "error";
  createdAt: string;
}

interface Illustration {
  id: string;
  title: string;
  prompt: string;
  imageUrl?: string;
  status: "generating" | "ready" | "error";
  createdAt: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

async function downloadFile(url: string, filename: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function AuthImage({ url, token, alt, style }: { url: string; token: string; alt: string; style: React.CSSProperties }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error("Image request failed");
        return res.blob();
      })
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, token]);

  if (!src) {
    return <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>...</div>;
  }

  return <img src={src} alt={alt} style={style} />;
}

// ─── Presentations Tab ──────────────────────────────────────────────────────

function PresentationsTab({ token, t }: { token: string; t: Record<string, string> }) {
  const [prompt, setPrompt] = useState("");
  const [slideCount, setSlideCount] = useState(10);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedText, setAttachedText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Presentation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myPres, setMyPres] = useState<Presentation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(() => {
    setListLoading(true);
    api.getMyPresentations(token)
      .then(data => setMyPres(data as Presentation[]))
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, [token]);

  useEffect(() => { loadList(); }, [loadList]);

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file);
    if (file.name.endsWith(".txt")) {
      const text = await file.text();
      setAttachedText(text.slice(0, 3000));
    } else {
      setAttachedText(`[Файл: ${file.name}]`);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await api.generatePresentation(token, { prompt, slideCount, attachedText: attachedText || undefined });
      setResult(res as Presentation);
      loadList();
    } catch {
      setError(t.error ?? "Ошибка генерации");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    await api.deletePresentation(token, id);
    setMyPres(prev => prev.filter(p => p.id !== id));
    if (result?.id === id) setResult(null);
  }

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      {/* Left: generation form */}
      <div style={{ flex: "0 0 65%" }}>
        <div className="card" style={{ marginBottom: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {t.mat_pres_hint ?? "Добавьте материал или напишите промпт для презентации"}
          </p>
        </div>

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <label style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" }}>
            {t.mat_slide_count ?? "Количество слайдов"}:
          </label>
          <input
            type="number" min={5} max={30} value={slideCount}
            onChange={e => setSlideCount(Number(e.target.value))}
            className="input" style={{ width: 80 }}
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
            📎 {t.mat_attach_file ?? "Прикрепить файл"}
          </button>
          {attachedFile && (
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {attachedFile.name}
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4, padding: "0 4px" }}
                onClick={() => { setAttachedFile(null); setAttachedText(""); if (fileRef.current) fileRef.current.value = ""; }}>
                ✕
              </button>
            </span>
          )}
          <input ref={fileRef} type="file" style={{ display: "none" }}
            accept=".doc,.docx,.pdf,.ppt,.pptx,.jpg,.png,.txt"
            onChange={handleAttach} />
        </div>

        <textarea
          className="input"
          style={{ marginTop: 12, minHeight: 120, width: "100%", resize: "vertical" }}
          placeholder={t.mat_pres_hint ?? "Опишите тему, класс, количество слайдов и стиль..."}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />

        {error && <div className="alert alert-error" style={{ marginTop: 8 }}>⚠ {error}</div>}

        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 12 }}
          disabled={busy || !prompt.trim()}
          onClick={handleGenerate}
        >
          {busy ? <><span className="spinner" /> {t.mat_generating ?? "Генерирую..."}</> : `✦ ${t.mat_generate_pres ?? "Сгенерировать презентацию"}`}
        </button>

        {result && result.status === "ready" && (
          <div className="card" style={{ marginTop: 16, border: "2px solid var(--primary)", borderRadius: 10 }}>
            <div style={{ fontWeight: 600, color: "var(--primary)", marginBottom: 8 }}>
              ✅ {t.mat_ready ?? "Готово!"} — {result.title}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
              {result.slideCount} слайдов
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => downloadFile(`${API_URL}/materials/presentations/${result.id}/download`, `${result.title}.pptx`, token)}
            >
              ↓ {t.mat_download_pptx ?? "Скачать .pptx"}
            </button>
          </div>
        )}

        {result && result.status === "error" && (
          <div className="alert alert-error" style={{ marginTop: 16 }}>Ошибка генерации. Попробуйте ещё раз.</div>
        )}
      </div>

      {/* Right: My presentations */}
      <div style={{ flex: "0 0 calc(35% - 20px)", minWidth: 0 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            📁 {t.mat_my_presentations ?? "Мои презентации"}
          </h3>
          {listLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 56, borderRadius: 8, background: "var(--surface)", animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : myPres.length === 0 ? (
            <p className="fm-empty">{t.mat_empty_pres ?? "Презентации появятся здесь"}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
              {myPres.map(p => (
                <div key={p.id} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                    {p.slideCount} сл. · {fmtDate(p.createdAt)}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {p.status === "ready" && p.fileUrl && (
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 12 }}
                        onClick={() => downloadFile(`${API_URL}/materials/presentations/${p.id}/download`, `${p.title}.pptx`, token)}>
                        ↓
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", fontSize: 12 }}
                      onClick={() => handleDelete(p.id)}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Illustrations Tab ──────────────────────────────────────────────────────

function IllustrationsTab({ token, t }: { token: string; t: Record<string, string> }) {
  const [prompt, setPrompt] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedText, setAttachedText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Illustration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myIllus, setMyIllus] = useState<Illustration[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(() => {
    setListLoading(true);
    api.getMyIllustrations(token)
      .then(data => setMyIllus(data as Illustration[]))
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, [token]);

  useEffect(() => { loadList(); }, [loadList]);

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file);
    if (file.name.endsWith(".txt")) {
      const text = await file.text();
      setAttachedText(text.slice(0, 3000));
    } else {
      setAttachedText(`[Файл: ${file.name}]`);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await api.generateIllustration(token, { prompt, attachedText: attachedText || undefined });
      setResult(res as Illustration);
      loadList();
    } catch {
      setError(t.error ?? "Ошибка генерации");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    await api.deleteIllustration(token, id);
    setMyIllus(prev => prev.filter(i => i.id !== id));
    if (result?.id === id) setResult(null);
  }

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      {/* Left */}
      <div style={{ flex: "0 0 65%" }}>
        <div className="card" style={{ marginBottom: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {t.mat_illus_hint ?? "Опишите иллюстрации для урока"}
          </p>
        </div>

        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
            📎 {t.mat_attach_file ?? "Прикрепить файл"}
          </button>
          {attachedFile && (
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {attachedFile.name}
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4, padding: "0 4px" }}
                onClick={() => { setAttachedFile(null); setAttachedText(""); if (fileRef.current) fileRef.current.value = ""; }}>
                ✕
              </button>
            </span>
          )}
          <input ref={fileRef} type="file" style={{ display: "none" }}
            accept=".doc,.docx,.pdf,.jpg,.png,.txt"
            onChange={handleAttach} />
        </div>

        <textarea
          className="input"
          style={{ marginTop: 12, minHeight: 120, width: "100%", resize: "vertical" }}
          placeholder={t.mat_illus_hint ?? "Опишите иллюстрацию для урока..."}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />

        {error && <div className="alert alert-error" style={{ marginTop: 8 }}>⚠ {error}</div>}

        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 12 }}
          disabled={busy || !prompt.trim()}
          onClick={handleGenerate}
        >
          {busy ? <><span className="spinner" /> {t.mat_generating ?? "Генерирую..."}</> : `✦ ${t.mat_generate_illus ?? "Сгенерировать иллюстрацию"}`}
        </button>

        {result && result.status === "ready" && result.imageUrl && (
          <div className="card" style={{ marginTop: 16, border: "2px solid var(--primary)", borderRadius: 10 }}>
            <div style={{ fontWeight: 600, color: "var(--primary)", marginBottom: 12 }}>
              ✅ {t.mat_ready ?? "Готово!"} — {result.title}
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 12, background: "#fff" }}>
              <AuthImage
                url={`${API_URL}/materials/illustrations/${result.id}/download`}
                token={token}
                alt={result.title}
                style={{ width: "100%", maxHeight: 300, objectFit: "contain" }}
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => downloadFile(`${API_URL}/materials/illustrations/${result.id}/download`, `${result.title}.svg`, token)}
            >
              ↓ {t.mat_download_illus ?? "Скачать иллюстрацию"}
            </button>
          </div>
        )}

        {result && result.status === "error" && (
          <div className="alert alert-error" style={{ marginTop: 16 }}>Ошибка генерации. Попробуйте ещё раз.</div>
        )}
      </div>

      {/* Right: My illustrations */}
      <div style={{ flex: "0 0 calc(35% - 20px)", minWidth: 0 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            🎨 {t.mat_my_illustrations ?? "Мои иллюстрации"}
          </h3>
          {listLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ height: 80, borderRadius: 8, background: "var(--surface)", animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : myIllus.length === 0 ? (
            <p className="fm-empty">{t.mat_empty_illus ?? "Иллюстрации появятся здесь"}</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 420, overflowY: "auto" }}>
              {myIllus.map(il => (
                <div key={il.id} style={{ borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden", background: "var(--surface)" }}>
                  {il.imageUrl && il.status === "ready" ? (
                    <AuthImage
                      url={`${API_URL}/materials/illustrations/${il.id}/download`}
                      token={token}
                      alt={il.title}
                      style={{ width: "100%", height: 70, objectFit: "cover", display: "block", background: "#fff" }}
                    />
                  ) : (
                    <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>
                      {il.status === "generating" ? "⏳" : "❌"}
                    </div>
                  )}
                  <div style={{ padding: "6px 8px" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>
                      {il.title}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {il.status === "ready" && il.imageUrl && (
                        <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: "2px 6px" }}
                          onClick={() => downloadFile(`${API_URL}/materials/illustrations/${il.id}/download`, `${il.title}.svg`, token)}>
                          ↓
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", fontSize: 11, padding: "2px 6px" }}
                        onClick={() => handleDelete(il.id)}>
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tasks Tab ──────────────────────────────────────────────────────────────

const SUBJECTS = ["Математика","Физика","Химия","Биология","История Казахстана","Всемирная история","Казахский язык","Русский язык","Английский язык","Информатика","География","Литература"];
const TASK_TYPES = [
  { value: "тест", label: "Тест" },
  { value: "открытый ответ", label: "Открытый ответ" },
  { value: "практическое задание", label: "Практическое задание" },
  { value: "смешанное", label: "Смешанное" },
];
const DIFFICULTIES = [
  { value: "лёгкий", label: "Лёгкий" },
  { value: "средний", label: "Средний" },
  { value: "сложный", label: "Сложный" },
];

function TasksTab({ token, t, teacher }: { token: string; t: Record<string, string>; teacher?: AuthUser | null }) {
  const [subject, setSubject] = useState(teacher?.subject ?? "");
  const [topic, setTopic] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [taskType, setTaskType] = useState("тест");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("средний");
  const [maxScore, setMaxScore] = useState(10);
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getClassrooms(token).then(setClassrooms).catch(() => {});
  }, [token]);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setGenerating(true); setError(null); setSent(false); setGeneratedContent(null);
    try {
      const gradeStr = classrooms.find(c => c.id === classroomId)?.grade?.toString() ?? "7";
      const prompt = `Тип: ${taskType}. Количество вопросов: ${questionCount}. Сложность: ${difficulty}. Максимальный балл: ${maxScore}.`;
      const res = await api.generateAiAssignment(token, {
        subject: subject || "Математика",
        grade: gradeStr,
        topic,
        type: prompt,
      });
      const content = (res as { content: string }).content;
      setGeneratedContent(content);
      setEditContent(content);
    } catch {
      setError(t.error ?? "Ошибка генерации");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!generatedContent || !classroomId) return;
    setSending(true); setError(null);
    try {
      const content = isEditing ? editContent : generatedContent;
      const classroom = classrooms.find(c => c.id === classroomId);
      const title = `${subject || "Задание"}: ${topic}`;
      await api.createAssignment(token, {
        title,
        description: content,
        subject: subject || "Математика",
        classroomId,
        dueDate: deadline || undefined,
        maxScore,
        status: "published",
        assignmentType: taskType,
      });
      setSent(true);
      setGeneratedContent(null);
      setTopic(""); setDeadline(""); setIsEditing(false);
      setTimeout(() => setSent(false), 5000);
      // Log to suppress unused classroom warning
      void classroom;
    } catch {
      setError(t.error ?? "Ошибка отправки задания");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      {/* Left: form */}
      <div style={{ flex: "0 0 50%" }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>⚙️ Параметры задания</h3>
          <div className="form-stack">
            <div className="field">
              <label className="field-label">{t.subject ?? "Предмет"}</label>
              <input
                className="input" list="subjects-datalist"
                value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Математика"
              />
              <datalist id="subjects-datalist">
                {SUBJECTS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="field">
              <label className="field-label">{t.topic ?? "Тема"}</label>
              <input className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Квадратные уравнения" />
            </div>

            <div className="field">
              <label className="field-label">{t.classroom ?? "Класс"}</label>
              <select className="input" value={classroomId} onChange={e => setClassroomId(e.target.value)}>
                <option value="">— Выберите класс —</option>
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.grade} кл.)</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field-label">{t.taskType ?? "Тип задания"}</label>
              <select className="input" value={taskType} onChange={e => setTaskType(e.target.value)}>
                {TASK_TYPES.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">{t.questions ?? "Кол-во вопросов"}</label>
                <input type="number" min={1} max={20} className="input" value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">Сложность</label>
                <select className="input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">{t.maxScore ?? "Макс. балл"}</label>
                <input type="number" min={1} max={100} className="input" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} />
              </div>
            </div>

            {error && <div className="alert alert-error">⚠ {error}</div>}

            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={generating || !topic.trim()}
              onClick={handleGenerate}
            >
              {generating ? <><span className="spinner" /> {t.mat_generating ?? "Генерирую..."}</> : `✦ ${t.generate ?? "Сгенерировать"}`}
            </button>
          </div>
        </div>
      </div>

      {/* Right: result + assign */}
      <div style={{ flex: "0 0 calc(50% - 20px)", minWidth: 0 }}>
        {sent && (
          <div className="alert" style={{ background: "var(--success-bg, #f0fff4)", border: "1px solid #86efac", color: "#166534", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
            ✅ {t.mat_task_sent ?? "Задание отправлено! Ученики уже видят его."}
          </div>
        )}

        {generatedContent && (
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, flex: 1 }}>📄 Сгенерированное задание</h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { setIsEditing(!isEditing); setEditContent(generatedContent); }}
              >
                ✏️ {isEditing ? "Готово" : "Редактировать"}
              </button>
            </div>

            {isEditing ? (
              <textarea
                className="input"
                style={{ minHeight: 200, width: "100%", resize: "vertical", fontFamily: "inherit", marginBottom: 16 }}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
              />
            ) : (
              <div style={{ background: "var(--surface)", borderRadius: 8, padding: "12px 14px", marginBottom: 16, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, maxHeight: 240, overflowY: "auto" }}>
                {generatedContent}
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                📤 {t.mat_assign_class ?? "Назначить классу"}
              </h4>
              <div className="form-stack">
                {classroomId && (
                  <div style={{ fontSize: 13, padding: "8px 12px", background: "var(--surface)", borderRadius: 6, color: "var(--muted)" }}>
                    🏫 {classrooms.find(c => c.id === classroomId)?.name ?? "—"}
                  </div>
                )}
                {!classroomId && (
                  <div style={{ fontSize: 13, color: "var(--danger)" }}>⚠ Выберите класс слева</div>
                )}
                <div className="field">
                  <label className="field-label">{t.mat_deadline ?? "Дедлайн"}</label>
                  <input type="datetime-local" className="input" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", background: "var(--teal, #0d9488)" }}
                  disabled={sending || !classroomId}
                  onClick={handleSend}
                >
                  {sending ? <><span className="spinner" /> Отправляю...</> : `📤 ${t.mat_send_class ?? "Отправить классу"}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {!generatedContent && !sent && (
          <div className="card" style={{ marginBottom: 0 }}>
            <p className="fm-empty" style={{ padding: "40px 0" }}>
              Сгенерированное задание появится здесь
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function MaterialsPanel({ token, language, teacher, initialTab }: {
  token: string;
  language: Language;
  teacher?: AuthUser | null;
  initialTab?: TabType;
}) {
  const [tab, setTab] = useState<TabType>(initialTab ?? "presentations");
  const t = translations[language];

  const TABS: { key: TabType; label: string }[] = [
    { key: "presentations", label: t.mat_tab_presentations ?? "Презентации" },
    { key: "illustrations", label: t.mat_tab_illustrations ?? "Иллюстрации" },
    { key: "tasks", label: t.mat_tab_tasks ?? "Задания" },
  ];

  return (
    <div className="page">
      <h1 className="page-title">🎨 {t.nav_materials ?? "Учебные материалы"}</h1>

      <div className="sc-tabs" style={{ marginBottom: 0 }}>
        {TABS.map(tb => (
          <button
            key={tb.key}
            className={`sc-tab${tab === tb.key ? " sc-tab-active" : ""}`}
            onClick={() => setTab(tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {tab === "presentations" && <PresentationsTab token={token} t={t} />}
        {tab === "illustrations" && <IllustrationsTab token={token} t={t} />}
        {tab === "tasks" && <TasksTab token={token} t={t} teacher={teacher} />}
      </div>
    </div>
  );
}
