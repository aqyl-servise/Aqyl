"use client";
import { useEffect, useState } from "react";
import { api, TeacherRating, TeacherViolation } from "../../lib/api";
import { translations, Language } from "../../lib/translations";

interface Props {
  token: string;
  language: Language;
}

const SCORE_CRITERIA: { key: keyof TeacherRating; labelRu: string; max: number }[] = [
  { key: "scoreExperience",   labelRu: "Стаж работы",                max: 10 },
  { key: "scoreCategory",     labelRu: "Квалификационная категория", max: 15 },
  { key: "scoreAcademic",     labelRu: "Успеваемость учеников",      max: 25 },
  { key: "scoreFLiteracy",    labelRu: "Функциональная грамотность", max: 15 },
  { key: "scoreOpenLessons",  labelRu: "Открытые уроки",             max: 10 },
  { key: "scoreAchievements", labelRu: "Достижения учеников",        max: 10 },
  { key: "scoreActivity",     labelRu: "Активность на платформе",    max: 10 },
  { key: "scoreViolations",   labelRu: "Дисциплина",                 max:  5 },
];

function barColor(pct: number) {
  if (pct >= 80) return "var(--success)";
  if (pct >= 50) return "var(--warn-amber)";
  return "var(--warn)";
}

function scoreAccentColor(score: number) {
  if (score >= 75) return "var(--success)";
  if (score >= 50) return "var(--warn-amber)";
  return "var(--warn)";
}

function violationLabel(type: string) {
  if (type === "reprimand")        return { label: "Выговор",          cls: "status-chip status-rejected" };
  if (type === "parent_complaint") return { label: "Жалоба родителей", cls: "status-chip status-pending" };
  return                                   { label: "Другое",           cls: "status-chip status-inactive" };
}

