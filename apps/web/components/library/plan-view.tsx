import type { ExamplePlan } from "../../lib/library";
import { labels } from "../../lib/library";

/**
 * План урока в виде таблицы КСП/ҚМЖ — без хуков и без интерактива, поэтому
 * одинаково рендерится на публичной странице (сервер) и в предпросмотре
 * админки (клиент). Цвета — токены витрины с запасными значениями: в
 * админке переменных --pub-* нет.
 */
export function PlanView({ plan, lang, subject, grade, topic }: {
  plan: ExamplePlan; lang: "ru" | "kz"; subject: string; grade: number; topic: string;
}) {
  const L = labels(lang);
  const total = plan.stages.reduce((a, s) => a + (s.points ?? 0), 0);
  const header: [string, string][] = [
    [L.subject, subject],
    [L.gradeLabel, String(grade)],
    [L.topic, topic],
    ...(plan.durationMinutes ? [[L.duration, `${plan.durationMinutes} ${L.minutes}`] as [string, string]] : []),
  ];

  return (
    <div>
      <div style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "10px 24px" }}>
          {header.map(([k, v]) => (
            <div key={k} style={{ fontSize: "0.9rem" }}>
              <span style={{ color: muted }}>{k}: </span>
              <span style={{ color: text, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
        {plan.curriculum.length > 0 && (
          <Block title={L.curriculum}>
            <ul style={ul}>{plan.curriculum.map((c) => <li key={c.code}><b>{c.code}</b> — {c.text}</li>)}</ul>
          </Block>
        )}
        {plan.lessonObjectives.length > 0 && (
          <Block title={L.goals}>
            <ol style={ul}>{plan.lessonObjectives.map((g, i) => <li key={i}>{g}</li>)}</ol>
          </Block>
        )}
        {plan.valueLink && (
          <Block title={L.value}><p style={p}>{plan.valueLink}</p></Block>
        )}
      </div>

      <div style={{ ...card, overflowX: "auto" }}>
        <h2 style={{ fontSize: "1.15rem", margin: "0 0 14px", color: text }}>{L.course}</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              <th style={th}>{L.stage}</th>
              <th style={th}>{L.teacher}</th>
              <th style={th}>{L.student}</th>
              <th style={th}>{L.criteria}</th>
              <th style={th}>{L.resources}</th>
            </tr>
          </thead>
          <tbody>
            {plan.stages.map((s, i) => (
              <tr key={i}>
                <td style={{ ...td, minWidth: 110 }}>
                  <strong style={{ color: text }}>{s.stageName}</strong><br />{s.timeMinutes} {L.minutes}
                </td>
                <td style={td}><Multiline text={s.teacherActions} /></td>
                <td style={td}>
                  <Multiline text={s.studentActions} />
                  {s.descriptors.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 600, color: text }}>{L.descriptors}:</div>
                      <ol style={{ ...ul, marginTop: 4 }}>
                        {s.descriptors.map((d, j) => <li key={j}>{d.text} — {d.points} {L.points}</li>)}
                      </ol>
                    </div>
                  )}
                </td>
                <td style={td}>
                  <Multiline text={s.assessmentCriteria} />
                  {s.method && <div style={{ marginTop: 6, color: muted }}>{L.method}: {s.method}</div>}
                  {s.points != null && <div style={{ marginTop: 6, fontWeight: 600, color: text }}>{s.points} {L.points}</div>}
                </td>
                <td style={td}><Multiline text={s.resources} /></td>
              </tr>
            ))}
            {total > 0 && (
              <tr>
                <td style={{ ...td, fontWeight: 600, color: text }} colSpan={3}>{L.total}</td>
                <td style={{ ...td, fontWeight: 700, color: "var(--pub-purple, #6f61d6)" }} colSpan={2}>{total} {L.points}</td>
              </tr>
            )}
          </tbody>
        </table>
        {plan.homework && (
          <Block title={L.homework}><p style={p}>{plan.homework}</p></Block>
        )}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 600, color: text, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

/** Переносы строк из генерации — абзацами, без dangerouslySetInnerHTML. */
function Multiline({ text: t }: { text: string }) {
  const parts = (t ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
  return <>{parts.map((x, i) => <p key={i} style={{ ...p, margin: i ? "6px 0 0" : 0 }}>{x}</p>)}</>;
}

const text = "var(--pub-text, #1e293b)";
const muted = "var(--pub-text-3, #64748b)";
const card: React.CSSProperties = {
  background: "var(--pub-bg-surface, #fff)", border: "1px solid var(--pub-border, #e5e7eb)",
  borderRadius: 14, padding: 20, marginBottom: 20,
};
const ul: React.CSSProperties = { margin: 0, paddingLeft: 20, fontSize: "0.9rem", color: "var(--pub-text-2, #334155)", lineHeight: 1.6 };
const p: React.CSSProperties = { margin: 0, fontSize: "0.9rem", color: "var(--pub-text-2, #334155)", lineHeight: 1.6 };
const th: React.CSSProperties = {
  textAlign: "left", padding: "10px 12px", fontSize: "0.8125rem", fontWeight: 600,
  color: muted, borderBottom: "1px solid var(--pub-border, #e5e7eb)", verticalAlign: "bottom",
};
const td: React.CSSProperties = {
  padding: 12, fontSize: "0.875rem", color: "var(--pub-text-2, #334155)",
  borderBottom: "1px solid var(--pub-border, #e5e7eb)", verticalAlign: "top", lineHeight: 1.55,
};
