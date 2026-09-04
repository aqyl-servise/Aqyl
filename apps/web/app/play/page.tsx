"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import "./play.css";

/**
 * Ученическая часть живого квиза (ТЗ 3.0, раздел 5 и 6).
 *
 * Открывается на play.aqyl-service.kz. Ни регистрации, ни персональных
 * данных: код сессии и временное имя, которое живёт только этот урок.
 */

type Screen = "join" | "lobby" | "question" | "verdict" | "final";

interface Standing { id: string; name: string; score: number; place: number }
interface LobbyPlayer { id: string; name: string; connected: boolean }

/** Форма рядом с цветом: только цветом варианты не различит дальтоник. */
const SHAPES = [
  <polygon key="t" points="13,3 25,24 1,24" />,
  <polygon key="d" points="13,1 25,13 13,25 1,13" />,
  <circle key="c" cx="13" cy="13" r="12" />,
  <rect key="s" x="1" y="1" width="24" height="24" rx="3" />,
];

const Shape = ({ i }: { i: number }) => (
  <svg className="pl-shape" viewBox="0 0 26 26" fill="currentColor" aria-hidden="true">
    {SHAPES[i % SHAPES.length]}
  </svg>
);

/** Ключ восстановления после обрыва связи — только в этом браузере. */
const storageKey = (code: string) => `aqyl-play:${code}`;

