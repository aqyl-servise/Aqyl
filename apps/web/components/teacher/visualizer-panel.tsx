"use client";
import { useEffect, useRef, useState } from "react";
import { api, type DiagramRecord } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { jsonToMermaid, type DiagramContract } from "../../lib/json-to-mermaid";

// ─── Diagram type metadata (icon + i18n label key) ─────────────────────────────

type DiagramTypeKey =
  | "process"
  | "mindmap"
  | "timeline"
  | "cycle"
  | "hierarchy"
  | "comparison";

const TYPE_OPTIONS: { key: DiagramTypeKey; labelKey: keyof typeof translations.ru; icon: React.ReactNode }[] = [
  {
    key: "process",
    labelKey: "visualizer_type_process",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="5" rx="1" />
        <rect x="9" y="17" width="6" height="5" rx="1" />
        <rect x="2" y="9.5" width="6" height="5" rx="1" />
        <rect x="16" y="9.5" width="6" height="5" rx="1" />
        <path d="M12 7v3M12 14v3M8 12h2M14 12h2" />
      </svg>
    ),
  },
  {
    key: "mindmap",
    labelKey: "visualizer_type_mindmap",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <circle cx="4" cy="5" r="2" />
        <circle cx="20" cy="5" r="2" />
        <circle cx="4" cy="19" r="2" />
        <circle cx="20" cy="19" r="2" />
        <path d="M9.5 10.5 5.5 6.5M14.5 10.5l4-4M9.5 13.5l-4 4M14.5 13.5l4 4" />
      </svg>
    ),
  },
  {
    key: "timeline",
    labelKey: "visualizer_type_timeline",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="18" cy="12" r="2" />
        <path d="M6 10V6M12 14v4M18 10V6" />
      </svg>
    ),
  },
  {
    key: "cycle",
    labelKey: "visualizer_type_cycle",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 3v5h-5" />
      </svg>
    ),
  },
  {
    key: "hierarchy",
    labelKey: "visualizer_type_hierarchy",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="5" rx="1" />
        <rect x="2" y="17" width="6" height="5" rx="1" />
        <rect x="16" y="17" width="6" height="5" rx="1" />
        <path d="M12 7v4M5 17v-2h14v2" />
      </svg>
    ),
  },
  {
    key: "comparison",
    labelKey: "visualizer_type_comparison",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="7" height="16" rx="1" />
        <rect x="14" y="4" width="7" height="16" rx="1" />
        <path d="M12 8v8" />
      </svg>
    ),
  },
];

// ─── Theme metadata ────────────────────────────────────────────────────────────

const THEME_OPTIONS: {
  key: string;
  labelKey: keyof typeof translations.ru;
  color: string;
  bg: string;
}[] = [
  { key: "aqyl-blue", labelKey: "visualizer_theme_blue", color: "#6B5CE7", bg: "#EEF0FF" },
  { key: "aqyl-green", labelKey: "visualizer_theme_green", color: "#3DB88E", bg: "#E8F8F4" },
  { key: "aqyl-warm", labelKey: "visualizer_theme_warm", color: "#F5A623", bg: "#FFF8EC" },
  { key: "neutral", labelKey: "visualizer_theme_neutral", color: "#9E9E9E", bg: "#F5F5F5" },
];

