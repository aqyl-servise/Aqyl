"use client";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Language, translations } from "../../lib/translations";

type Tab = "dashboard" | "analytics" | "reports";

interface DirectionStat { direction: string; avg: number; count: number }
interface ClassroomStat { classroomId: string; classroomName: string; avg: number; reading: number | null; math: number | null; science: number | null }
interface TeacherStat { teacherId: string; teacherName: string; assignmentsCount: number; avgStudentScore: number }
interface Analytics { directionStats: DirectionStat[]; classroomStats: ClassroomStat[]; teacherStats: TeacherStat[] }

export function FLAdminPanel({ token, language, userRole }: { token: string; language: Language; userRole: string }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  useEffect(() => {
    if (userRole === "admin" && !token) return;
    setLoading(true);
    api.flGetSchoolAnalytics(token)
      .then(setAnalytics)
      .catch(() => setAnalytics({ directionStats: [], classroomStats: [], teacherStats: [] }))
      .finally(() => setLoading(false));
  }, [token, userRole]);

  const dirLabel: Record<string, string> = {
    reading: t.fl_reading ?? "Грамотность чтения",
    math: t.fl_math ?? "Математическая грамотность",
    science: t.fl_science ?? "Естественнонаучная грамотность",
  };
  const dirIcon: Record<string, string> = { reading: "📖", math: "🔢", science: "🔬" };

  function exportCsv() {
    if (!analytics) return;
    const BOM = "﻿";
    const headers = ["Класс", "Чтение", "Математика", "Наука", "Средний"];
    const rows = (analytics.classroomStats ?? []).map(c =>
      [c.classroomName, c.reading ?? "—", c.math ?? "—", c.science ?? "—", c.avg].join(",")
    );
    const csv = BOM + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "fl-school-results.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <h1 className="page-title">📚 {t.fl_module ?? "Функциональная грамотность"}</h1>

      <div className="sc-tabs">
        {(["dashboard", "analytics", "reports"] as Tab[]).map(k => {
          const labels: Record<Tab, string> = {
            dashboard: t.fl_dashboard ?? "Дашборд",
            analytics: t.fl_analytics ?? "Аналитика",
            reports: t.fl_reports ?? "Отчёты",
          };
          return (
            <button key={k} className={`sc-tab${tab === k ? " sc-tab-active" : ""}`} onClick={() => setTab(k)}>
              {labels[k]}
            </button>
          );
        })}
      </div>

      {/* ── Dashboard ── */}
      {tab === "dashboard" && (
        <div style={{ marginTop: 0 }}>
          {loading ? (
            <div className="card"><p className="fm-empty">{t.loading}</p></div>
          ) : !analytics || analytics.directionStats.length === 0 ? (
            <div className="card"><p className="fm-empty">{t.fl_no_data ?? "Нет данных для отображения"}</p></div>
          ) : (
            <>
              {/* Direction metric cards */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                {(analytics.directionStats ?? []).map(ds => (
                  <div key={ds.direction} className="card" style={{ flex: "1 1 180px", textAlign: "center", padding: "16px 20px" }}>
                    <div style={{ fontSize: 28 }}>{dirIcon[ds.direction] ?? "📊"}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--primary)", marginTop: 6 }}>{ds.avg}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{dirLabel[ds.direction] ?? ds.direction}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>({ds.count} результатов)</div>
                  </div>
                ))}
              </div>

              {/* Simple bar chart */}
              <div className="card">
                <h3 style={{ marginBottom: 14, fontSize: 15 }}>Средний балл по направлениям</h3>
                <div style={{ display: "flex", gap: 20, alignItems: "flex-end", height: 120 }}>
                  {(analytics.directionStats ?? []).map(ds => (
                    <div key={ds.direction} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{ds.avg}</span>
                      <div style={{ width: "100%", background: "var(--primary)", borderRadius: "4px 4px 0 0", height: `${Math.round((ds.avg / 100) * 80) + 10}px`, minHeight: 10, opacity: 0.85 }} />
                      <span style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>{dirIcon[ds.direction]} {dirLabel[ds.direction]?.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top classes table */}
              {(analytics.classroomStats ?? []).length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom: 12, fontSize: 15 }}>Топ классов по баллу</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Класс</th>
                        <th>📖 Чтение</th>
                        <th>🔢 Математика</th>
                        <th>🔬 Наука</th>
                        <th>Средний</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(analytics.classroomStats ?? [])].sort((a, b) => b.avg - a.avg).slice(0, 10).map((c, idx) => (
                        <tr key={c.classroomId}>
                          <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 500 }}>{c.classroomName}</td>
                          <td>{c.reading ?? "—"}</td>
                          <td>{c.math ?? "—"}</td>
                          <td>{c.science ?? "—"}</td>
                          <td style={{ fontWeight: 600, color: "var(--primary)" }}>{c.avg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Analytics ── */}
      {tab === "analytics" && (
        <div style={{ marginTop: 0 }}>
          {loading ? (
            <div className="card"><p className="fm-empty">{t.loading}</p></div>
          ) : !analytics ? (
            <div className="card"><p className="fm-empty">{t.fl_no_data ?? "Нет данных"}</p></div>
          ) : (
            <>
              {/* Class rankings */}
              <div className="card">
                <h3 style={{ marginBottom: 12, fontSize: 15 }}>{t.fl_class_ranking ?? "Рейтинг классов"}</h3>
                {(analytics.classroomStats ?? []).length === 0 ? (
                  <p className="fm-empty">{t.fl_no_data ?? "Нет данных"}</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Класс</th>
                        <th>{t.fl_reading ?? "Чтение"}</th>
                        <th>{t.fl_math ?? "Математика"}</th>
                        <th>{t.fl_science ?? "Наука"}</th>
                        <th>{t.fl_avg_score ?? "Средний"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(analytics.classroomStats ?? [])].sort((a, b) => b.avg - a.avg).map((c, idx) => (
                        <tr key={c.classroomId}>
                          <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 500 }}>{c.classroomName}</td>
                          <td>{c.reading !== null ? c.reading : "—"}</td>
                          <td>{c.math !== null ? c.math : "—"}</td>
                          <td>{c.science !== null ? c.science : "—"}</td>
                          <td style={{ fontWeight: 600 }}>{c.avg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Teacher rankings */}
              <div className="card">
                <h3 style={{ marginBottom: 12, fontSize: 15 }}>{t.fl_teacher_ranking ?? "Рейтинг учителей"}</h3>
                {(analytics.teacherStats ?? []).length === 0 ? (
                  <p className="fm-empty">{t.fl_no_data ?? "Нет данных"}</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Учитель</th>
                        <th>{t.fl_avg_score ?? "Средний балл"}</th>
                        <th>{t.fl_assignments_count ?? "Кол-во работ"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(analytics.teacherStats ?? [])].sort((a, b) => b.avgStudentScore - a.avgStudentScore).map((tc, idx) => (
                        <tr key={tc.teacherId}>
                          <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 500 }}>{tc.teacherName}</td>
                          <td>{tc.avgStudentScore}</td>
                          <td>{tc.assignmentsCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Reports ── */}
      {tab === "reports" && (
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>Экспорт данных</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={exportCsv}>
              📊 {t.fl_export_excel ?? "Экспорт Excel"}
            </button>
            <button className="btn btn-outline" onClick={() => alert(t.fl_in_development ?? "В разработке")}>
              📄 {t.fl_export_pdf ?? "Экспорт PDF"}
            </button>
          </div>
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
            Excel экспорт содержит результаты всех классов по направлениям.
          </p>
        </div>
      )}
    </div>
  );
}
