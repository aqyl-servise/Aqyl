"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../../lib/api";

type TeacherNotification = { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string };

export function NotificationBell({ token, t }: { token: string; t: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<TeacherNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.getUnreadNotificationCount(token);
      setUnread(res.count);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    fetchCount();
    // TODO: REPLACE_WITH_WEBSOCKET — at scale, 30s polling of the unread count from every
    // open client is wasteful. Push unread updates over a WebSocket instead. 30s is the
    // minimum acceptable interval until then.
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  useEffect(() => {
    if (!open || loaded) return;
    api.getMyNotifications(token)
      .then(data => { setItems(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [open, loaded, token]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleMarkRead(id: string) {
    await api.markNotificationRead(token, id).catch(() => {});
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  }

  async function handleMarkAll() {
    await api.markAllNotificationsRead(token).catch(() => {});
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "только что";
    if (mins < 60) return `${mins} мин. назад`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ч. назад`;
    return `${Math.floor(hrs / 24)} дн. назад`;
  }

  return (
    <div ref={dropdownRef} style={{ position: "fixed", top: 16, right: 72, zIndex: 300 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: "relative", width: 40, height: 40, borderRadius: "50%",
          border: "1px solid var(--border)", background: "var(--surface)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
        title={t.notifications_title ?? "Уведомления"}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "var(--danger, #ef4444)", color: "#fff",
            borderRadius: "50%", minWidth: 18, height: 18,
            fontSize: 11, fontWeight: 700, display: "flex",
            alignItems: "center", justifyContent: "center", padding: "0 3px",
            lineHeight: 1,
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 48, right: 0, width: 340,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          maxHeight: 420, display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{t.notifications_title ?? "Уведомления"}</span>
            {items.some(n => !n.isRead) && (
              <button
                onClick={handleMarkAll}
                style={{ fontSize: 12, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {t.notifications_mark_all ?? "Отметить все прочитанными"}
              </button>
            )}
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {!loaded ? (
              <p style={{ padding: 16, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>Загрузка...</p>
            ) : items.length === 0 ? (
              <p style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
                {t.notifications_empty ?? "Нет новых уведомлений"}
              </p>
            ) : (
              items.map(n => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.isRead) handleMarkRead(n.id); }}
                  style={{
                    padding: "10px 14px", borderBottom: "1px solid var(--border)",
                    cursor: n.isRead ? "default" : "pointer",
                    background: n.isRead ? "transparent" : "var(--primary-light, rgba(46,39,128,0.05))",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: n.isRead ? 400 : 600, color: "var(--text)", flex: 1 }}>
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", flexShrink: 0, marginTop: 4 }} />
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>
                    {n.message.length > 80 ? n.message.slice(0, 80) + "…" : n.message}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
