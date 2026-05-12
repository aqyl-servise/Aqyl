"use client";
import { useEffect, useState } from "react";
import { api, TeacherRating, TeacherViolation } from "../../lib/api";
import { translations, Language } from "../../lib/translations";

interface Props {
  token: string;
  language: Language;
  userRole: string;
}

type Tab = "leaderboard" | "overview" | "violations" | "history";
type Period = "year" | "semester" | "quarter";

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

function scoreChipClass(score: number) {
  if (score >= 75) return "score-chip score-high";
  if (score >= 50) return "score-chip score-mid";
  return "score-chip score-low";
}

function barColor(pct: number) {
  if (pct >= 80) return "var(--success)";
  if (pct >= 50) return "var(--warn-amber)";
  return "var(--warn)";
}

function violationTypeChip(type: string) {
  if (type === "reprimand")       return { label: "Выговор",          cls: "status-chip status-rejected" };
  if (type === "parent_complaint") return { label: "Жалоба родителей", cls: "status-chip status-pending" };
  return                                  { label: "Другое",           cls: "status-chip status-inactive" };
}

export function RatingAdminPanel({ token, language }: Props) {
  const t = translations[language];

  const [tab, setTab]               = useState<Tab>("leaderboard");
  const [ratings, setRatings]       = useState<TeacherRating[]>([]);
  const [selected, setSelected]     = useState<TeacherRating | null>(null);
  const [violations, setViolations] = useState<TeacherViolation[]>([]);
  const [history, setHistory]       = useState<TeacherRating[]>([]);
  const [loading, setLoading]       = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calcDone, setCalcDone]     = useState(false);

  const [period, setPeriod]         = useState<Period>("year");
  const [periodNumber, setPeriodNumber] = useState(0);
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [filterSubject, setFilterSubject] = useState("");

  const [showAdjustModal, setShowAdjustModal]     = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [adjValue, setAdjValue]     = useState(0);
  const [adjComment, setAdjComment] = useState("");
  const [violation, setViolation]   = useState({
    type: "reprimand", description: "", date: new Date().toISOString().slice(0, 10), pointsDeducted: 1,
  });

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const data = await api.ratingGetSchool(token, {
        period, periodNumber, academicYear,
        subject: filterSubject || undefined,
      });
      setRatings(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchRatings(); }, [period, periodNumber, academicYear, filterSubject]);

  const handleCalculate = async () => {
    setCalculating(true);
    setCalcDone(false);
    try {
      await api.ratingCalculate(token, { period, periodNumber, academicYear });
      await fetchRatings();
      setCalcDone(true);
      setTimeout(() => setCalcDone(false), 3000);
    } catch { /* ignore */ }
    setCalculating(false);
  };

  const openTeacher = async (r: TeacherRating) => {
    setSelected(r);
    setTab("overview");
    if (r.teacherId) {
      const [v, h] = await Promise.all([
        api.ratingGetViolations(token, r.teacherId),
        api.ratingGetHistory(token, r.teacherId),
      ]);
      setViolations(v);
      setHistory(h);
    }
  };

  const handleAdjust = async () => {
    if (!selected?.id) return;
    await api.ratingAdjust(token, selected.id, { manualAdjustment: adjValue, manualComment: adjComment });
    setShowAdjustModal(false);
    await fetchRatings();
    if (selected.teacherId) {
      const updated = await api.ratingGetTeacher(token, selected.teacherId, { period, periodNumber, academicYear });
      if (updated) setSelected(updated);
    }
  };

  const handleAddViolation = async () => {
    if (!selected?.teacherId) return;
    await api.ratingCreateViolation(token, { teacherId: selected.teacherId, ...violation });
    setShowViolationModal(false);
    setViolation({ type: "reprimand", description: "", date: new Date().toISOString().slice(0, 10), pointsDeducted: 1 });
    const v = await api.ratingGetViolations(token, selected.teacherId);
    setViolations(v);
  };

  const handleDeleteViolation = async (id: string) => {
    await api.ratingDeleteViolation(token, id);
    if (selected?.teacherId) {
      setViolations(await api.ratingGetViolations(token, selected.teacherId));
    }
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "leaderboard", label: t.rating_leaderboard ?? "Таблица лидеров", icon: "🏆" },
    { key: "overview",    label: t.rating_overview    ?? "Обзор учителя",   icon: "👤" },
    { key: "violations",  label: t.rating_violations  ?? "Нарушения",       icon: "⚠️" },
    { key: "history",     label: t.rating_history     ?? "История",         icon: "📈" },
  ];

  const subjects = [...new Set(ratings.map(r => r.subject).filter(Boolean) as string[])].sort();

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">🏆 {t.nav_rating ?? "Рейтинг учителей"}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {calcDone && (
            <span className="status-chip status-active" style={{ fontSize: 13 }}>
              ✓ {t.rating_calculated ?? "Рейтинг рассчитан"}
            </span>
          )}
          <button className="btn btn-primary btn-sm" onClick={handleCalculate} disabled={calculating}>
            {calculating ? <><span className="spinner" /> {t.rating_calculating ?? "Идёт расчёт..."}</> : `⚡ ${t.rating_calculate ?? "Рассчитать рейтинг"}`}
          </button>
        </div>
      </div>

      {/* Period filters */}
      <div className="card" style={{ padding: "16px 20px", gap: 0 }}>
        <div className="filter-row">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{t.rating_period ?? "Период"}:</span>
            <div className="role-tabs">
              {(["year", "semester", "quarter"] as Period[]).map(p => (
                <button key={p}
                  className={`role-tab${period === p ? " active" : ""}`}
                  onClick={() => { setPeriod(p); setPeriodNumber(0); }}>
                  {p === "year" ? (t.rating_period_year ?? "Год") : p === "semester" ? (t.rating_period_semester ?? "Полугодие") : (t.rating_period_quarter ?? "Четверть")}
                </button>
              ))}
            </div>
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

          {subjects.length > 0 && (
            <select className="input" style={{ width: "auto", fontSize: 13, padding: "5px 10px" }}
              value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
              <option value="">Все предметы</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {filterSubject && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilterSubject("")}>✕ Сбросить</button>
          )}
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

      {/* ── Leaderboard ── */}
      {tab === "leaderboard" && (
        <div className="card" style={{ gap: 0, padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div className="page-loading">{t.loading ?? "Загрузка..."}</div>
          ) : ratings.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
              <p className="empty-state" style={{ fontSize: 15 }}>
                {t.rating_no_data ?? "Рейтинг ещё не рассчитан"}
              </p>
              <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                Нажмите «Рассчитать рейтинг» чтобы начать
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>{t.fullNameLabel ?? "Учитель"}</th>
                  <th style={{ textAlign: "center" }}>Стаж</th>
                  <th style={{ textAlign: "center" }}>Категория</th>
                  <th style={{ textAlign: "center" }}>Успеваемость</th>
                  <th style={{ textAlign: "center" }}>ФГ</th>
                  <th style={{ textAlign: "center" }}>Уроки</th>
                  <th style={{ textAlign: "center" }}>Достиж.</th>
                  <th style={{ textAlign: "center" }}>Акт.</th>
                  <th style={{ textAlign: "center" }}>Дисц.</th>
                  <th style={{ textAlign: "center" }}>{t.rating_total_score ?? "Итог"}</th>
                  <th style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {ratings.map(r => (
                  <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => openTeacher(r)}>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>
                        {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                      </span>
                    </td>
                    <td>
                      <div className="table-name">{r.teacherName}</div>
                      {r.subject && <div className="muted" style={{ fontSize: 12 }}>{r.subject}</div>}
                    </td>
                    <td style={{ textAlign: "center" }}>{r.scoreExperience}</td>
                    <td style={{ textAlign: "center" }}>{r.scoreCategory}</td>
                    <td style={{ textAlign: "center" }}>{r.scoreAcademic}</td>
                    <td style={{ textAlign: "center" }}>{r.scoreFLiteracy}</td>
                    <td style={{ textAlign: "center" }}>{r.scoreOpenLessons}</td>
                    <td style={{ textAlign: "center" }}>{r.scoreAchievements}</td>
                    <td style={{ textAlign: "center" }}>{r.scoreActivity}</td>
                    <td style={{ textAlign: "center" }}>{r.scoreViolations}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={scoreChipClass(r.totalScore)}>{r.totalScore}</span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px" }}
                        onClick={e => { e.stopPropagation(); openTeacher(r); }}>→</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Overview ── */}
      {tab === "overview" && (
        !selected ? (
          <div className="card">
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👈</div>
              <p className="empty-state">Выберите учителя в таблице лидеров</p>
            </div>
          </div>
        ) : (
          <div className="card">
            {/* Teacher header */}
            <div className="card-header">
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selected.teacherName}</h2>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  {selected.subject ?? "—"} · {selected.category ?? "—"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-outline btn-sm"
                  onClick={() => { setAdjValue(selected.manualAdjustment ?? 0); setAdjComment(selected.manualComment ?? ""); setShowAdjustModal(true); }}>
                  ✏️ {t.rating_adjust ?? "Корректировать"}
                </button>
                <button className="btn btn-sm btn-danger"
                  onClick={() => setShowViolationModal(true)}>
                  ⚠️ {t.rating_add_violation ?? "Нарушение"}
                </button>
              </div>
            </div>

            {/* Stat cards */}
            <div className="stats-row" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 0 }}>
              <div className="stat-card stat-blue">
                <div>
                  <p className="stat-label">{t.rating_total_score ?? "Итоговый балл"}</p>
                  <p className="stat-value" style={{ color: "var(--accent)" }}>{selected.totalScore}</p>
                </div>
              </div>
              <div className="stat-card stat-purple">
                <div>
                  <p className="stat-label">{t.rating_rank ?? "Место"}</p>
                  <p className="stat-value">{selected.rank} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>/ {selected.total}</span></p>
                </div>
              </div>
              {(selected.manualAdjustment ?? 0) !== 0 && (
                <div className={`stat-card ${(selected.manualAdjustment ?? 0) > 0 ? "stat-green" : "stat-orange"}`}>
                  <div>
                    <p className="stat-label">{t.rating_manual_adj ?? "Корректировка"}</p>
                    <p className="stat-value" style={{ color: (selected.manualAdjustment ?? 0) > 0 ? "var(--success)" : "var(--warn)" }}>
                      {(selected.manualAdjustment ?? 0) > 0 ? "+" : ""}{selected.manualAdjustment}
                    </p>
                  </div>
                </div>
              )}
              {selected.pointsToTop10 != null && selected.pointsToTop10 > 0 && (
                <div className="stat-card stat-orange">
                  <div>
                    <p className="stat-label">{t.rating_points_to_top10 ?? "До топ-10"}</p>
                    <p className="stat-value" style={{ color: "var(--warn-amber)" }}>{selected.pointsToTop10}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Criteria breakdown */}
            <div>
              <p className="section-subtitle">Детализация критериев</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SCORE_CRITERIA.map(({ key, labelRu, max }) => {
                  const val = (selected[key] as number) ?? 0;
                  const pct = Math.round((val / max) * 100);
                  return (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: "var(--text)" }}>{labelRu}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{val} <span className="muted" style={{ fontWeight: 400 }}>/ {max}</span></span>
                      </div>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: barColor(pct) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selected.manualComment && (
              <div style={{ background: "var(--warn-amber-light)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: "var(--radius-sm)", padding: "12px 16px", fontSize: 13, color: "var(--text)" }}>
                <strong>Комментарий администратора:</strong> {selected.manualComment}
              </div>
            )}
          </div>
        )
      )}

      {/* ── Violations ── */}
      {tab === "violations" && (
        !selected ? (
          <div className="card">
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👈</div>
              <p className="empty-state">Выберите учителя в таблице лидеров</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card-header">
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                ⚠️ {selected.teacherName} — {t.rating_violations ?? "Нарушения"}
              </h2>
              <button className="btn btn-sm btn-danger" onClick={() => setShowViolationModal(true)}>
                + {t.rating_add_violation ?? "Добавить нарушение"}
              </button>
            </div>

            <div className="card" style={{ gap: 0, padding: 0, overflow: "hidden" }}>
              {violations.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <p className="empty-state">Нарушений нет</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t.rating_violation_type ?? "Тип"}</th>
                      <th>{t.rating_description ?? "Описание"}</th>
                      <th>{t.rating_date ?? "Дата"}</th>
                      <th style={{ textAlign: "center" }}>{t.rating_points_deducted ?? "Вычет"}</th>
                      <th style={{ width: 48 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {violations.map(v => {
                      const chip = violationTypeChip(v.type);
                      return (
                        <tr key={v.id}>
                          <td><span className={chip.cls}>{chip.label}</span></td>
                          <td style={{ maxWidth: 320 }}>{v.description}</td>
                          <td className="muted">{v.date}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className="score-chip score-low">−{v.pointsDeducted}</span>
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm"
                              style={{ color: "var(--warn)" }}
                              onClick={() => handleDeleteViolation(v.id)}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      )}

      {/* ── History ── */}
      {tab === "history" && (
        !selected ? (
          <div className="card">
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👈</div>
              <p className="empty-state">Выберите учителя в таблице лидеров</p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ gap: 0, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 12px" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                📈 {selected.teacherName} — {t.rating_history ?? "История"}
              </h2>
            </div>
            {history.length === 0 ? (
              <div style={{ padding: "16px 24px 32px" }}>
                <p className="empty-state">История пуста</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.rating_academic_year ?? "Уч. год"}</th>
                    <th>{t.rating_period ?? "Период"}</th>
                    <th style={{ textAlign: "center" }}>{t.rating_total_score ?? "Итог"}</th>
                    <th style={{ textAlign: "center" }}>Стаж</th>
                    <th style={{ textAlign: "center" }}>Категория</th>
                    <th style={{ textAlign: "center" }}>Успеваемость</th>
                    <th style={{ textAlign: "center" }}>Активность</th>
                    <th style={{ textAlign: "center" }}>Дисц.</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td className="table-name">{h.academicYear}</td>
                      <td>
                        {h.period === "year" ? "Год" : h.period === "semester" ? `Полугодие ${h.periodNumber}` : `Четверть ${h.periodNumber}`}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={scoreChipClass(h.totalScore)}>{h.totalScore}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>{h.scoreExperience}</td>
                      <td style={{ textAlign: "center" }}>{h.scoreCategory}</td>
                      <td style={{ textAlign: "center" }}>{h.scoreAcademic}</td>
                      <td style={{ textAlign: "center" }}>{h.scoreActivity}</td>
                      <td style={{ textAlign: "center" }}>{h.scoreViolations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      )}

      {/* ── Adjust modal ── */}
      {showAdjustModal && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>✏️ {t.rating_adjust ?? "Корректировать балл"}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdjustModal(false)}>✕</button>
            </div>
            <div className="form-stack">
              <div className="field">
                <label className="field-label">{t.rating_manual_adj ?? "Корректировка (положительная или отрицательная)"}</label>
                <input className="input" type="number" step="0.5" value={adjValue}
                  onChange={e => setAdjValue(Number(e.target.value))} />
              </div>
              <div className="field">
                <label className="field-label">{t.rating_manual_comment ?? "Комментарий"}</label>
                <textarea className="textarea" value={adjComment}
                  onChange={e => setAdjComment(e.target.value)} rows={3} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-outline btn-sm" onClick={() => setShowAdjustModal(false)}>
                  {t.cancel ?? "Отмена"}
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleAdjust}>
                  {t.save ?? "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add violation modal ── */}
      {showViolationModal && (
        <div className="modal-overlay" onClick={() => setShowViolationModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>⚠️ {t.rating_add_violation ?? "Добавить нарушение"}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowViolationModal(false)}>✕</button>
            </div>
            <div className="form-stack">
              <div className="field">
                <label className="field-label">{t.rating_violation_type ?? "Тип нарушения"}</label>
                <select className="input" value={violation.type}
                  onChange={e => setViolation(v => ({ ...v, type: e.target.value }))}>
                  <option value="reprimand">{t.rating_reprimand ?? "Выговор"}</option>
                  <option value="parent_complaint">{t.rating_parent_complaint ?? "Жалоба родителей"}</option>
                  <option value="other">{t.rating_other ?? "Другое"}</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">{t.rating_description ?? "Описание"}</label>
                <textarea className="textarea" value={violation.description}
                  onChange={e => setViolation(v => ({ ...v, description: e.target.value }))} rows={3} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label className="field-label">{t.rating_date ?? "Дата"}</label>
                  <input className="input" type="date" value={violation.date}
                    onChange={e => setViolation(v => ({ ...v, date: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="field-label">{t.rating_points_deducted ?? "Вычет баллов"}</label>
                  <input className="input" type="number" min={0.5} max={5} step={0.5}
                    value={violation.pointsDeducted}
                    onChange={e => setViolation(v => ({ ...v, pointsDeducted: Number(e.target.value) }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-outline btn-sm" onClick={() => setShowViolationModal(false)}>
                  {t.cancel ?? "Отмена"}
                </button>
                <button className="btn btn-sm btn-danger" onClick={handleAddViolation}>
                  ⚠️ {t.rating_add_violation ?? "Добавить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