export function MyRatingPanel({ token, language }: Props) {
  const t = translations[language];

  const [rating, setRating]         = useState<TeacherRating | null>(null);
  const [violations, setViolations] = useState<TeacherViolation[]>([]);
  const [history, setHistory]       = useState<TeacherRating[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<"overview" | "violations" | "history">("overview");

  const [period, setPeriod]             = useState<"year" | "semester" | "quarter">("year");
  const [periodNumber, setPeriodNumber] = useState(0);
  const [academicYear, setAcademicYear] = useState("2025-2026");

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const r = await api.ratingGetMy(token, { period, periodNumber, academicYear });
        if (!active) return;
        setRating(r);
        if (r) {
          const [v, h] = await Promise.all([
            r.teacherId ? api.ratingGetViolations(token, r.teacherId) : Promise.resolve([]),
            api.ratingGetMyHistory(token),
          ]);
          if (!active) return;
          setViolations(v);
          setHistory(h);
        }
      } catch { /* ignore */ }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [period, periodNumber, academicYear]);

  const TABS = [
    { key: "overview"   as const, label: t.rating_overview   ?? "Обзор",       icon: "📊" },
    { key: "violations" as const, label: t.rating_violations ?? "Нарушения",   icon: "⚠️" },
    { key: "history"    as const, label: t.rating_history    ?? "История",     icon: "📈" },
  ];

  const scoreColor = rating ? scoreAccentColor(rating.totalScore) : "var(--accent)";

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">🏆 {t.nav_my_rating ?? "Мой рейтинг"}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div className="role-tabs">
            {(["year", "semester", "quarter"] as const).map(p => (
              <button key={p}
                className={`role-tab${period === p ? " active" : ""}`}
                onClick={() => { setPeriod(p); setPeriodNumber(0); }}>
                {p === "year" ? (t.rating_period_year ?? "Год") : p === "semester" ? (t.rating_period_semester ?? "Полугодие") : (t.rating_period_quarter ?? "Четверть")}
              </button>
            ))}
          </div>
          {period !== "year" && (
            <select className="input" style={{ width: "auto", fontSize: 13, padding: "5px 10px" }}
              value={periodNumber} onChange={e => setPeriodNumber(Number(e.target.value))}>
              {(period === "semester" ? [1, 2] : [1, 2, 3, 4]).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          )}
          <select className="input" style={{ width: "auto", fontSize: 13, padding: "5px 10px" }}
            value={academicYear} onChange={e => setAcademicYear(e.target.value)}>
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="sc-tabs">
        {TABS.map(tb => (
          <button key={tb.key}
            className={`sc-tab${tab === tb.key ? " sc-tab-active" : ""}`}
            onClick={() => setTab(tb.key)}>
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading">{t.loading ?? "Загрузка..."}</div>
      ) : (
        <>
          {/* ── Overview ── */}
          {tab === "overview" && (
            !rating ? (
              <div className="card">
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🏆</div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 8px" }}>
                    {t.rating_no_data ?? "Рейтинг ещё не рассчитан"}
                  </p>
                  <p className="muted" style={{ fontSize: 13 }}>
                    Обратитесь к администратору для запуска расчёта
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Hero score card */}
                <div className="card" style={{ textAlign: "center", background: "linear-gradient(135deg, #2E2780 0%, #231f62 100%)", border: "none", color: "#fff" }}>
                  <div style={{ padding: "8px 0 0" }}>
                    <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1 }}>
                      {rating.totalScore}
                    </div>
                    <div style={{ fontSize: 14, marginTop: 6, opacity: 0.75 }}>
                      {t.rating_total_score ?? "Итоговый балл"} · {rating.academicYear}
                    </div>
                    <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{rating.rank}</div>
                        <div style={{ fontSize: 12, opacity: 0.65 }}>{t.rating_your_rank ?? "Ваше место"} {t.rating_of ?? "из"} {rating.total}</div>
                      </div>
                      {rating.pointsToTop10 != null && rating.pointsToTop10 > 0 && (
                        <div style={{ opacity: 0.9 }}>
                          <div style={{ fontSize: 28, fontWeight: 700 }}>+{rating.pointsToTop10}</div>
                          <div style={{ fontSize: 12, opacity: 0.65 }}>{t.rating_points_to_top10 ?? "до топ-10"}</div>
                        </div>
                      )}
                      {(rating.manualAdjustment ?? 0) !== 0 && (
                        <div style={{ opacity: 0.9 }}>
                          <div style={{ fontSize: 28, fontWeight: 700 }}>
                            {(rating.manualAdjustment ?? 0) > 0 ? "+" : ""}{rating.manualAdjustment}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.65 }}>{t.rating_manual_adj ?? "Корректировка"}</div>
                        </div>
                      )}
                    </div>
                    {rating.rank === 1 && (
                      <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9, fontWeight: 500 }}>🥇 Лучший учитель школы!</div>
                    )}
                    {rating.rank != null && rating.rank <= 3 && rating.rank > 1 && (
                      <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9, fontWeight: 500 }}>
                        {rating.rank === 2 ? "🥈" : "🥉"} Вы в тройке лидеров!
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual comment */}
                {rating.manualComment && (
                  <div style={{ background: "var(--warn-amber-light)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: "var(--radius-sm)", padding: "12px 16px", fontSize: 13 }}>
                    <strong>Комментарий администратора:</strong> {rating.manualComment}
                  </div>
                )}

                {/* Criteria breakdown */}
                <div className="card">
                  <p className="section-subtitle">Детализация баллов по критериям</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {SCORE_CRITERIA.map(({ key, labelRu, max }) => {
                      const val = (rating[key] as number) ?? 0;
                      const pct = Math.round((val / max) * 100);
                      return (
                        <div key={key}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 13.5, color: "var(--text)" }}>{labelRu}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 13, color: "var(--muted)" }}>из {max}</span>
                              <span style={{ fontSize: 15, fontWeight: 700, color: barColor(pct), minWidth: 32, textAlign: "right" }}>{val}</span>
                            </div>
                          </div>
                          <div className="progress-bar-wrap" style={{ height: 10 }}>
                            <div className="progress-bar-fill" style={{ width: `${pct}%`, background: barColor(pct) }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Итоговый балл</span>
                    <span style={{ fontWeight: 700, fontSize: 20, color: scoreColor }}>{rating.totalScore}</span>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ── Violations ── */}
          {tab === "violations" && (
            <div className="card" style={{ gap: 0, padding: 0, overflow: "hidden" }}>
              {violations.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <p style={{ fontWeight: 600, color: "var(--success)", margin: "0 0 6px" }}>Нарушений нет</p>
                  <p className="empty-state">Продолжайте в том же духе!</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t.rating_violation_type ?? "Тип"}</th>
                      <th>{t.rating_description ?? "Описание"}</th>
                      <th>{t.rating_date ?? "Дата"}</th>
                      <th style={{ textAlign: "center" }}>{t.rating_points_deducted ?? "Вычет"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {violations.map(v => {
                      const chip = violationLabel(v.type);
                      return (
                        <tr key={v.id}>
                          <td><span className={chip.cls}>{chip.label}</span></td>
                          <td style={{ maxWidth: 320 }}>{v.description}</td>
                          <td className="muted">{v.date}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className="score-chip score-low">−{v.pointsDeducted}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── History ── */}
          {tab === "history" && (
            <div className="card" style={{ gap: 0, padding: 0, overflow: "hidden" }}>
              {history.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center" }}>
                  <p className="empty-state">История пуста</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t.rating_academic_year ?? "Уч. год"}</th>
                      <th>{t.rating_period ?? "Период"}</th>
                      <th style={{ textAlign: "center" }}>{t.rating_total_score ?? "Итог"}</th>
                      <th style={{ textAlign: "center" }}>Успеваемость</th>
                      <th style={{ textAlign: "center" }}>Активность</th>
                      <th style={{ textAlign: "center" }}>Дисциплина</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => {
                      const periodLabel = h.period === "year" ? "Год" : h.period === "semester" ? `Полугодие ${h.periodNumber}` : `Четверть ${h.periodNumber}`;
                      return (
                        <tr key={h.id}>
                          <td className="table-name">{h.academicYear}</td>
                          <td>{periodLabel}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`score-chip ${h.totalScore >= 75 ? "score-high" : h.totalScore >= 50 ? "score-mid" : "score-low"}`}>
                              {h.totalScore}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>{h.scoreAcademic}</td>
                          <td style={{ textAlign: "center" }}>{h.scoreActivity}</td>
                          <td style={{ textAlign: "center" }}>{h.scoreViolations}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
