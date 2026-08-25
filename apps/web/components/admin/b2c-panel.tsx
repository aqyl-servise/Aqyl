"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type B2cFunnel, type B2cUser, type PendingPayment } from "../../lib/api";
import { Icon } from "../ui/icon";

/**
 * Воронка B2C в админ-панели.
 *
 * Школьные панели показывают классы, учеников и аттестацию — у B2C-учителя
 * ничего этого нет, он приходит сам и платит за себя. Здесь то, что для этой
 * воронки и есть предмет управления: подписка, пробный период, сколько уроков
 * сгенерировано, сколько заплачено.
 */
export function B2cPanel({ token }: { token: string }) {
  const [data, setData] = useState<B2cFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPayment[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    // Заявки на оплату грузим вместе с воронкой: у Kaspi нет API-интеграции
    // при нашем обороте, поэтому поступление подтверждает администратор.
    api.pendingPayments(token).then(setPending).catch(() => setPending([]));
    api.getB2cFunnel(token)
      .then((d) => { setData(d); setError(null); })
      .catch(() => setError("Не удалось загрузить воронку B2C"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(load, [load]);

  async function grant(u: B2cUser) {
    const months = Number(window.prompt(`Выдать подписку «${u.email}». На сколько месяцев?`, "1"));
    if (!Number.isFinite(months) || months <= 0) return;
    setBusyId(u.id);
    try { await api.grantSubscription(token, u.id, months); load(); }
    catch { setError("Не удалось выдать подписку"); }
    finally { setBusyId(null); }
  }

  async function revoke(u: B2cUser) {
    if (!window.confirm(`Снять подписку у «${u.email}»?`)) return;
    setBusyId(u.id);
    try { await api.revokeSubscription(token, u.id); load(); }
    catch { setError("Не удалось снять подписку"); }
    finally { setBusyId(null); }
  }

  // Пакеты уроков (ТЗ №3): начисление продлевает весь баланс на 3 месяца.
  async function grantLessonsTo(u: B2cUser) {
    const lessons = Number(window.prompt(`Начислить уроки «${u.email}». Сколько?`, "10"));
    if (!Number.isInteger(lessons) || lessons <= 0) return;
    setBusyId(u.id);
    try { await api.grantLessons(token, u.id, lessons); load(); }
    catch { setError("Не удалось начислить уроки"); }
    finally { setBusyId(null); }
  }

  async function confirmPay(p: PendingPayment) {
    if (!window.confirm(`Подтвердить оплату ${p.amount.toLocaleString("ru-RU")} ₸ от «${p.email ?? p.teacherId}»?
Будет начислено уроков: ${p.lessons}`)) return;
    setBusyId(p.id);
    try { await api.confirmPayment(token, p.id); load(); }
    catch { setError("Не удалось подтвердить оплату"); }
    finally { setBusyId(null); }
  }

  async function rejectPay(p: PendingPayment) {
    if (!window.confirm(`Отклонить заявку ${p.orderId}? Уроки начислены не будут.`)) return;
    setBusyId(p.id);
    try { await api.rejectPayment(token, p.id); load(); }
    catch { setError("Не удалось отклонить заявку"); }
    finally { setBusyId(null); }
  }

  if (loading) return <div style={{ padding: 24 }}><span className="spinner" /></div>;

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}><Icon name="users" size={16} /> Воронка B2C</h2>
        <button onClick={load} style={ghostBtn}>↻ Обновить</button>
      </div>

      {error && <div style={{ color: "#dc2626", marginBottom: 14 }}>{error}</div>}

      {/* Заявки на оплату: сверьте поступление в Kaspi и подтвердите. */}
      {pending.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12, padding: 16, marginBottom: 22 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Ожидают подтверждения оплаты — {pending.length}</h3>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#78350f" }}>
            Найдите поступление в Kaspi по номеру заказа и подтвердите — уроки начислятся автоматически.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 680 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#78350f" }}>
                  <th style={{ padding: "6px 10px" }}>Учитель</th>
                  <th style={{ padding: "6px 10px" }}>Номер заказа</th>
                  <th style={{ padding: "6px 10px", textAlign: "right" }}>Сумма</th>
                  <th style={{ padding: "6px 10px", textAlign: "right" }}>Уроков</th>
                  <th style={{ padding: "6px 10px" }}>Создана</th>
                  <th style={{ padding: "6px 10px" }} />
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid #fde68a" }}>
                    <td style={{ padding: "8px 10px" }}>{p.email ?? p.teacherId}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 12.5 }}>{p.orderId}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{p.amount.toLocaleString("ru-RU")} ₸</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{p.lessons}</td>
                    <td style={{ padding: "8px 10px", color: "#6b7280" }}>{new Date(p.createdAt).toLocaleString("ru-RU")}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                      <button onClick={() => confirmPay(p)} disabled={busyId === p.id}
                        style={{ ...ghostBtn, borderColor: "#16a34a", color: "#16a34a", marginRight: 8 }}>
                        Оплачено
                      </button>
                      <button onClick={() => rejectPay(p)} disabled={busyId === p.id}
                        style={{ ...ghostBtn, borderColor: "#9ca3af", color: "#6b7280" }}>
                        Отклонить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          <Card label="Учителей" value={String(data.summary.users)} />
          <Card label="С подпиской" value={String(data.summary.active)} accent="#16a34a" />
          <Card label="В пробном" value={String(data.summary.trial)} accent="#d97706" />
          <Card label="Истекло" value={String(data.summary.expired)} accent="#6b7280" />
          <Card label="MRR" value={`${data.summary.mrrKzt.toLocaleString("ru-RU")} ₸`} />
          <Card label="Оплачено всего" value={`${data.summary.paidTotalKzt.toLocaleString("ru-RU")} ₸`}
            hint={`${data.summary.payments} платежей`} />
        </div>
      )}

      {data && data.summary.users > 0 && data.summary.payments === 0 && (
        <div style={{
          background: "rgba(217,119,6,.08)", border: "1px solid rgba(217,119,6,.3)",
          borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13,
        }}>
          ⚠ Платежей через систему ещё не проходило. Активные подписки выданы вручную —
          связку оплаты стоит проверить до первого платящего.
        </div>
      )}

      <div style={{ overflowX: "auto", background: "var(--bg-card, #fff)", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border, #eee)", textAlign: "left" }}>
              <th style={th}>Учитель</th>
              <th style={th}>Предмет</th>
              <th style={{ ...th, textAlign: "center" }}>Доступ</th>
              <th style={{ ...th, textAlign: "right" }}>Уроков</th>
              <th style={{ ...th, textAlign: "right" }}>Оплачено</th>
              <th style={{ ...th, textAlign: "center" }}>Онбординг</th>
              <th style={{ ...th, textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {(data?.users ?? []).map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--border, #f5f5f5)" }}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{u.fullName || "—"}</div>
                  <div style={{ color: "var(--text-secondary, #888)", fontSize: 12 }}>{u.email}</div>
                  {u.status !== "active" && (
                    <span style={{ ...badge, background: "#6b7280" }}>{u.status}</span>
                  )}
                </td>
                <td style={{ ...td, color: "var(--text-secondary, #888)" }}>{u.subject || "—"}</td>
                <td style={{ ...td, textAlign: "center" }}><Access u={u} /></td>
                <td style={{ ...td, textAlign: "right" }}>
                  {u.lessons}
                  {/* Баланс пакетов (ТЗ №3): остаток и срок. */}
                  {u.paidLessonsBalance > 0 && (
                    <div style={{ fontSize: 11, color: "#059669" }}>
                      баланс {u.paidLessonsBalance}
                      {u.balanceExpiresAt ? ` до ${new Date(u.balanceExpiresAt).toLocaleDateString("ru-RU")}` : ""}
                    </div>
                  )}
                </td>
                <td style={{ ...td, textAlign: "right" }}>
                  {u.paidKzt ? `${u.paidKzt.toLocaleString("ru-RU")} ₸` : "—"}
                </td>
                <td style={{ ...td, textAlign: "center" }}>{u.onboardingCompleted ? "✓" : "—"}</td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button onClick={() => grantLessonsTo(u)} disabled={busyId === u.id} style={ghostBtn}>+Уроки</button>
                  <button onClick={() => grant(u)} disabled={busyId === u.id} style={{ ...ghostBtn, marginLeft: 6 }}>Подписка</button>
                  {u.subscriptionStatus === "active" && (
                    <button onClick={() => revoke(u)} disabled={busyId === u.id}
                      style={{ ...ghostBtn, marginLeft: 6, color: "#dc2626" }}>Снять</button>
                  )}
                </td>
              </tr>
            ))}
            {!data?.users.length && (
              <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: "var(--text-secondary, #888)" }}>
                B2C-учителей пока нет
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Состояние доступа одной строкой: подписка важнее пробного периода. */
function Access({ u }: { u: B2cUser }) {
  const d = (v: string | Date | null) => (v ? new Date(v).toLocaleDateString("ru-RU") : "");
  if (u.subscriptionStatus === "active") {
    return (
      <span>
        <span style={{ ...badge, background: "#16a34a" }}>подписка</span>
        <div style={hint}>{u.cancelAtPeriodEnd ? "отменяется " : "до "}{d(u.currentPeriodEnd)}</div>
      </span>
    );
  }
  if (u.trialActive) {
    return (
      <span>
        <span style={{ ...badge, background: "#d97706" }}>пробный</span>
        <div style={hint}>до {d(u.trialEndsAt)}</div>
      </span>
    );
  }
  return (
    <span>
      <span style={{ ...badge, background: "#9ca3af" }}>{u.subscriptionStatus ?? "нет доступа"}</span>
      {u.trialEndsAt && <div style={hint}>пробный истёк {d(u.trialEndsAt)}</div>}
    </span>
  );
}

function Card({ label, value, accent, hint: h }: { label: string; value: string; accent?: string; hint?: string }) {
  return (
    <div style={{ background: "var(--bg-card, #fff)", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary, #888)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ?? "inherit" }}>{value}</div>
      {h && <div style={{ fontSize: 11, color: "var(--text-secondary, #999)", marginTop: 4 }}>{h}</div>}
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "10px 12px", verticalAlign: "top" };
const badge: React.CSSProperties = {
  display: "inline-block", padding: "2px 8px", borderRadius: 20,
  fontSize: 11, fontWeight: 700, color: "#fff",
};
const hint: React.CSSProperties = { fontSize: 11, color: "var(--text-secondary, #999)", marginTop: 3 };
const ghostBtn: React.CSSProperties = {
  padding: "5px 10px", fontSize: 12, borderRadius: 6, cursor: "pointer",
  border: "1px solid var(--border, #ddd)", background: "transparent", color: "inherit",
};
