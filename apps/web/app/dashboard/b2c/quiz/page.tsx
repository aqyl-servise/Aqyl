"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { io, type Socket } from "socket.io-client";
import { getValidAccessToken } from "../../../../lib/auth";
import { api, type QuizItem, type QuizSession } from "../../../../lib/api";
import { Icon } from "../../../../components/ui/icon";

/**
 * Квизы учителя и экран ведущего (ТЗ 3.0, раздел 5).
 *
 * Один экран с несколькими состояниями: список, создание, правка вопросов,
 * ведение игры. Отдельными страницами это было бы четыре перехода там, где
 * учитель и так торопится перед классом.
 */

type View = "list" | "create" | "edit" | "host";

interface Standing { id: string; name: string; score: number; place: number }
interface LobbyPlayer { id: string; name: string; connected: boolean }

const card: React.CSSProperties = {
  background: "var(--ink-2)", borderRadius: 14, padding: "20px 18px",
  border: "1px solid var(--line)", marginBottom: 14,
};
const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid var(--line)",
  background: "var(--ink)", color: "var(--white)", fontSize: 14, boxSizing: "border-box",
  fontFamily: "inherit",
};
const label: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: "var(--white)", marginBottom: 5, display: "block",
};
const btnPrimary: React.CSSProperties = {
  background: "var(--amber)", color: "var(--on-amber)", border: "none", borderRadius: 10,
  padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const btnGhost: React.CSSProperties = {
  background: "rgba(139,127,232,.12)", border: "1px solid var(--line)", color: "var(--lavender)",
  borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};

/** Цвета и формы вариантов — те же, что видит ученик на телефоне. */
const OPTION_COLORS = ["#E23B3B", "#2E6FD9", "#E8A33D", "#2FA36B"];
const OPTION_SHAPES = ["▲", "◆", "●", "■"];

export default function QuizPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [list, setList] = useState<QuizItem[]>([]);
  const [quiz, setQuiz] = useState<QuizItem | null>(null);

  // создание
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [language, setLanguage] = useState("ru");
  const [count, setCount] = useState(8);

  // ведение
  const [session, setSession] = useState<QuizSession | null>(null);
  const [qr, setQr] = useState<string>("");
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [current, setCurrent] = useState<{ index: number; total: number; text: string; options: string[]; endsAt: number } | null>(null);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [board, setBoard] = useState<Standing[]>([]);
  const [progress, setProgress] = useState({ answered: 0, total: 0 });
  const [left, setLeft] = useState(0);
  const [finished, setFinished] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    getValidAccessToken().then((t) => {
      if (!t) { router.push("/login"); return; }
      setToken(t);
      api.quizList(t).then(setList).catch(() => undefined);
    });
  }, [router]);

  // Обратный отсчёт для проектора.
  useEffect(() => {
    if (!current) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [current]);

  useEffect(() => () => { socketRef.current?.disconnect(); socketRef.current = null; }, []);

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "Не получилось");

  async function create() {
    if (!token || !topic.trim()) return;
    setBusy(true); setError(null);
    try {
      const q = await api.quizCreate(token, {
        topic: topic.trim(), subject: subject.trim() || undefined,
        grade: grade.trim() || undefined, language, count,
      });
      setQuiz(q); setView("edit");
      setList(await api.quizList(token));
    } catch (e) { fail(e); } finally { setBusy(false); }
  }

  async function open(id: string) {
    if (!token) return;
    setBusy(true); setError(null);
    try { setQuiz(await api.quizGet(token, id)); setView("edit"); }
    catch (e) { fail(e); } finally { setBusy(false); }
  }

  /** Запуск игры: код, QR и подключение экрана ведущего. */
  const startSession = useCallback(async (mode: "sync" | "async") => {
    if (!token || !quiz) return;
    setBusy(true); setError(null);
    try {
      const s = await api.quizStartSession(token, quiz.id, mode);
      setSession(s);
      setQr(await QRCode.toDataURL(s.joinUrl, { width: 320, margin: 1 }));
      setPlayers([]); setCurrent(null); setBoard([]); setFinished(false);
      setView("host");

      const sock = io("https://play.aqyl-service.kz", { path: "/socket.io/", transports: ["websocket", "polling"] });
      socketRef.current = sock;

      sock.on("lobby-update", (d: { players: LobbyPlayer[] }) => setPlayers(d.players ?? []));
      sock.on("answers-progress", (d: { answered: number; total: number }) => setProgress(d));
      sock.on("question-start", (q: typeof current) => { setCurrent(q); setRevealed(null); setProgress({ answered: 0, total: 0 }); });
      sock.on("question-end", (d: { correctIndex: number; standings: Standing[] }) => {
        setRevealed(d.correctIndex); setBoard(d.standings ?? []);
      });
      sock.on("quiz-end", (d: { standings: Standing[] }) => { setBoard(d.standings ?? []); setFinished(true); setCurrent(null); });

      sock.on("connect", () => {
        sock.emit("host-join", { code: s.code, hostKey: s.hostKey }, (res: { ok: boolean; players?: LobbyPlayer[]; error?: string }) => {
          if (!res?.ok) setError(res?.error ?? "Не удалось открыть экран ведущего");
          else setPlayers(res.players ?? []);
        });
      });
    } catch (e) { fail(e); } finally { setBusy(false); }
  }, [token, quiz]);

  const emitHost = (event: string, extra: Record<string, unknown> = {}) => {
    if (!session) return;
    socketRef.current?.emit(event, { code: session.code, hostKey: session.hostKey, ...extra },
      (res: { ok: boolean; error?: string }) => { if (!res?.ok && res?.error) setError(res.error); });
  };

  // ── разметка ────────────────────────────────────────────────────────────
  return (
    <div className="aqyl-b2c" style={{ minHeight: "100vh" }}>
      <header style={{ background: "var(--ink-2)", color: "var(--white)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--line)" }}>
        <button onClick={() => (view === "list" ? router.push("/dashboard/b2c") : setView("list"))} style={btnGhost}>← Назад</button>
        <span style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="bolt" size={18} /> Квизы
        </span>
        {view === "list" && (
          <button style={{ ...btnPrimary, marginLeft: "auto", padding: "8px 16px", fontSize: 13 }} onClick={() => setView("create")}>
            + Создать квиз
          </button>
        )}
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        {error && (
          <div style={{ ...card, borderColor: "#E23B3B", color: "#ff9d9d", marginBottom: 16 }}>{error}</div>
        )}

        {view === "list" && (
          list.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
              <div style={{ marginBottom: 8, color: "var(--lavender)" }}><Icon name="inbox" size={34} strokeWidth={1.4} /></div>
              <div style={{ color: "var(--white)", fontWeight: 700, marginBottom: 10 }}>Квизов пока нет</div>
              <button style={btnPrimary} onClick={() => setView("create")}>Создать первый</button>
            </div>
          ) : (
            list.map((q) => (
              <div key={q.id} style={{ ...card, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }} onClick={() => open(q.id)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "var(--white)" }}>{q.title}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {[q.subject, q.grade && `${q.grade} класс`, q.language.toUpperCase()].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <Icon name="chevron-right" size={18} />
              </div>
            ))
          )
        )}

        {view === "create" && (
          <div style={card}>
            <h2 style={{ color: "var(--white)", marginTop: 0 }}>Новый квиз</h2>
            <label style={label}>Тема</label>
            <input style={inp} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Природные зоны Казахстана" />
            <div className="aq-grid-2" style={{ marginTop: 12 }}>
              <div>
                <label style={label}>Предмет</label>
                <input style={inp} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="География" />
              </div>
              <div>
                <label style={label}>Класс</label>
                <input style={inp} value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="7" />
              </div>
            </div>
            <div className="aq-grid-2" style={{ marginTop: 12 }}>
              <div>
                <label style={label}>Язык</label>
                <select style={inp} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="ru">Русский</option>
                  <option value="kz">Қазақша</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label style={label}>Вопросов</label>
                <input style={inp} type="number" min={3} max={15} value={count} onChange={(e) => setCount(Number(e.target.value))} />
              </div>
            </div>
            <button style={{ ...btnPrimary, marginTop: 18 }} onClick={create} disabled={busy || !topic.trim()}>
              {busy ? "Составляем вопросы…" : "Создать"}
            </button>
          </div>
        )}

        {view === "edit" && quiz && (
          <>
            <div style={{ ...card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 700, color: "var(--white)", fontSize: 17 }}>{quiz.title}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{quiz.questions?.length ?? 0} вопросов</div>
              </div>
              <button style={btnGhost} onClick={() => startSession("async")} disabled={busy}>Свой темп</button>
              <button style={btnPrimary} onClick={() => startSession("sync")} disabled={busy}>Запустить на класс</button>
            </div>

            {(quiz.questions ?? []).map((q, i) => (
              <div key={q.id} style={card}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Вопрос {i + 1}</div>
                <div style={{ fontWeight: 700, color: "var(--white)", marginBottom: 12 }}>{q.text}</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {q.options.map((o, oi) => (
                    <div key={oi} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9,
                      background: oi === q.correctIndex ? "rgba(47,163,107,.18)" : "rgba(255,255,255,.04)",
                      border: `1px solid ${oi === q.correctIndex ? "#2FA36B" : "var(--line)"}`,
                      color: "var(--white)", fontSize: 14,
                    }}>
                      <span style={{ color: OPTION_COLORS[oi % 4], fontSize: 15 }}>{OPTION_SHAPES[oi % 4]}</span>
                      <span style={{ flex: 1 }}>{o}</span>
                      {oi === q.correctIndex && <span style={{ fontSize: 12, color: "#2FA36B", fontWeight: 700 }}>верный</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {view === "host" && session && (
          <>
            {!current && !finished && (
              <div style={{ ...card, textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--muted)", letterSpacing: ".08em", textTransform: "uppercase" }}>Код сессии</div>
                <div style={{ fontSize: "clamp(2.6rem, 12vw, 4.5rem)", fontWeight: 800, letterSpacing: ".14em", color: "var(--white)", fontVariantNumeric: "tabular-nums" }}>
                  {session.code}
                </div>
                <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 14 }}>play.aqyl-service.kz</div>
                {qr && <img src={qr} alt="QR-код для входа" style={{ width: 200, height: 200, borderRadius: 12, background: "#fff", padding: 8 }} />}

                <div style={{ marginTop: 18, fontWeight: 700, color: "var(--white)" }}>
                  Подключились: {players.length}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 10 }}>
                  {players.map((p) => (
                    <span key={p.id} style={{
                      padding: "6px 13px", borderRadius: 999, fontSize: 14, fontWeight: 600,
                      background: "rgba(139,127,232,.16)", color: "var(--white)", opacity: p.connected ? 1 : .45,
                    }}>{p.name}</span>
                  ))}
                </div>

                <button style={{ ...btnPrimary, marginTop: 20 }} onClick={() => emitHost("start-quiz")} disabled={!players.length}>
                  {players.length ? "Начать квиз" : "Ждём учеников"}
                </button>
              </div>
            )}

            {current && (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, color: "var(--muted)", fontSize: 14, fontWeight: 600 }}>
                  <span>Вопрос {current.index + 1} из {current.total}</span>
                  <span style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <span>Ответили: {progress.answered}/{progress.total}</span>
                    <span style={{
                      padding: "4px 14px", borderRadius: 999, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                      background: left <= 5 ? "#E23B3B" : "rgba(255,255,255,.14)", color: "var(--white)",
                    }}>{left}</span>
                  </span>
                </div>
                <div style={{ fontSize: "clamp(1.2rem, 3vw, 1.8rem)", fontWeight: 700, color: "var(--white)", marginBottom: 16, lineHeight: 1.35 }}>
                  {current.text}
                </div>
                <div className="aq-grid-2">
                  {current.options.map((o, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderRadius: 14,
                      background: OPTION_COLORS[i % 4], color: i % 4 === 2 ? "#2A1C00" : "#fff",
                      fontWeight: 700, fontSize: 16,
                      opacity: revealed === null || revealed === i ? 1 : .35,
                      outline: revealed === i ? "4px solid #fff" : "none", outlineOffset: -4,
                    }}>
                      <span style={{ fontSize: 18 }}>{OPTION_SHAPES[i % 4]}</span>
                      <span>{o}</span>
                    </div>
                  ))}
                </div>
                {revealed !== null && (
                  <button style={{ ...btnPrimary, marginTop: 18 }} onClick={() => emitHost("next-question")}>
                    {current.index + 1 >= current.total ? "Показать итоги" : "Следующий вопрос"}
                  </button>
                )}
              </div>
            )}

            {(board.length > 0 || finished) && (
              <div style={card}>
                <h3 style={{ color: "var(--white)", marginTop: 0 }}>{finished ? "Итоги" : "Рейтинг"}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {board.map((p) => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "11px 15px", borderRadius: 11,
                      background: p.place === 1 ? "rgba(232,163,61,.22)" : "rgba(255,255,255,.06)",
                      color: "var(--white)", fontWeight: 700,
                    }}>
                      <span style={{ minWidth: 26, opacity: .8, fontVariantNumeric: "tabular-nums" }}>{p.place}</span>
                      <span style={{ flex: 1 }}>{p.name}</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{p.score}</span>
                    </div>
                  ))}
                </div>
                {!finished && (
                  <button style={{ ...btnGhost, marginTop: 14 }} onClick={() => emitHost("end-quiz")}>Завершить квиз</button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
