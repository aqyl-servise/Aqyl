"use client";
import { useEffect, useState } from "react";
import { api, TeacherRating, TeacherViolation } from "../../lib/api";
import { translations, Language } from "../../lib/translations";

interface Props {
  token: string;
  language: Language;
}

const SCORE_ROWS: { key: keyof TeacherRating; label: string; max: number }[] = [
  { key: "scoreExperience", label: "Стаж работы", max: 10 },
  { key: "scoreCategory", label: "Квалификационная категория", max: 15 },
  { key: "scoreAcademic", label: "Успеваемость учеников", max: 25 },
  { key: "scoreFLiteracy", label: "Функциональная грамотность", max: 15 },
  { key: "scoreOpenLessons", label: "Открытые уроки", max: 10 },
  { key: "scoreAchievements", label: "Достижения учеников", max: 10 },
  { key: "scoreActivity", label: "Активность на платформе", max: 10 },
  { key: "scoreViolations", label: "Нарушения", max: 5 },
];

export function MyRatingPanel({ token, language }: Props) {
  const t = translations[language];
  const [rating, setRating] = useState<TeacherRating | null>(null);
  const [violations, setViolations] = useState<TeacherViolation[]>([]);
  const [history, setHistory] = useState<TeacherRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "violations" | "history">("overview");
  const [period, setPeriod] = useState<"year" | "semester" | "quarter">("year");
  const [periodNumber, setPeriodNumber] = useState(0);
  const [academicYear, setAcademicYear] = useState("2025-2026");

  const fetchRating = async () => {
    setLoading(true);
    try {
      const r = await api.ratingGetMy(token, { period, periodNumber, academicYear });
      setRating(r);
      if (r) {
        const [v, h] = await Promise.all([
          r.teacherId ? api.ratingGetViolations(token, r.teacherId) : Promise.resolve([]),
          api.ratingGetMyHistory(token),
        ]);
        setViolations(v);
        setHistory(h);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchRating(); }, [period, periodNumber, academicYear]);

  const tabs = [
    { key: "overview" as const, label: t.rating_overview ?? "Обзор" },
    { key: "violations" as const, label: t.rating_violations ?? "Нарушения" },
    { key: "history" as const, label: t.rating_history ?? "История" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">🏆 {t.nav_my_rating ?? "Мой рейтинг"}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={period} onChange={e => { setPeriod(e.target.value as "year" | "semester" | "quarter"); setPeriodNumber(0); }}
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

      {loading ? (
        <p className="text-gray-400 text-sm">{t.loading ?? "Загрузка..."}</p>
      ) : tab === "overview" && (
        !rating ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🏆</p>
            <p>{t.rating_no_data ?? "Рейтинг ещё не рассчитан"}</p>
            <p className="text-sm mt-1">Администратор должен запустить расчёт рейтинга</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-4xl font-bold text-blue-700">{rating.totalScore}</p>
                <p className="text-xs text-gray-500 mt-1">{t.rating_total_score ?? "Итоговый балл"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-4xl font-bold text-gray-700">{rating.rank}</p>
                <p className="text-xs text-gray-500 mt-1">{t.rating_your_rank ?? "Ваше место"} {t.rating_of ?? "из"} {rating.total}</p>
              </div>
              {rating.manualAdjustment !== 0 && (
                <div className={`rounded-xl p-4 text-center ${(rating.manualAdjustment ?? 0) > 0 ? "bg-green-50" : "bg-red-50"}`}>
                  <p className={`text-4xl font-bold ${(rating.manualAdjustment ?? 0) > 0 ? "text-green-700" : "text-red-700"}`}>
                    {(rating.manualAdjustment ?? 0) > 0 ? "+" : ""}{rating.manualAdjustment}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{t.rating_manual_adj ?? "Корректировка"}</p>
                </div>
              )}
              {rating.pointsToTop10 !== null && rating.pointsToTop10 !== undefined && rating.pointsToTop10 > 0 && (
                <div className="bg-yellow-50 rounded-xl p-4 text-center">
                  <p className="text-4xl font-bold text-yellow-700">{rating.pointsToTop10}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.rating_points_to_top10 ?? "До топ-10"}</p>
                </div>
              )}
            </div>

            <div className="bg-white border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Детализация баллов</h3>
              {SCORE_ROWS.map(({ key, label, max }) => {
                const val = (rating[key] as number) ?? 0;
                const pct = Math.round((val / max) * 100);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium">{val} / {max}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : pct >= 30 ? "bg-yellow-500" : "bg-red-400"}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {rating.manualComment && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <strong>Комментарий администратора:</strong> {rating.manualComment}
              </div>
            )}
          </div>
        )
      )}

      {!loading && tab === "violations" && (
        <div className="space-y-2">
          {violations.length === 0 ? (
            <p className="text-gray-400 text-sm">Нарушений нет ✓</p>
          ) : (
            violations.map(v => (
              <div key={v.id} className="border rounded-lg p-3">
                <div className="flex justify-between">
                  <p className="font-medium text-sm">
                    {v.type === "reprimand" ? (t.rating_reprimand ?? "Выговор") : v.type === "parent_complaint" ? (t.rating_parent_complaint ?? "Жалоба родителей") : (t.rating_other ?? "Другое")}
                  </p>
                  <span className="text-red-600 text-sm font-medium">-{v.pointsDeducted} балл</span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{v.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">{v.date}</p>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && tab === "history" && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm">{t.rating_no_data ?? "История пуста"}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-3">{t.rating_academic_year ?? "Уч. год"}</th>
                  <th className="py-2 pr-3">{t.rating_period ?? "Период"}</th>
                  <th className="py-2 pr-3 font-bold text-blue-700">{t.rating_total_score ?? "Итог"}</th>
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
                    <td className="py-2 pr-3">{h.scoreAcademic}</td>
                    <td className="py-2">{h.scoreActivity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
