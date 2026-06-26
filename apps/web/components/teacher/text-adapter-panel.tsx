"use client";
import { useRef, useState } from "react";
import { api, type AdaptationResult, type AdaptationRecord } from "../../lib/api";
import { Language, translations } from "../../lib/translations";

const MAX_CHARS = 8000;

// ─── Icons ─────────────────────────────────────────────────────────────────────

function IconDocument() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconQuestion() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

// recall → lightbulb, inference → magnifier
function IconRecall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
    </svg>
  );
}

function IconInference() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "ta-spin .7s linear infinite",
      }}
    >
      <style>{`@keyframes ta-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────────

export function TextAdapterPanel({
  token,
  language,
}: {
  token: string;
  language: Language;
}) {
  const t = translations[language];

  const [sourceMode, setSourceMode] = useState<"text" | "pdf">("text");
  const [sourceText, setSourceText] = useState("");
  const [targetGrade, setTargetGrade] = useState(5);
  const [adaptLang, setAdaptLang] = useState<"kz" | "ru">(language === "kz" ? "kz" : "ru");
  const [result, setResult] = useState<AdaptationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfTruncated, setPdfTruncated] = useState(false);

  // Save / translate / history state
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"kz" | "ru">(language === "kz" ? "kz" : "ru");
  const [view, setView] = useState<"editor" | "history">("editor");
  const [adaptations, setAdaptations] = useState<AdaptationRecord[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Export / copy state
  const [isCopied, setIsCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const charCount = sourceText.length;
  const overLimit = charCount > MAX_CHARS;

  async function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingPdf(true);
    setError(null);
    setPdfTruncated(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.extractPdf(token, fd);
      if (!res || typeof res.text !== "string") {
        throw new Error(res?.message || "PDF extraction failed");
      }
      setSourceText(res.text);
      setPdfTruncated(res.truncated === true);
      setSourceMode("text");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExtractingPdf(false);
      // Allow re-selecting the same file.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAdapt() {
    if (!sourceText.trim() || overLimit) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.adaptText(token, {
        sourceText: sourceText.trim(),
        targetGrade,
        language: adaptLang,
        sourceType: "text",
      });
      setResult(res);
      // Fresh adaptation → reset save state, current language follows generation.
      setCurrentLanguage(adaptLang);
      setSavedId(null);
      setSaveSuccess(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleTranslate() {
    if (!result) return;
    const toLang: "kz" | "ru" = currentLanguage === "ru" ? "kz" : "ru";
    setIsTranslating(true);
    setError(null);
    try {
      const translated = await api.translateAdaptation(token, {
        result,
        fromLang: currentLanguage,
        toLang,
      });
      setResult(translated);
      setCurrentLanguage(toLang);
      // Translated variant is a new document — requires a separate save.
      setSavedId(null);
      setSaveSuccess(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setIsSaving(true);
    setError(null);
    try {
      if (savedId) {
        await api.updateAdaptation(token, savedId, { result, language: currentLanguage });
      } else {
        const rec = await api.saveAdaptation(token, {
          sourceText: sourceText.trim(),
          sourceType: "text",
          targetGrade,
          language: currentLanguage,
          result,
        });
        setSavedId(rec.id);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    const textToCopy = [
      `=== ${t.ta_adapted_text} ===`,
      result.adaptedText,
      "",
      `=== ${t.ta_summary} ===`,
      result.summary,
      "",
      `=== ${t.ta_questions} ===`,
      result.questions.map((q, i) => `${i + 1}. [${q.type}] ${q.q}`).join("\n"),
      "",
      `=== ${t.ta_vocabulary} ===`,
      result.vocabulary.map((v) => `${v.term} — ${v.definition}`).join("\n"),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? t.ta_copy_error : String(err));
    }
  }

  async function handleExportPdf() {
    if (!exportRef.current) return;
    setIsExporting(true);
    setError(null);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Slice the tall image across A4 pages.
      let remainingHeight = imgHeight;
      let yOffset = 10;
      let sourceY = 0;
      while (remainingHeight > 0) {
        const sliceHeight = Math.min(remainingHeight, pageHeight - 20);
        pdf.addImage(imgData, "PNG", 10, yOffset - sourceY, imgWidth, imgHeight);
        remainingHeight -= pageHeight - 20;
        sourceY += pageHeight - 20;
        if (remainingHeight > 0) {
          pdf.addPage();
          yOffset = 10;
        }
      }

      pdf.save(`aqyl-adaptation-grade${targetGrade}-${currentLanguage}.pdf`);
    } catch (err: unknown) {
      setError(err instanceof Error ? t.ta_export_error : String(err));
    } finally {
      setIsExporting(false);
    }
  }

  async function loadHistory() {
    setIsLoadingHistory(true);
    setError(null);
    try {
      const list = await api.getAdaptations(token);
      setAdaptations(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingHistory(false);
    }
  }

  function switchView(next: "editor" | "history") {
    setView(next);
    if (next === "history") loadHistory();
  }

  async function openAdaptation(id: string) {
    setError(null);
    try {
      const rec = await api.getAdaptation(token, id);
      setSourceText(rec.sourceText);
      setSourceMode("text");
      setTargetGrade(rec.targetGrade);
      setResult(rec.result);
      setCurrentLanguage(rec.language);
      setSavedId(rec.id);
      setSaveSuccess(false);
      setView("editor");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeAdaptation(id: string) {
    if (typeof window !== "undefined" && !window.confirm(t.ta_delete_confirm)) return;
    setError(null);
    try {
      await api.deleteAdaptation(token, id);
      setAdaptations((prev) => (prev ? prev.filter((a) => a.id !== id) : prev));
      if (savedId === id) setSavedId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.${d.getFullYear()}`;
  }

  // ─── Styles ────────────────────────────────────────────────────────────────

  const sectionLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--muted)",
    marginBottom: 6,
    display: "block",
  };

  const blockHeading: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 10,
    color: "var(--text, #1e293b)",
  };

  return (
    <div className="page" style={{ padding: "16px 12px" }}>
      <h1 className="page-title" style={{ marginBottom: 16 }}>
        📖 {t.ta_title}
      </h1>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
        {([
          ["editor", t.ta_tab_editor],
          ["history", t.ta_tab_history],
        ] as const).map(([key, label]) => {
          const active = view === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => switchView(key)}
              style={{
                padding: "8px 16px",
                border: "none",
                borderBottom: active ? "2px solid var(--primary, #2563eb)" : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: active ? "var(--primary, #2563eb)" : "var(--muted)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {view === "editor" && (
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* ── LEFT: Input ───────────────────────────────────── */}
        <div style={{ flex: "0 0 380px", minWidth: 300, maxWidth: 420 }}>
          <div className="card" style={{ padding: "16px 14px" }}>
            {/* Source mode tabs */}
            <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 14 }}>
              {([
                ["text", t.ta_source_text],
                ["pdf", t.ta_source_pdf],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSourceMode(key)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    background: sourceMode === key ? "var(--primary, #2563eb)" : "transparent",
                    color: sourceMode === key ? "#fff" : "var(--text, #334155)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {sourceMode === "text" ? (
              <>
                <textarea
                  className="input"
                  style={{ width: "100%", resize: "vertical", minHeight: 240 }}
                  rows={12}
                  placeholder={t.ta_paste_placeholder}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                />
                <div
                  style={{
                    textAlign: "right",
                    fontSize: 12,
                    marginTop: 4,
                    color: overLimit ? "#dc2626" : "var(--muted)",
                    fontWeight: overLimit ? 700 : 400,
                  }}
                >
                  {charCount} / {MAX_CHARS} {t.ta_char_count}
                </div>
                {pdfTruncated && (
                  <div style={{ marginTop: 8, padding: "8px 12px", background: "#fef3c7", borderRadius: 6, fontSize: 12, color: "#92400e" }}>
                    {t.ta_truncated_warning}
                  </div>
                )}
              </>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfChange}
                  disabled={isExtractingPdf}
                  style={{ display: "none" }}
                  id="ta-pdf-input"
                />
                <label
                  htmlFor="ta-pdf-input"
                  className="btn btn-outline"
                  style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, cursor: isExtractingPdf ? "default" : "pointer" }}
                >
                  {isExtractingPdf ? (
                    <>
                      <Spinner /> {t.ta_extracting}
                    </>
                  ) : (
                    t.ta_extract_pdf_btn
                  )}
                </label>
                <p style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>PDF · max 10 MB</p>
              </div>
            )}

            {/* Grade selector */}
            <div style={{ marginTop: 16 }}>
              <label style={sectionLabel}>{t.ta_grade_label}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => {
                  const active = targetGrade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setTargetGrade(g)}
                      style={{
                        padding: "8px 0",
                        borderRadius: 8,
                        border: active ? "2px solid var(--primary, #2563eb)" : "1px solid var(--border)",
                        background: active ? "var(--primary-light, #eff6ff)" : "var(--card, #fff)",
                        color: active ? "var(--primary, #2563eb)" : "var(--text, #334155)",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language toggle */}
            <div style={{ marginTop: 16 }}>
              <label style={sectionLabel}>{t.ta_language_label}</label>
              <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                {(["kz", "ru"] as const).map((lng) => (
                  <button
                    key={lng}
                    type="button"
                    onClick={() => setAdaptLang(lng)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      background: adaptLang === lng ? "var(--primary, #2563eb)" : "transparent",
                      color: adaptLang === lng ? "#fff" : "var(--text, #334155)",
                    }}
                  >
                    {lng.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 16 }}
              onClick={handleAdapt}
              disabled={isGenerating || !sourceText.trim() || overLimit}
            >
              {isGenerating ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Spinner /> {t.ta_adapting}
                </span>
              ) : (
                t.ta_adapt_btn
              )}
            </button>

            {error && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "#fee2e2", borderRadius: 6, fontSize: 12, color: "#b91c1c" }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Result ─────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!result && !isGenerating && (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
              <p>{t.ta_result_placeholder}</p>
            </div>
          )}

          {isGenerating && (
            <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
              <Spinner size={40} />
              <p style={{ marginTop: 16 }}>{t.ta_adapting}</p>
            </div>
          )}

          {result && !isGenerating && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Exportable region (blocks only, no action buttons) */}
              <div ref={exportRef} style={{ display: "flex", flexDirection: "column", gap: 12, background: "#ffffff" }}>
              {/* Block 1: adapted text */}
              <div className="card" style={{ padding: "16px 18px" }}>
                <div style={blockHeading}>
                  <IconDocument /> {t.ta_adapted_text}
                </div>
                <p style={{ lineHeight: 1.7, whiteSpace: "pre-wrap", fontSize: 14, margin: 0 }}>
                  {result.adaptedText}
                </p>
              </div>

              {/* Block 2: summary */}
              <div className="card" style={{ padding: "16px 18px" }}>
                <div style={blockHeading}>
                  <IconList /> {t.ta_summary}
                </div>
                <p style={{ lineHeight: 1.6, fontStyle: "italic", fontSize: 14, margin: 0, color: "var(--text, #334155)" }}>
                  {result.summary}
                </p>
              </div>

              {/* Block 3: questions */}
              <div className="card" style={{ padding: "16px 18px" }}>
                <div style={blockHeading}>
                  <IconQuestion /> {t.ta_questions}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.questions?.map((q, i) => (
                    <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ flex: "0 0 auto", marginTop: 2 }} title={q.type === "recall" ? t.ta_recall_label : t.ta_inference_label}>
                        {q.type === "recall" ? <IconRecall /> : <IconInference />}
                      </span>
                      <span style={{ fontSize: 14, lineHeight: 1.5 }}>
                        {q.q}
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "1px 7px",
                            borderRadius: 10,
                            background: q.type === "recall" ? "#dcfce7" : "#ede9fe",
                            color: q.type === "recall" ? "#15803d" : "#6B5CE7",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {q.type === "recall" ? t.ta_recall_label : t.ta_inference_label}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Block 4: vocabulary */}
              <div className="card" style={{ padding: "16px 18px" }}>
                <div style={blockHeading}>
                  <IconBook /> {t.ta_vocabulary}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.vocabulary?.map((v, i) => (
                    <li key={i} style={{ fontSize: 14, lineHeight: 1.5 }}>
                      <strong>{v.term}</strong>
                      <span style={{ color: "var(--muted)" }}> — {v.definition}</span>
                    </li>
                  ))}
                </ul>
              </div>
              </div>
              {/* End exportable region */}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  className="btn btn-outline"
                  onClick={handleTranslate}
                  disabled={isTranslating || isSaving}
                >
                  {isTranslating ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Spinner /> {t.ta_translating}
                    </span>
                  ) : currentLanguage === "ru" ? (
                    t.ta_translate_to_kz
                  ) : (
                    t.ta_translate_to_ru
                  )}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={isSaving || isTranslating}
                >
                  {isSaving ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Spinner /> {t.ta_saving}
                    </span>
                  ) : (
                    t.ta_save_btn
                  )}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={handleExportPdf}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Spinner /> {t.ta_exporting}
                    </span>
                  ) : (
                    t.ta_export_pdf_btn
                  )}
                </button>
                <button className="btn btn-outline" onClick={handleCopy}>
                  {t.ta_copy_btn}
                </button>
                {saveSuccess && (
                  <span style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                    ✓ {t.ta_saved_toast}
                  </span>
                )}
                {isCopied && (
                  <span style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                    ✓ {t.ta_copied_toast}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {view === "history" && (
        <div>
          {isLoadingHistory && (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
              <Spinner size={32} />
            </div>
          )}

          {!isLoadingHistory && adaptations && adaptations.length === 0 && (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
              <p>{t.ta_history_empty}</p>
            </div>
          )}

          {!isLoadingHistory && adaptations && adaptations.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              {adaptations.map((a) => (
                <div key={a.id} className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ padding: "2px 8px", background: "var(--primary-light, #eff6ff)", color: "var(--primary, #2563eb)", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                      {t.ta_grade_badge.replace("{grade}", String(a.targetGrade))}
                    </span>
                    <span style={{ padding: "2px 8px", background: "#f1f5f9", color: "#475569", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                      {a.language.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text, #334155)", margin: 0, lineHeight: 1.4 }}>
                    {a.sourceText.slice(0, 80)}
                    {a.sourceText.length > 80 ? t.ta_chars_preview : ""}
                  </p>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{formatDate(a.createdAt)}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                    <button className="btn btn-primary" style={{ flex: 1, fontSize: 12 }} onClick={() => openAdaptation(a.id)}>
                      {t.ta_open_btn}
                    </button>
                    <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => removeAdaptation(a.id)}>
                      {t.ta_delete_btn}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#fee2e2", borderRadius: 6, fontSize: 12, color: "#b91c1c" }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