// CSS variables: --fill (node fill), --stroke (node/edge stroke), --label (text color).
const THEME_CSS = `
.theme-aqyl-blue .mermaid-container svg .node rect,
.theme-aqyl-blue .mermaid-container svg .node circle,
.theme-aqyl-blue .mermaid-container svg .node polygon,
.theme-aqyl-blue .mermaid-container svg .node path { fill: #EEF0FF !important; stroke: #6B5CE7 !important; }
.theme-aqyl-blue .mermaid-container svg .edgePath path,
.theme-aqyl-blue .mermaid-container svg .flowchart-link { stroke: #6B5CE7 !important; }
.theme-aqyl-blue .mermaid-container svg .edgePath marker path { fill: #6B5CE7 !important; stroke: #6B5CE7 !important; }
.theme-aqyl-blue .mermaid-container svg .label,
.theme-aqyl-blue .mermaid-container svg .nodeLabel { color: #2E2780 !important; fill: #2E2780 !important; }

.theme-aqyl-green .mermaid-container svg .node rect,
.theme-aqyl-green .mermaid-container svg .node circle,
.theme-aqyl-green .mermaid-container svg .node polygon,
.theme-aqyl-green .mermaid-container svg .node path { fill: #E8F8F4 !important; stroke: #3DB88E !important; }
.theme-aqyl-green .mermaid-container svg .edgePath path,
.theme-aqyl-green .mermaid-container svg .flowchart-link { stroke: #3DB88E !important; }
.theme-aqyl-green .mermaid-container svg .edgePath marker path { fill: #3DB88E !important; stroke: #3DB88E !important; }
.theme-aqyl-green .mermaid-container svg .label,
.theme-aqyl-green .mermaid-container svg .nodeLabel { color: #1A5C47 !important; fill: #1A5C47 !important; }

.theme-aqyl-warm .mermaid-container svg .node rect,
.theme-aqyl-warm .mermaid-container svg .node circle,
.theme-aqyl-warm .mermaid-container svg .node polygon,
.theme-aqyl-warm .mermaid-container svg .node path { fill: #FFF8EC !important; stroke: #F5A623 !important; }
.theme-aqyl-warm .mermaid-container svg .edgePath path,
.theme-aqyl-warm .mermaid-container svg .flowchart-link { stroke: #F5A623 !important; }
.theme-aqyl-warm .mermaid-container svg .edgePath marker path { fill: #F5A623 !important; stroke: #F5A623 !important; }
.theme-aqyl-warm .mermaid-container svg .label,
.theme-aqyl-warm .mermaid-container svg .nodeLabel { color: #7A4F00 !important; fill: #7A4F00 !important; }

.theme-neutral .mermaid-container svg .node rect,
.theme-neutral .mermaid-container svg .node circle,
.theme-neutral .mermaid-container svg .node polygon,
.theme-neutral .mermaid-container svg .node path { fill: #F5F5F5 !important; stroke: #9E9E9E !important; }
.theme-neutral .mermaid-container svg .edgePath path,
.theme-neutral .mermaid-container svg .flowchart-link { stroke: #9E9E9E !important; }
.theme-neutral .mermaid-container svg .edgePath marker path { fill: #9E9E9E !important; stroke: #9E9E9E !important; }
.theme-neutral .mermaid-container svg .label,
.theme-neutral .mermaid-container svg .nodeLabel { color: #333 !important; fill: #333 !important; }
`;

// ─── Main panel ────────────────────────────────────────────────────────────────

