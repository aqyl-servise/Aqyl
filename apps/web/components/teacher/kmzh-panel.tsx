"use client";
import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import type { AuthUser } from "../../lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface KmzhStage {
  id: string;
  label: string;
  duration: number;
  order: number;
  teacherActions: string;
  studentActions: string;
  assessmentCriteria: string[];
  totalPoints: number;
  method: string;
  resources: string;
}

interface KmzhLessonObjectives {
  all: string;
  most: string;
  some: string;
}

interface KmzhMeta {
  sessionId: string;
  regenerationCount: number;
  maxRegenerations: number;
  fromCache: boolean;
  totalMinutes: number;
  totalPoints: number;
}

interface KmzhResult {
  header: Record<string, unknown> & { valueLink?: string };
  lessonObjectives: KmzhLessonObjectives;
  stages: KmzhStage[];
  meta: KmzhMeta;
}

interface KmzhInput {
  lang: string;
  teacherName: string;
  date: string;
  grade: string;
  lessonNumber: string;
  unitTopic: string;
  lessonTitle: string;
  learningObjectives: string;
  presentCount: number;
  absentCount: number;
  valueMonth?: string;
  sessionId?: string;
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableStageRow({
  stage,
  onChange,
}: {
  stage: KmzhStage;
  onChange: (updated: KmzhStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? "var(--primary-light, #e8f0fe)" : undefined,
  };

  function updateField<K extends keyof KmzhStage>(key: K, val: KmzhStage[K]) {
    onChange({ ...stage, [key]: val });
  }

  const cellStyle: React.CSSProperties = {
    padding: "6px 4px",
    verticalAlign: "top",
    fontSize: 12,
    borderBottom: "1px solid var(--border)",
  };

  return (
    <tr ref={setNodeRef} style={style}>
      <td style={{ ...cellStyle, cursor: "grab", textAlign: "center", color: "var(--muted)" }}
        {...attributes} {...listeners}>
        ⠿
      </td>
      <td style={cellStyle}>
        <input
          className="input"
          style={{ fontSize: 12, padding: "2px 6px", minWidth: 80 }}
          value={stage.label}
          onChange={e => updateField("label", e.target.value)}
        />
      </td>
      <td style={{ ...cellStyle, textAlign: "center" }}>
        <input
          type="number"
          className="input"
          style={{ fontSize: 12, padding: "2px 4px", width: 48, textAlign: "center" }}
          value={stage.duration}
          onChange={e => updateField("duration", Number(e.target.value))}
        />
      </td>
      <td style={cellStyle}>
        <textarea
          style={{ fontSize: 12, padding: "2px 6px", width: "100%", minHeight: 56, resize: "vertical", border: "1px solid var(--border)", borderRadius: 4, fontFamily: "inherit" }}
          value={stage.teacherActions}
          onChange={e => updateField("teacherActions", e.target.value)}
        />
      </td>
      <td style={cellStyle}>
        <textarea
          style={{ fontSize: 12, padding: "2px 6px", width: "100%", minHeight: 56, resize: "vertical", border: "1px solid var(--border)", borderRadius: 4, fontFamily: "inherit" }}
          value={stage.studentActions}
          onChange={e => updateField("studentActions", e.target.value)}
        />
      </td>
      <td style={cellStyle}>
        <textarea
          style={{ fontSize: 12, padding: "2px 6px", width: "100%", minHeight: 56, resize: "vertical", border: "1px solid var(--border)", borderRadius: 4, fontFamily: "inherit" }}
          value={stage.assessmentCriteria.join("\n")}
          onChange={e => updateField("assessmentCriteria", e.target.value.split("\n"))}
        />
      </td>
      <td style={{ ...cellStyle, textAlign: "center" }}>
        <input
          type="number"
          className="input"
          style={{ fontSize: 12, padding: "2px 4px", width: 40, textAlign: "center" }}
          value={stage.totalPoints}
          onChange={e => updateField("totalPoints", Number(e.target.value))}
        />
      </td>
      <td style={cellStyle}>
        <input
          className="input"
          style={{ fontSize: 12, padding: "2px 6px", minWidth: 80 }}
          value={stage.method}
          onChange={e => updateField("method", e.target.value)}
        />
      </td>
      <td style={cellStyle}>
        <input
          className="input"
          style={{ fontSize: 12, padding: "2px 6px", minWidth: 80 }}
          value={stage.resources}
          onChange={e => updateField("resources", e.target.value)}
        />
      </td>
    </tr>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function KmzhPanel({
  token,
  language,
  teacher,
}: {
  token: string;
  language: Language;
  teacher: AuthUser;
}) {
  const t = translations[language];

  const [form, setForm] = useState<KmzhInput>({
    lang: language === "kz" ? "kz" : language === "en" ? "en" : "ru",
    teacherName: teacher.fullName ?? "",
    date: new Date().toISOString().slice(0, 10),
    grade: "",
    lessonNumber: "",
    unitTopic: "",
    lessonTitle: teacher.subject ?? "",
    learningObjectives: "",
    presentCount: 25,
    absentCount: 0,
    valueMonth: "",
  });

  const [result, setResult] = useState<KmzhResult | null>(null);
  const [stages, setStages] = useState<KmzhStage[]>([]);
  const [objectives, setObjectives] = useState<KmzhLessonObjectives>({ all: "", most: "", some: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  function setField<K extends keyof KmzhInput>(key: K, val: KmzhInput[K]) {
    setForm(f => {
      const next = { ...f, [key]: val };
      if (key === "date") {
        const month = (val as string).slice(5, 7);
        next.valueMonth = month;
      }
      return next;
    });
  }

  const buildPayload = useCallback(
    (extra?: Partial<KmzhInput>) => ({
      ...form,
      ...extra,
      presentCount: Number(form.presentCount),
      absentCount: Number(form.absentCount),
      valueMonth: form.valueMonth || form.date.slice(5, 7),
    }),
    [form]
  );

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSaveMsg(null);
    try {
      const data = await api.generateKmzh(token, buildPayload()) as KmzhResult;
      setResult(data);
      setStages(data.stages ?? []);
      setObjectives(data.lessonObjectives ?? { all: "", most: "", some: "" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    if (!result) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.regenerateKmzh(token, {
        sessionId: result.meta.sessionId,
        kmzhInput: buildPayload({ sessionId: result.meta.sessionId }),
        bypassCache: true,
      }) as KmzhResult;
      setResult(data);
      setStages(data.stages ?? []);
      setObjectives(data.lessonObjectives ?? { all: "", most: "", some: "" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const planJson = JSON.stringify({ ...result, stages, lessonObjectives: objectives });
      await api.saveKmzh(token, {
        planJson,
        lessonTitle: form.lessonTitle,
        grade: form.grade,
        date: form.date,
      });
      setSaveMsg("✓ " + t.success_saved);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setStages(prev => {
        const oldIdx = prev.findIndex(s => s.id === active.id);
        const newIdx = prev.findIndex(s => s.id === over.id);
        return arrayMove(prev, oldIdx, newIdx).map((s, i) => ({ ...s, order: i + 1 }));
      });
    }
  }

  function updateStage(updated: KmzhStage) {
    setStages(prev => prev.map(s => (s.id === updated.id ? updated : s)));
  }

  const totalMinutes = stages.reduce((s, st) => s + (st.duration || 0), 0);
  const totalPoints = stages.reduce((s, st) => s + (st.totalPoints || 0), 0);
  const regenCount = result?.meta?.regenerationCount ?? 0;
  const maxRegen = result?.meta?.maxRegenerations ?? 3;
  const canRegen = regenCount < maxRegen;

  const inputLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 3, display: "block" };
  const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", marginBottom: 10 };

  return (
    <div className="page" style={{ padding: "16px 12px" }}>
      <h1 className="page-title" style={{ marginBottom: 16 }}>
        📋 {t.nav_kmzh ?? "КМЖ Генератор"}
      </h1>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* ── LEFT: Input form ─────────────────────────────── */}
        <div style={{ flex: "0 0 360px", minWidth: 300, maxWidth: 400 }}>
          <div className="card" style={{ padding: "16px 14px" }}>
            <h3 style={{ marginBottom: 14, fontSize: 14 }}>{t.kmzh_params_title}</h3>

            <div style={fieldGroup}>
              <label style={inputLabel}>{t.kmzh_lang_label}</label>
              <select
                className="input"
                value={form.lang}
                onChange={e => setField("lang", e.target.value as "kz" | "ru" | "en")}
              >
                <option value="ru">{t.kmzh_lang_ru}</option>
                <option value="kz">{t.kmzh_lang_kz}</option>
                <option value="en">{t.kmzh_lang_en}</option>
              </select>
            </div>

            <div style={fieldGroup}>
              <label style={inputLabel}>{t.kmzh_teacher_name}</label>
              <input className="input" value={form.teacherName} onChange={e => setField("teacherName", e.target.value)} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...fieldGroup, flex: 1 }}>
                <label style={inputLabel}>{t.date}</label>
                <input type="date" className="input" value={form.date} onChange={e => setField("date", e.target.value)} />
              </div>
              <div style={{ ...fieldGroup, width: 80 }}>
                <label style={inputLabel}>{t.grade}</label>
                <input className="input" placeholder="7А" value={form.grade} onChange={e => setField("grade", e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...fieldGroup, flex: 1 }}>
                <label style={inputLabel}>{t.kmzh_lesson_number}</label>
                <input className="input" placeholder="15" value={form.lessonNumber} onChange={e => setField("lessonNumber", e.target.value)} />
              </div>
              <div style={{ ...fieldGroup, width: 80 }}>
                <label style={inputLabel}>{t.kmzh_present}</label>
                <input type="number" className="input" value={form.presentCount} onChange={e => setField("presentCount", Number(e.target.value))} />
              </div>
              <div style={{ ...fieldGroup, width: 72 }}>
                <label style={inputLabel}>{t.kmzh_absent}</label>
                <input type="number" className="input" value={form.absentCount} onChange={e => setField("absentCount", Number(e.target.value))} />
              </div>
            </div>

            <div style={fieldGroup}>
              <label style={inputLabel}>{t.kmzh_unit_topic}</label>
              <input className="input" placeholder={t.kmzh_unit_topic_placeholder} value={form.unitTopic} onChange={e => setField("unitTopic", e.target.value)} />
            </div>

            <div style={fieldGroup}>
              <label style={inputLabel}>{t.kmzh_lesson_title}</label>
              <input className="input" placeholder={t.kmzh_lesson_title_placeholder} value={form.lessonTitle} onChange={e => setField("lessonTitle", e.target.value)} />
            </div>

            <div style={fieldGroup}>
              <label style={inputLabel}>{t.kmzh_learning_objectives}</label>
              <textarea
                className="input"
                style={{ minHeight: 100, resize: "vertical" }}
                placeholder={t.kmzh_objectives_placeholder}
                value={form.learningObjectives}
                onChange={e => setField("learningObjectives", e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 4 }}
              onClick={handleGenerate}
              disabled={loading || !form.lessonTitle || !form.learningObjectives}
            >
              {loading ? t.kmzh_generating : (t.kmzh_generate ?? "Сгенерировать")}
            </button>

            {error && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "#fee2e2", borderRadius: 6, fontSize: 12, color: "#b91c1c" }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Generated plan ─────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!result && !loading && (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p>{t.kmzh_form_hint}</p>
            </div>
          )}

          {loading && (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
              <p>{t.kmzh_generating_hint}</p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Action bar */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
                {result.meta.fromCache && (
                  <span style={{ padding: "4px 10px", background: "#dcfce7", color: "#15803d", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                    ⚡ {t.kmzh_from_cache ?? "Из кэша — мгновенно"}
                  </span>
                )}

                <button
                  className={`btn ${canRegen ? "btn-outline" : "btn-ghost"}`}
                  onClick={handleRegenerate}
                  disabled={!canRegen || loading}
                  title={!canRegen ? (t.kmzh_regen_limit ?? "Лимит исчерпан") : undefined}
                >
                  🔄 {t.kmzh_regenerate ?? "Перегенерировать"}
                  {" "}
                  <span style={{ fontSize: 11, fontWeight: 700, color: !canRegen ? "var(--danger, #ef4444)" : undefined }}>
                    {regenCount}/{maxRegen}{!canRegen ? ` — ${t.kmzh_regen_limit ?? "лимит"}` : ""}
                  </span>
                </button>

                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  💾 {t.kmzh_save ?? "Сохранить план"}
                </button>

                <button className="btn btn-outline" disabled title="В разработке">
                  📄 {t.kmzh_download_word ?? "Скачать Word"}
                </button>

                <button className="btn btn-outline" disabled title="В разработке">
                  📑 {t.kmzh_download_pdf ?? "Скачать PDF"}
                </button>

                {saveMsg && (
                  <span style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>{saveMsg}</span>
                )}
              </div>

              {/* Header card */}
              <div className="card" style={{ marginBottom: 12, padding: "14px 16px" }}>
                <h3 style={{ marginBottom: 12, fontSize: 14 }}>{t.kmzh_header_title}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 13 }}>
                  {[
                    [t.teacher_label, "teacherName"],
                    [t.date, "date"],
                    [t.grade, "grade"],
                    [t.kmzh_lesson_number, "lessonNumber"],
                    [t.subject, "lessonTitle"],
                    [t.kmzh_unit_topic, "unitTopic"],
                    [t.kmzh_present, "presentCount"],
                    [t.kmzh_absent, "absentCount"],
                  ].map(([label, key]) => (
                    <div key={key}>
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>{label}</span>
                      <input
                        className="input"
                        style={{ fontSize: 13, padding: "3px 8px", marginTop: 2 }}
                        value={String(form[key as keyof KmzhInput] ?? "")}
                        onChange={e => setField(key as keyof KmzhInput, e.target.value as never)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Adal Azamat card */}
              {result.header?.valueLink && (
                <div className="card" style={{ marginBottom: 12, padding: "10px 16px", background: "linear-gradient(135deg, #fef3c7, #fde68a)", border: "1px solid #f59e0b" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>
                    {t.kmzh_adal_azamat ?? "Адал азамат"}: {String(result.header.valueLink)}
                  </span>
                </div>
              )}

              {/* Lesson objectives */}
              <div className="card" style={{ marginBottom: 12, padding: "14px 16px" }}>
                <h3 style={{ marginBottom: 12, fontSize: 14 }}>{t.kmzh_lesson_objectives ?? "Цели урока"}</h3>
                {(["all", "most", "some"] as const).map(level => (
                  <div key={level} style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 3 }}>
                      {level === "all" ? (t.kmzh_all_learners ?? "Все ученики смогут") :
                       level === "most" ? (t.kmzh_most_learners ?? "Большинство смогут") :
                       (t.kmzh_some_learners ?? "Некоторые смогут")}
                    </label>
                    <textarea
                      className="input"
                      style={{ minHeight: 48, resize: "vertical", fontSize: 13 }}
                      value={objectives[level]}
                      onChange={e => setObjectives(prev => ({ ...prev, [level]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {/* Stages table */}
              <div className="card" style={{ marginBottom: 12, padding: "14px 16px", overflowX: "auto" }}>
                <h3 style={{ marginBottom: 12, fontSize: 14 }}>{t.kmzh_stages_title}</h3>
                {stages.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: 13 }}>{t.kmzh_no_stages}</p>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid var(--border)" }}>
                            <th style={{ padding: "4px 4px", width: 24 }}></th>
                            <th style={{ padding: "4px 6px", textAlign: "left", whiteSpace: "nowrap" }}>{t.kmzh_stage}</th>
                            <th style={{ padding: "4px 6px", width: 56, textAlign: "center" }}>{t.kmzh_min}</th>
                            <th style={{ padding: "4px 6px", minWidth: 120, textAlign: "left" }}>{t.kmzh_teacher_actions}</th>
                            <th style={{ padding: "4px 6px", minWidth: 120, textAlign: "left" }}>{t.kmzh_student_actions}</th>
                            <th style={{ padding: "4px 6px", minWidth: 100, textAlign: "left" }}>{t.kmzh_assessment_criteria}</th>
                            <th style={{ padding: "4px 6px", width: 48, textAlign: "center" }}>{t.kmzh_points_col}</th>
                            <th style={{ padding: "4px 6px", minWidth: 80, textAlign: "left" }}>{t.kmzh_method}</th>
                            <th style={{ padding: "4px 6px", minWidth: 80, textAlign: "left" }}>{t.kmzh_resources}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stages.map(stage => (
                            <SortableStageRow key={stage.id} stage={stage} onChange={updateStage} />
                          ))}
                        </tbody>
                      </table>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Footer totals */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div className="card" style={{ padding: "10px 20px", flex: "0 0 auto" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.kmzh_total_minutes ?? "Итого минут"}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: totalMinutes === 45 ? "#15803d" : "#ef4444" }}>
                    {totalMinutes} / 45
                  </div>
                </div>
                <div className="card" style={{ padding: "10px 20px", flex: "0 0 auto" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.kmzh_total_points ?? "Итого баллов"}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: totalPoints === 10 ? "#15803d" : "#ef4444" }}>
                    {totalPoints} / 10
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
