"use client";
import { useEffect, useState } from "react";
import { api, ScheduleRow } from "../../lib/api";

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function getCurrentDayOfWeek() {
  const d = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return d === 0 ? null : d; // null on Sunday (no school)
}

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function timeToMinutes(t?: string) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function findNextLesson(rows: ScheduleRow[], todayDow: number | null): string | null {
  if (!todayDow) return null;
  const now = getCurrentMinutes();
  const todays = rows
    .filter((r) => r.dayOfWeek === todayDow)
    .sort((a, b) => a.period - b.period);

  for (const r of todays) {
    const start = timeToMinutes(r.startTime);
    if (start !== null && start > now) return r.id;
  }
  return null;
}

export function StudentSchedulePanel({ token, t }: { token: string; t: Record<string, string> }) {
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStudentSchedule(token)
      .then(setSchedule)
      .catch(() => setError(t.student_no_profile))
      .finally(() => setLoading(false));
  }, [token]);

  const todayDow = getCurrentDayOfWeek();
  const nextLessonId = findNextLesson(schedule, todayDow);

  const periods = [...new Set(schedule.map((r) => r.period))].sort((a, b) => a - b);
  const days = [1, 2, 3, 4, 5, 6].filter((d) =>
    schedule.some((r) => r.dayOfWeek === d)
  );

  const cell = (day: number, period: number) =>
    schedule.find((r) => r.dayOfWeek === day && r.period === period);

  if (loading) return <p className="muted">{t.loading}</p>;
  if (error) return <div className="alert alert-error"><span>⚠</span> {error}</div>;
  if (schedule.length === 0) return <p className="empty-state">{t.no_schedule}</p>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📅 {t.nav_student_schedule}</h1>
        {todayDow && (
          <span className="role-chip role-teacher">
            {t.today_schedule}: {t[DAY_KEYS[todayDow - 1]]}
          </span>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>{t.period}</th>
              {days.map((d) => (
                <th
                  key={d}
                  style={{
                    background: d === todayDow ? "var(--primary)" : undefined,
                    color: d === todayDow ? "#fff" : undefined,
                    fontWeight: d === todayDow ? 700 : undefined,
                  }}
                >
                  {t[DAY_KEYS[d - 1]]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p}>
                <td className="muted" style={{ textAlign: "center", fontWeight: 600 }}>{p}</td>
                {days.map((d) => {
                  const lesson = cell(d, p);
                  const isNext = lesson?.id === nextLessonId;
                  return (
                    <td
                      key={d}
                      style={{
                        background: isNext ? "var(--primary-light, #e8f4fd)" : undefined,
                        border: isNext ? "2px solid var(--primary)" : undefined,
                      }}
                    >
                      {lesson ? (
                        <div>
                          <strong style={{ display: "block", fontSize: 13 }}>{lesson.subject}</strong>
                          {lesson.teacher && (
                            <span className="muted" style={{ fontSize: 11 }}>{lesson.teacher.fullName}</span>
                          )}
                          {(lesson.startTime || lesson.endTime) && (
                            <span className="muted" style={{ fontSize: 11, display: "block" }}>
                              {lesson.startTime}{lesson.endTime ? `–${lesson.endTime}` : ""}
                            </span>
                          )}
                          {lesson.room && (
                            <span className="muted" style={{ fontSize: 11 }}>
                              {t.room}: {lesson.room}
                            </span>
                          )}
                          {isNext && (
                            <span style={{ fontSize: 10, color: "var(--primary)", fontWeight: 700 }}>
                              ▶ {t.next_lesson}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
