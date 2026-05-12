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

const SCORE_BARS: { key: keyof TeacherRating; label: string; max: number }[] = [
  { key: "scoreExperience", label: "Стаж", max: 10 },
  { key: "scoreCategory", label: "Категория", max: 15 },
  { key: "scoreAcademic", label: "Успеваемость", max: 25 },
  { key: "scoreFLiteracy", label: "Функц. грамотность", max: 15 },
  { key: "scoreOpenLessons", label: "Открытые уроки", max: 10 },
  { key: "scoreAchievements", label: "Достижения", max: 10 },
  { key: "scoreActivity", label: "Активность", max: 10 },
  { key: "scoreViolations", label: "Нарушения", max: 5 },
];

export function RatingAdminPanel({ token, language }: Props) {
  const t = translations[language];
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [ratings, setRatings] = useState<TeacherRating[]>([]);
  const [selected, setSelected] = useState<TeacherRating | null>(null);
  const [violations, setViolations] = useState<TeacherViolation[]>([]);
  const [history, setHistory] = useState<TeacherRating[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [period, setPeriod] = useState<Period>("year");
  const [periodNumber, setPeriodNumber] = useState(0);
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [filterSubject, setFilterSubject] = useState("");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [adjValue, setAdjValue] = useState(0);
  const [adjComment, setAdjComment] = useState("");
  const [violation, setViolation] = useState({ type: "reprimand", description: "", date: new Date().toISOString().slice(0, 10), pointsDeducted: 1 });

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const data = await api.ratingGetSchool(token, {
        period,
        periodNumber,
        academicYear,
        subject: filterSubject || undefined,
      });
      setRatings(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchRatings(); }, [period, periodNumber, academicYear, filterSubject]);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      await api.ratingCalculate(token, { period, periodNumber, academicYear });
      await fetchRatings();
    } catch { /* ignore */ }
    setCalculating(false);
  };

  const handleSelectTeacher = async (r: TeacherRating) => {
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
      const v = await api.ratingGetViolations(token, selected.teacherId);
      setViolations(v);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "leaderboard", label: t.rating_leaderboard ?? "Таблица лидеров" },
    { key: "overview", label: t.rating_overview ?? "Обзор" },
    { key: "violations", label: t.rating_violations ?? "Нарушения" },
    { key: "history", label: t.rating_history ?? "История" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">{t.nav_rating ?? "Рейтинг учителей"}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={period} onChange={e => { setPeriod(e.target.value as Period); setPeriodNumber(0); }}
            className="border rounded px-2 py-1 text-sm">
            <option value="year">{t.rating_period_year ?? "Год"}</option>
            <option value="semester">{t.rating_period_semester ?? "Полугодие"}</option>
            <option value="quarter">{t.rating_period_quarter ?? "Четверть"}</option>
          </select>
          {period !== "year" && (
            <select value={periodNumber} onChange={e => setPeriodNumber(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm">
              {period === "semester"
                ? [1, 2].map(n => <option key={n} value={n}>{n}</option>)
                : [1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            className="border rounded px-2 py-1 text-sm">
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
          </select>
          <button onClick={handleCalculate} disabled={calculating}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-60">
            {calculating ? (t.rating_calculating ?? "Идёт расчёт...") : (t.rating_calculate ?? "Рассчитать рейтинг")}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === tb.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "leaderboard" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              placeholder="Фильтр по предмету..."
              className="border rounded px-3 py-1.5 text-sm flex-1 max-w-xs" />
          </div>
          {loading ? (
            <p className="text-gray-500 text-sm">{t.loading ?? "Загрузка..."}</p>
          ) : ratings.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🏆</p>
              <p>{t.rating_no_data ?? "Рейтинг ещё не рассчитан"}</p>
              <p className="text-sm mt-1">Нажмите «Рассчитать рейтинг»</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">{t.nav_teachers ?? "Учитель"}</th>
                    <th className="py-2 pr-3">{t.rating_experience ?? "Стаж"}</th>
                    <th className="py-2 pr-3">{t.rating_category ?? "Категория"}</th>
                    <th className="py-2 pr-3">{t.rating_academic ?? "Успеваемость"}</th>
                    <th className="py-2 pr-3">{t.rating_fl ?? "Функц. гр."}</th>
                    <th className="py-2 pr-3">{t.rating_open_lessons ?? "Отк. уроки"}</th>
                    <th className="py-2 pr-3">{t.rating_achievements ?? "Достижения"}</th>
                    <th className="py-2 pr-3">{t.rating_activity ?? "Активность"}</th>
                    <th className="py-2 pr-3">{t.rating_violations_score ?? "Нарушения"}</th>
                    <th className="py-2 pr-3 font-bold text-blue-700">{t.rating_total_score ?? "Итог"}</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleSelectTeacher(r)}>
                      <td className="py-2 pr-3">
                        <span className={`font-bold ${r.rank === 1 ? "text-yellow-500" : r.rank === 2 ? "text-gray-400" : r.rank === 3 ? "text-amber-600" : "text-gray-700"}`}>
                          {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <p className="font-medium">{r.teacherName}</p>
                        <p className="text-xs text-gray-400">{r.subject}</p>
                      </td>
                      <td className="py-2 pr-3 text-center">{r.scoreExperience}</td>
                      <td className="py-2 pr-3 text-center">{r.scoreCategory}</td>
                      <td className="py-2 pr-3 text-center">{r.scoreAcademic}</td>
                      <td className="py-2 pr-3 text-center">{r.scoreFLiteracy}</td>
                      <td className="py-2 pr-3 text-center">{r.scoreOpenLessons}</td>
                      <td className="py-2 pr-3 text-center">{r.scoreAchievements}</td>
                      <td className="py-2 pr-3 text-center">{r.scoreActivity}</td>
                      <td className="py-2 pr-3 text-center">{r.scoreViolations}</td>
                      <td className="py-2 pr-3 font-bold text-blue-700">{r.totalScore}</td>
                      <td className="py-2">
                        <button onClick={e => { e.stopPropagation(); handleSelectTeacher(r); }}
                          className="text-xs text-blue-600 hover:underline">→</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "overview" && (
        <div className="space-y-4">
          {!selected ? (
            <p className="text-gray-400 text-sm">Выберите учителя в таблице лидеров</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-lg font-bold">{selected.teacherName}</h3>
                  <p className="text-sm text-gray-500">{selected.subject} · {selected.category}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setAdjValue(selected.manualAdjustment ?? 0); setAdjComment(selected.manualComment ?? ""); setShowAdjustModal(true); }}
                    className="text-sm border px-3 py-1.5 rounded hover:bg-gray-50">
                    {t.rating_adjust ?? "Корректировать"}
                  </button>
                  <button onClick={() => setShowViolationModal(true)}
                    className="text-sm bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded hover:bg-red-100">
                    {t.rating_add_violation ?? "Добавить нарушение"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-3xl font-bold text-blue-700">{selected.totalScore}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.rating_total_score ?? "Итоговый балл"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-3xl font-bold text-gray-700">{selected.rank}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.rating_rank ?? "Место"} {t.rating_of ?? "из"} {selected.total}</p>
                </div>
                {selected.manualAdjustment !== 0 && (
                  <div className={`rounded-lg p-3 text-center ${(selected.manualAdjustment ?? 0) > 0 ? "bg-green-50" : "bg-red-50"}`}>
                    <p className={`text-3xl font-bold ${(selected.manualAdjustment ?? 0) > 0 ? "text-green-700" : "text-red-700"}`}>
                      {(selected.manualAdjustment ?? 0) > 0 ? "+" : ""}{selected.manualAdjustment}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{t.rating_manual_adj ?? "Ручная корр."}</p>
                  </div>
                )}
                {selected.pointsToTop10 !== null && selected.pointsToTop10 !== undefined && (
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-3xl font-bold text-yellow-700">{selected.pointsToTop10}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.rating_points_to_top10 ?? "До топ-10"}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {SCORE_BARS.map(({ key, label, max }) => {
                  const val = (selected[key] as number) ?? 0;
                  const pct = Math.round((val / max) * 100);
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-0.5">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium">{val} / {max}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {selected.manualComment && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                  <strong>Комментарий:</strong> {selected.manualComment}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "violations" && (
        <div className="space-y-3">
          {!selected ? (
            <p className="text-gray-400 text-sm">Выберите учителя в таблице лидеров</p>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{selected.teacherName} — {t.rating_violations ?? "Нарушения"}</h3>
                <button onClick={() => setShowViolationModal(true)}
                  className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700">
                  + {t.rating_add_violation ?? "Добавить нарушение"}
                </button>
              </div>
              {violations.length === 0 ? (
                <p className="text-gray-400 text-sm">Нарушений нет</p>
              ) : (
                <div className="space-y-2">
                  {violations.map(v => (
                    <div key={v.id} className="flex items-start justify-between border rounded p-3">
                      <div>
                        <p className="font-medium text-sm">{v.type === "reprimand" ? t.rating_reprimand : v.type === "parent_complaint" ? t.rating_parent_complaint : t.rating_other}</p>
                        <p className="text-sm text-gray-600">{v.description}</p>
                        <p className="text-xs text-gray-400">{v.date} · -{v.pointsDeducted} балл</p>
                      </div>
                      <button onClick={() => handleDeleteViolation(v.id)}
                        className="text-red-500 hover:text-red-700 text-xs ml-3">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {!selected ? (
            <p className="text-gray-400 text-sm">Выберите учителя в таблице лидеров</p>
          ) : (
            <>
              <h3 className="font-semibold">{selected.teacherName} — {t.rating_history ?? "История"}</h3>
              {history.length === 0 ? (
                <p className="text-gray-400 text-sm">История пуста</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-3">{t.rating_academic_year ?? "Уч. год"}</th>
                      <th className="py-2 pr-3">{t.rating_period ?? "Период"}</th>
                      <th className="py-2 pr-3">{t.rating_total_score ?? "Итог"}</th>
                      <th className="py-2 pr-3">Стаж</th>
                      <th className="py-2 pr-3">Категория</th>
                      <th className="py-2 pr-3">Успеваемость</th>
                      <th className="py-2">Активность</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 pr-3">{h.academicYear}</td>
                        <td className="py-2 pr-3">{h.period}{h.periodNumber ? ` (${h.periodNumber})` : ""}</td>
                        <td className="py-2 pr-3 font-bold text-blue-700">{h.totalScore}</td>
                        <td className="py-2 pr-3">{h.scoreExperience}</td>
                        <td className="py-2 pr-3">{h.scoreCategory}</td>
                        <td className="py-2 pr-3">{h.scoreAcademic}</td>
                        <td className="py-2">{h.scoreActivity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}

      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg">{t.rating_adjust ?? "Корректировать балл"}</h3>
            <div>
              <label className="text-sm text-gray-600 block mb-1">{t.rating_manual_adj ?? "Корректировка"}</label>
              <input type="number" step="0.5" value={adjValue} onChange={e => setAdjValue(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">{t.rating_manual_comment ?? "Комментарий"}</label>
              <textarea value={adjComment} onChange={e => setAdjComment(e.target.value)} rows={3}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdjustModal(false)} className="text-sm px-4 py-2 border rounded hover:bg-gray-50">Отмена</button>
              <button onClick={handleAdjust} className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {showViolationModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg">{t.rating_add_violation ?? "Добавить нарушение"}</h3>
            <div>
              <label className="text-sm text-gray-600 block mb-1">{t.rating_violation_type ?? "Тип"}</label>
              <select value={violation.type} onChange={e => setViolation(v => ({ ...v, type: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="reprimand">{t.rating_reprimand ?? "Выговор"}</option>
                <option value="parent_complaint">{t.rating_parent_complaint ?? "Жалоба родителей"}</option>
                <option value="other">{t.rating_other ?? "Другое"}</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">{t.rating_description ?? "Описание"}</label>
              <textarea value={violation.description} onChange={e => setViolation(v => ({ ...v, description: e.target.value }))} rows={3}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">{t.rating_date ?? "Дата"}</label>
                <input type="date" value={violation.date} onChange={e => setViolation(v => ({ ...v, date: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">{t.rating_points_deducted ?? "Вычет баллов"}</label>
                <input type="number" min={0.5} max={5} step={0.5} value={violation.pointsDeducted}
                  onChange={e => setViolation(v => ({ ...v, pointsDeducted: Number(e.target.value) }))}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowViolationModal(false)} className="text-sm px-4 py-2 border rounded hover:bg-gray-50">Отмена</button>
              <button onClick={handleAddViolation} className="text-sm bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