export function VisualizerPanel({
  token,
  language,
}: {
  token: string;
  language: Language;
}) {
  const t = translations[language];

  const [topicOrText, setTopicOrText] = useState("");
  const [selectedType, setSelectedType] = useState<DiagramTypeKey>("process");
  const [diagramLang, setDiagramLang] = useState<"kz" | "ru">(language === "kz" ? "kz" : "ru");
  const [diagramContract, setDiagramContract] = useState<DiagramContract | null>(null);
  const [mermaidSvg, setMermaidSvg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Edit / theme / save state
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState<string>("aqyl-blue");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // History / tab state
  const [view, setView] = useState<"editor" | "history">("editor");
  const [diagrams, setDiagrams] = useState<DiagramRecord[] | null>(null);
  const [isLoadingDiagrams, setIsLoadingDiagrams] = useState(false);

  const renderTokenRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function handleGenerate() {
    if (!topicOrText.trim()) return;
    setIsGenerating(true);
    setError(null);
    setRenderError(null);
    try {
      const contract = await api.generateDiagram(token, {
        topicOrText: topicOrText.trim(),
        type: selectedType,
        language: diagramLang,
      });
      setDiagramContract(contract);
      // Fresh diagram → reset edit/save state.
      setTitle(contract.title || "");
      setTheme(contract.theme || "aqyl-blue");
      setSavedId(null);
      setSaveSuccess(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsGenerating(false);
    }
  }

  // Update a single node's label locally and re-render Mermaid (no server call).
  function updateNodeLabel(id: string, label: string) {
    setDiagramContract((prev) =>
      prev
        ? { ...prev, nodes: prev.nodes.map((n) => (n.id === id ? { ...n, label } : n)) }
        : prev,
    );
  }

  async function handleSave() {
    if (!diagramContract) return;
    setIsSaving(true);
    setError(null);
    try {
      const content: DiagramContract = { ...diagramContract, title, theme };
      if (savedId) {
        await api.updateDiagram(token, savedId, { title, content, theme });
      } else {
        const rec = await api.saveDiagram(token, { title, content, theme });
        setSavedId(rec.id);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Export ────────────────────────────────────────────────────────────────

  function fileBase() {
    const name = (title || "diagram").replace(/[\\/:*?"<>|]+/g, "").trim();
    return name || "diagram";
  }

  function triggerDownload(href: string, filename: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleExportSvg() {
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const blob = new Blob([svgEl.outerHTML], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${fileBase()}.svg`);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsExporting(false);
    }
  }

  async function makePngDataUrl(): Promise<string> {
    if (!containerRef.current) throw new Error("no-container");
    const { toPng } = await import("html-to-image");
    return toPng(containerRef.current, { backgroundColor: "#ffffff" });
  }

  async function handleExportPng() {
    setIsExporting(true);
    setExportError(null);
    try {
      const dataUrl = await makePngDataUrl();
      triggerDownload(dataUrl, `${fileBase()}.png`);
    } catch {
      // html-to-image cannot rasterize SVGs containing foreignObject (mindmap/timeline).
      setExportError(t.visualizer_export_error);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportPdf() {
    setIsExporting(true);
    setExportError(null);
    try {
      const dataUrl = await makePngDataUrl();
      // Measure the rendered PNG to size the page.
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("img-load"));
        img.src = dataUrl;
      });
      const { jsPDF } = await import("jspdf");
      const orientation = img.width >= img.height ? "landscape" : "portrait";
      const pdf = new jsPDF({
        orientation,
        unit: "px",
        format: [img.width + 20, img.height + 20],
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(dataUrl, "PNG", 10, 10, pageWidth - 20, pageHeight - 20);
      pdf.save(`${fileBase()}.pdf`);
    } catch {
      setExportError(t.visualizer_export_error);
    } finally {
      setIsExporting(false);
    }
  }

  // ─── History ───────────────────────────────────────────────────────────────

  async function loadDiagrams() {
    setIsLoadingDiagrams(true);
    setError(null);
    try {
      const list = await api.getDiagrams(token);
      setDiagrams(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoadingDiagrams(false);
    }
  }

  function switchView(next: "editor" | "history") {
    setView(next);
    if (next === "history") loadDiagrams();
  }

  async function openDiagram(id: string) {
    setError(null);
    try {
      const rec = await api.getDiagram(token, id);
      setDiagramContract(rec.content);
      setTitle(rec.title || rec.content?.title || "");
      setTheme(rec.theme || rec.content?.theme || "aqyl-blue");
      setSavedId(rec.id);
      setSaveSuccess(false);
      setExportError(null);
      setView("editor");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function removeDiagram(id: string) {
    if (typeof window !== "undefined" && !window.confirm(t.visualizer_delete_confirm)) return;
    setError(null);
    try {
      await api.deleteDiagram(token, id);
      setDiagrams((prev) => (prev ? prev.filter((d) => d.id !== id) : prev));
      if (savedId === id) setSavedId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Render Mermaid on the client whenever the contract changes.
  useEffect(() => {
    if (!diagramContract) {
      setMermaidSvg(null);
      return;
    }
    const myToken = ++renderTokenRef.current;
    let cancelled = false;

    (async () => {
      try {
        const code = jsonToMermaid(diagramContract);
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "base" });
        const { svg } = await mermaid.render(`diagram-${Date.now()}`, code);
        // Ignore stale renders.
        if (cancelled || myToken !== renderTokenRef.current) return;
        setRenderError(null);
        setMermaidSvg(svg);
      } catch (e: unknown) {
        if (cancelled || myToken !== renderTokenRef.current) return;
        setMermaidSvg(null);
        setRenderError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [diagramContract]);

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const sectionLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--muted)",
    marginBottom: 6,
    display: "block",
  };

  const dividerLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text, #334155)",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: "1px solid var(--border)",
  };

  return (
    <div className="page" style={{ padding: "16px 12px" }}>
      <h1 className="page-title" style={{ marginBottom: 16 }}>
        🗺️ {t.visualizer_title}
      </h1>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
        {([
          ["editor", t.visualizer_tab_editor],
          ["history", t.visualizer_tab_history],
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
        <div style={{ flex: "0 0 320px", minWidth: 280, maxWidth: 360 }}>
          <div className="card" style={{ padding: "16px 14px" }}>
            <label style={sectionLabel}>{t.visualizer_title}</label>
            <textarea
              className="input"
              style={{ minHeight: 120, resize: "vertical", width: "100%" }}
              placeholder={t.visualizer_topic_placeholder}
              value={topicOrText}
              onChange={(e) => setTopicOrText(e.target.value)}
            />

            {/* Type selector grid */}
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {TYPE_OPTIONS.map((opt) => {
                  const active = selectedType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedType(opt.key)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        padding: "10px 6px",
                        borderRadius: 8,
                        border: active
                          ? "2px solid var(--primary, #2563eb)"
                          : "1px solid var(--border)",
                        background: active ? "var(--primary-light, #eff6ff)" : "var(--card, #fff)",
                        color: active ? "var(--primary, #2563eb)" : "var(--text, #334155)",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                        transition: "all .12s",
                      }}
                    >
                      {opt.icon}
                      <span style={{ textAlign: "center", lineHeight: 1.2 }}>
                        {t[opt.labelKey]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language toggle */}
            <div style={{ marginTop: 14 }}>
              <label style={sectionLabel}>KZ / RU</label>
              <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                {(["kz", "ru"] as const).map((lng) => (
                  <button
                    key={lng}
                    type="button"
                    onClick={() => setDiagramLang(lng)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      background: diagramLang === lng ? "var(--primary, #2563eb)" : "transparent",
                      color: diagramLang === lng ? "#fff" : "var(--text, #334155)",
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
              onClick={handleGenerate}
              disabled={isGenerating || !topicOrText.trim()}
            >
              {isGenerating ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Spinner /> {t.visualizer_generating}
                </span>
              ) : (
                t.visualizer_generate_btn
              )}
            </button>

            {error && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "#fee2e2", borderRadius: 6, fontSize: 12, color: "#b91c1c" }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Preview ───────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={`card theme-${theme}`} style={{ padding: 16, minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {!diagramContract && !isGenerating && (
              <div style={{ textAlign: "center", color: "var(--muted)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
                <p>{t.visualizer_preview_placeholder}</p>
              </div>
            )}

            {isGenerating && (
              <div style={{ textAlign: "center", color: "var(--muted)" }}>
                <Spinner size={36} />
                <p style={{ marginTop: 12 }}>{t.visualizer_generating}</p>
              </div>
            )}

            {diagramContract && !isGenerating && renderError && (
              <div style={{ textAlign: "center", color: "#b91c1c" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
                <p style={{ fontWeight: 600 }}>{t.visualizer_render_error}</p>
                <p style={{ fontSize: 12, marginTop: 6, color: "var(--muted)" }}>{renderError}</p>
              </div>
            )}

            {diagramContract && !isGenerating && !renderError && mermaidSvg && (
              <div
                ref={containerRef}
                className="mermaid-container"
                style={{ width: "100%", overflow: "auto", textAlign: "center" }}
                dangerouslySetInnerHTML={{ __html: mermaidSvg }}
              />
            )}
          </div>
        </div>

        {/* ── RIGHT: Edit / theme / save ─────────────────────── */}
        <div style={{ flex: "0 0 280px", minWidth: 240 }}>
          {!diagramContract ? (
            <div className="card" style={{ padding: 16, textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>✏️</div>
              <p style={{ fontSize: 13 }}>{t.visualizer_preview_placeholder}</p>
            </div>
          ) : (
            <div className="card" style={{ padding: "16px 14px" }}>
              {/* Title */}
              <label style={sectionLabel}>{t.visualizer_title_label}</label>
              <input
                className="input"
                style={{ width: "100%" }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              {/* Nodes */}
              <div style={{ ...dividerLabel, marginTop: 16 }}>{t.visualizer_nodes_label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {diagramContract.nodes.map((node) => (
                  <input
                    key={node.id}
                    className="input"
                    style={{ width: "100%", fontSize: 13 }}
                    value={node.label}
                    onChange={(e) => updateNodeLabel(node.id, e.target.value)}
                  />
                ))}
              </div>

              {/* Theme */}
              <div style={{ ...dividerLabel, marginTop: 16 }}>{t.visualizer_theme_label}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {THEME_OPTIONS.map((opt) => {
                  const active = theme === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setTheme(opt.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: active
                          ? `2px solid ${opt.color}`
                          : "1px solid var(--border)",
                        background: active ? opt.bg : "var(--card, #fff)",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text, #334155)",
                      }}
                    >
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: opt.color,
                          flex: "0 0 auto",
                        }}
                      />
                      {t[opt.labelKey]}
                    </button>
                  );
                })}
              </div>

              {/* Save */}
              <button
                className="btn btn-primary"
                style={{ width: "100%", marginTop: 16 }}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Spinner /> {t.visualizer_saving}
                  </span>
                ) : (
                  t.visualizer_save_btn
                )}
              </button>

              {saveSuccess && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "#dcfce7",
                    borderRadius: 6,
                    fontSize: 13,
                    color: "#15803d",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  ✓ {t.visualizer_saved_toast}
                </div>
              )}

              {/* Export */}
              {mermaidSvg && !renderError && (
                <>
                  <div style={{ ...dividerLabel, marginTop: 16 }}>PNG / SVG / PDF</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-outline"
                      style={{ flex: 1 }}
                      onClick={handleExportPng}
                      disabled={isExporting}
                    >
                      {t.visualizer_export_png}
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ flex: 1 }}
                      onClick={handleExportSvg}
                      disabled={isExporting}
                    >
                      {t.visualizer_export_svg}
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ flex: 1 }}
                      onClick={handleExportPdf}
                      disabled={isExporting}
                    >
                      {t.visualizer_export_pdf}
                    </button>
                  </div>
                  {isExporting && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
                      <Spinner /> {t.visualizer_exporting}
                    </div>
                  )}
                  {exportError && (
                    <div style={{ marginTop: 8, padding: "8px 12px", background: "#fee2e2", borderRadius: 6, fontSize: 12, color: "#b91c1c" }}>
                      {exportError}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {view === "history" && (
        <div>
          {isLoadingDiagrams && (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
              <Spinner size={32} />
            </div>
          )}

          {!isLoadingDiagrams && diagrams && diagrams.length === 0 && (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🗂️</div>
              <p>{t.visualizer_history_empty}</p>
            </div>
          )}

          {!isLoadingDiagrams && diagrams && diagrams.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {diagrams.map((d) => {
                const typeLabel =
                  TYPE_OPTIONS.find((o) => o.key === d.type)?.labelKey;
                return (
                  <div key={d.id} className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, wordBreak: "break-word" }}>
                      {d.title || "—"}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: "var(--muted)" }}>
                      <span style={{ padding: "2px 8px", background: "var(--primary-light, #eff6ff)", borderRadius: 10 }}>
                        {typeLabel ? t[typeLabel] : d.type}
                      </span>
                      <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                      <button className="btn btn-primary" style={{ flex: 1, fontSize: 12 }} onClick={() => openDiagram(d.id)}>
                        {t.visualizer_open_btn}
                      </button>
                      <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => removeDiagram(d.id)}>
                        {t.visualizer_delete_btn}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#fee2e2", borderRadius: 6, fontSize: 12, color: "#b91c1c" }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Theme styles for the rendered Mermaid SVG */}
      <style>{THEME_CSS}</style>
    </div>
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
        animation: "visualizer-spin .7s linear infinite",
      }}
    >
      <style>{`@keyframes visualizer-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
