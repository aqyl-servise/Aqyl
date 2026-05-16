"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";

type Summary = { totalCount: number; totalCostKzt: number; activeTeachers: number; period: string };
type TeacherRow = { userId: string; teacherName: string; subject: string; todayCount: number; weekCount: number; monthCount: number; costKzt: number };
type ChartPoint = { date: string; totalCount: number; totalCostKzt: number };
type MostActive = { teacherName: string; count: number } | null;
type CacheStats = { totalEntries: number; hitRate: number; tokensSaved: number; mostUsed: Array<{ subject: string; classNumber: number; topic: string; useCount: number }> } | null;

export function AiUsagePanelAdmin({ token, language, role }: { token: string; language: Language; role?: string }) {
  const t = translations[language];
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [mostActive, setMostActive] = useState<MostActive>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats>(null);
  const [clearing, setClearing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getAiUsageSummary(token, period).then(setSummary).catch(() => {}),
      api.getAiUsageByTeacher(token).then(setTeachers).catch(() => {}),
      api.getAiUsageChart(token, 30).then(setChart).catch(() => {}),
      api.getAiMostActive(token).then(setMostActive).catch(() => {}),
      api.getKmzhCacheStats(token).then(setCacheStats).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [token, period]);

  async function handleClearCache() {
    if (!window.confirm(t.kmzh_clear_confirm)) return;
    setClearing(true);
    try {
      await api.clearKmzhCache(token, {});
      const fresh = await api.getKmzhCacheStats(token);
      setCacheStats(fresh);
    } catch {
      // ignore
    } finally {
      setClearing(false);
    }
  }

  const maxCount = chart.length > 0 ? Math.max(...chart.map((p) => p.totalCount), 1) : 1;

  return (
    <div style={{ padding: "24px", maxWidth: 1100 }}>
      <h2 style={{ margin: "0 0 20px", fontSize: 22 }}>🤖 {t.nav_ai_usage}</h2>

      {/* Period selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["today", "week", "month"] as const).map((p) => (
          <button
            key={p}
            className={`btn btn-sm ${period === p ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setPeriod(p)}
          >
            {p === "today" ? t.ai_period_today : p === "week" ? t.ai_period_week : t.ai_period_month}
          </button>
        ))}
      </div>

      {/* Top summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        <SummaryCard
          icon="📊"
          label={t.ai_requests_today}
          value={loading ? "..." : String(summary?.totalCount ?? 0)}
        />
        <SummaryCard
          icon="💰"
          label={t.ai_cost_month}
          value={loading ? "..." : `${(summary?.totalCostKzt ?? 0).toFixed(2)} ₸`}
        />
        <SummaryCard
          icon="👤"
          label={t.ai_most_active}
          value={loading ? "..." : (mostActive ? `${mostActive.teacherName} (${mostActive.count})` : "—")}
        />
      </div>

      {/* Teacher table */}
      <div style={{ background: "var(--bg-card, #fff)", borderRadius: 10, padding: 20, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 16 }}>📋 {t.nav_teachers}</h3>
        {loading ? (
          <p style={{ color: "var(--text-secondary, #888)" }}>{t.loading}</p>
        ) : teachers.length === 0 ? (
          <p style={{ color: "var(--text-secondary, #888)" }}>{t.ai_no_data}</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border, #eee)" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>{t.ai_teacher_col}</th>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>{t.ai_subject_col}</th>
                  <th style={{ textAlign: "right", padding: "8px 12px" }}>{t.ai_today_col}</th>
                  <th style={{ textAlign: "right", padding: "8px 12px" }}>{t.ai_week_col}</th>
                  <th style={{ textAlign: "right", padding: "8px 12px" }}>{t.ai_month_col}</th>
                  <th style={{ textAlign: "right", padding: "8px 12px" }}>{t.ai_cost_col}</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((row) => (
                  <tr key={row.userId} style={{ borderBottom: "1px solid var(--border, #eee)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{row.teacherName}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-secondary, #666)" }}>{row.subject}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <UsageBadge count={row.todayCount} limit={20} />
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{row.weekCount}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{row.monthCount}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{row.costKzt.toFixed(2)} ₸</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 30-day chart */}
      <div style={{ background: "var(--bg-card, #fff)", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>📈 {t.ai_chart_title}</h3>
        {chart.length === 0 ? (
          <p style={{ color: "var(--text-secondary, #888)" }}>{t.ai_no_data}</p>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120, overflowX: "auto", padding: "0 4px" }}>
            {chart.map((pt) => {
              const heightPct = maxCount > 0 ? (pt.totalCount / maxCount) * 100 : 0;
              const dayLabel = pt.date.slice(5); // MM-DD
              return (
                <div key={pt.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 20, flex: "1 0 20px" }} title={`${pt.date}: ${pt.totalCount} запросов`}>
                  <div style={{
                    width: "100%", background: "#7F77DD", borderRadius: "3px 3px 0 0",
                    height: `${Math.max(heightPct, pt.totalCount > 0 ? 4 : 0)}%`,
                    transition: "height 0.3s",
                  }} />
                  {chart.length <= 15 && (
                    <span style={{ fontSize: 9, color: "var(--text-secondary, #999)", marginTop: 2 }}>{dayLabel}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KMZh cache stats */}
      <div style={{ background: "var(--bg-card, #fff)", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>⚡ {t.kmzh_cache_stats}</h3>
          {role === "admin" && (
            <button
              className="btn btn-outline btn-sm"
              onClick={handleClearCache}
              disabled={clearing}
              style={{ color: "#d32f2f", borderColor: "#d32f2f" }}
            >
              🗑 {t.kmzh_clear_cache}
            </button>
          )}
        </div>
        {loading || !cacheStats ? (
          <p style={{ color: "var(--text-secondary, #888)" }}>{t.loading ?? "..."}</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              <div style={{ textAlign: "center", padding: "12px 8px", background: "var(--bg, #f9f9f9)", borderRadius: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{cacheStats.totalEntries}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary, #888)", marginTop: 4 }}>{t.kmzh_cache_entries}</div>
              </div>
              <div style={{ textAlign: "center", padding: "12px 8px", background: "var(--bg, #f9f9f9)", borderRadius: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: cacheStats.hitRate >= 50 ? "#2e7d32" : "#888" }}>
                  {cacheStats.hitRate}%
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary, #888)", marginTop: 4 }}>{t.kmzh_hit_rate}</div>
              </div>
              <div style={{ textAlign: "center", padding: "12px 8px", background: "var(--bg, #f9f9f9)", borderRadius: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>~{(cacheStats.tokensSaved / 1000).toFixed(0)}K</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary, #888)", marginTop: 4 }}>{t.kmzh_tokens_saved}</div>
              </div>
            </div>
            {cacheStats.mostUsed.length > 0 && (
              <div style={{ fontSize: 13 }}>
                {cacheStats.mostUsed.map((entry, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border, #eee)" }}>
                    <span style={{ color: "var(--text-secondary, #666)" }}>
                      {entry.subject} · {entry.classNumber} кл. · {entry.topic.slice(0, 40)}{entry.topic.length > 40 ? "…" : ""}
                    </span>
                    <span style={{ fontWeight: 600, marginLeft: 8 }}>×{entry.useCount}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      background: "var(--bg-card, #fff)", borderRadius: 10, padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary, #888)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function UsageBadge({ count, limit }: { count: number; limit: number }) {
  const pct = (count / limit) * 100;
  const color = pct >= 100 ? "#f44336" : pct >= 80 ? "#ff9800" : pct >= 60 ? "#ffc107" : "#4caf50";
  return (
    <span style={{ color, fontWeight: 600 }}>{count}/{limit}</span>
  );
}