export default function PlayPage() {
  const [screen, setScreen] = useState<Screen>("join");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);

  const [question, setQuestion] = useState<{ index: number; total: number; text: string; options: string[]; endsAt: number } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(0);

  const [verdict, setVerdict] = useState<{ correct: boolean; gained: number; correctIndex: number } | null>(null);
  const [board, setBoard] = useState<Standing[]>([]);

  const socketRef = useRef<Socket | null>(null);

  // Код можно передать ссылкой с QR — тогда ученику остаётся ввести имя.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("code");
    if (fromUrl) setCode(fromUrl.toUpperCase());
  }, []);

  // Обратный отсчёт считаем от времени окончания, присланного сервером:
  // свои часы у телефона могут врать, но сам отсчёт — дело показа.
  useEffect(() => {
    if (screen !== "question" || !question) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((question.endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [screen, question]);

  const connect = useCallback(() => {
    if (socketRef.current) return socketRef.current;
    const s = io("/", { path: "/socket.io/", transports: ["websocket", "polling"] });

    s.on("lobby-update", (d: { players: LobbyPlayer[] }) => setPlayers(d.players ?? []));

    s.on("question-start", (q: { index: number; total: number; text: string; options: string[]; endsAt: number }) => {
      setQuestion(q);
      setPicked(null);
      setVerdict(null);
      setScreen("question");
    });

    s.on("question-end", (d: { correctIndex: number; standings: Standing[] }) => {
      setBoard(d.standings ?? []);
      setVerdict((v) => ({
        correct: v?.correct ?? false,
        gained: v?.gained ?? 0,
        correctIndex: d.correctIndex,
      }));
      setScreen("verdict");
    });

    s.on("quiz-end", (d: { standings: Standing[] }) => {
      setBoard(d.standings ?? []);
      setScreen("final");
    });

    socketRef.current = s;
    return s;
  }, []);

  useEffect(() => () => { socketRef.current?.disconnect(); socketRef.current = null; }, []);

  async function join() {
    setError(null);
    setBusy(true);
    const s = connect();
    const saved = localStorage.getItem(storageKey(code.toUpperCase()));

    s.emit(
      "join",
      { code: code.trim(), name: name.trim(), playerId: saved || undefined },
      (res: { ok: boolean; error?: string; playerId?: string; name?: string }) => {
        setBusy(false);
        if (!res?.ok) { setError(res?.error ?? "Не удалось подключиться"); return; }
        setMe({ id: res.playerId!, name: res.name! });
        try { localStorage.setItem(storageKey(code.toUpperCase()), res.playerId!); } catch { /* режим инкогнито */ }
        setScreen("lobby");
      },
    );
  }

  function answer(optionIndex: number) {
    if (picked !== null) return;
    setPicked(optionIndex);
    socketRef.current?.emit(
      "answer",
      { optionIndex },
      (res: { ok: boolean; correct?: boolean; gained?: number }) => {
        // Правильный вариант придёт при закрытии вопроса — до тех пор ученик
        // видит только «ответ принят».
        setVerdict({ correct: !!res?.correct, gained: res?.gained ?? 0, correctIndex: -1 });
      },
    );
  }

  const myPlace = useMemo(() => board.find((p) => p.id === me?.id), [board, me]);

  return (
    <div className="pl">
      <div className="pl-shell">
        <div className="pl-top">
          <span className="pl-brand">aqyl</span>
          {me && <span>{me.name}</span>}
        </div>

        {screen === "join" && (
          <div className="pl-card">
            <h1 className="pl-title">Присоединиться к квизу</h1>
            <p className="pl-sub">Введите код с экрана учителя и придумайте имя, под которым вас увидит класс.</p>
            {error && <p className="pl-error">{error}</p>}

            <label className="pl-label" htmlFor="pl-code">Код сессии</label>
            <input
              id="pl-code" className="pl-input pl-input-code" value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123" inputMode="text" autoCapitalize="characters"
              autoCorrect="off" spellCheck={false} maxLength={6}
            />

            <label className="pl-label" htmlFor="pl-name">Ваше имя</label>
            <input
              id="pl-name" className="pl-input" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Айгерим" maxLength={20}
              onKeyDown={(e) => e.key === "Enter" && code && name && join()}
            />

            <button className="pl-btn" onClick={join} disabled={busy || !code.trim() || !name.trim()}>
              {busy ? "Подключаемся…" : "Войти"}
            </button>
          </div>
        )}

        {screen === "lobby" && (
          <div className="pl-card pl-center">
            <h1 className="pl-title">Вы в игре</h1>
            <div className="pl-you">{me?.name}</div>
            <p className="pl-sub" style={{ marginTop: 16 }}>Ждём учителя. Не закрывайте страницу.</p>
            <div className="pl-players">
              {players.map((p) => (
                <span key={p.id} className={`pl-chip${p.connected ? "" : " pl-chip-off"}`}>{p.name}</span>
              ))}
            </div>
          </div>
        )}

        {screen === "question" && question && (
          <>
            <div className="pl-qmeta">
              <span>Вопрос {question.index + 1} из {question.total}</span>
              <span className={`pl-timer${left <= 5 ? " pl-timer-low" : ""}`}>{left}</span>
            </div>
            <p className="pl-question">{question.text}</p>
            <div className="pl-options">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  className={`pl-option pl-option-${i}${picked === null ? "" : picked === i ? " pl-picked" : " pl-dim"}`}
                  onClick={() => answer(i)}
                  disabled={picked !== null}
                >
                  <Shape i={i} />
                  <span>{opt}</span>
                </button>
              ))}
            </div>
            {picked !== null && <p className="pl-muted pl-center">Ответ принят. Ждём остальных.</p>}
          </>
        )}

        {screen === "verdict" && (
          <>
            <div className={`pl-verdict ${verdict?.correct ? "pl-verdict-ok" : "pl-verdict-no"}`}>
              <p className="pl-verdict-title">{verdict?.correct ? "Верно" : "Неверно"}</p>
              {verdict?.correct && <div className="pl-gain">+{verdict.gained}</div>}
              {!verdict?.correct && verdict && verdict.correctIndex >= 0 && question && (
                <p style={{ margin: "6px 0 0" }}>Правильный ответ: {question.options[verdict.correctIndex]}</p>
              )}
            </div>
            {myPlace && (
              <p className="pl-center pl-muted">
                Вы на {myPlace.place} месте · {myPlace.score} баллов
              </p>
            )}
            <div className="pl-board">
              {board.slice(0, 5).map((p) => (
                <div key={p.id} className={`pl-row${p.id === me?.id ? " pl-row-me" : ""}`}>
                  <span className="pl-place">{p.place}</span>
                  <span className="pl-row-name">{p.name}</span>
                  <span className="pl-row-score">{p.score}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {screen === "final" && (
          <>
            <h1 className="pl-title pl-center">Квиз завершён</h1>
            {myPlace && (
              <p className="pl-center pl-muted">
                Ваше место — {myPlace.place}, {myPlace.score} баллов
              </p>
            )}
            <div className="pl-board">
              {board.map((p) => (
                <div
                  key={p.id}
                  className={`pl-row${p.place <= 3 ? ` pl-medal-${p.place}` : ""}${p.id === me?.id ? " pl-row-me" : ""}`}
                >
                  <span className="pl-place">{p.place}</span>
                  <span className="pl-row-name">{p.name}</span>
                  <span className="pl-row-score">{p.score}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
