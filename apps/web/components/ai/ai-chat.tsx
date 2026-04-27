"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";

type Message = { role: "user" | "assistant"; content: string };

const PAGE_PROMPTS: Record<string, string[]> = {
  analytics:        ["Проанализируй успеваемость класса", "Дай рекомендации по слабым ученикам"],
  "school-analytics": ["Проанализируй успеваемость по школе", "Какие классы требуют внимания?"],
  assignments:      ["Создай задание по теме", "Придумай тест для проверки знаний"],
  "ktp-plans":      ["Сгенерируй поурочный план", "Помоги с темой урока"],
  lessons:          ["Как оформить открытый урок?", "Генерируй план открытого урока"],
  students:         ["Дай советы по работе с учениками", "Как мотивировать слабых учеников?"],
  dashboard:        ["Что я могу делать на платформе?", "Как работать с классом?"],
};

const COMMON_PROMPTS = ["Как пользоваться платформой?", "Что я могу здесь сделать?"];

interface AiChatProps {
  token: string;
  currentSection: string;
  open: boolean;
  onClose: () => void;
}

export function AiChat({ token, currentSection, open, onClose }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const quickPrompts = [...(PAGE_PROMPTS[currentSection] ?? []), ...COMMON_PROMPTS].slice(0, 4);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const history = messages.map((m) => `${m.role === "user" ? "Пользователь" : "ИИ"}: ${m.content}`).join("\n");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.aiChat(token, { message: trimmed, context: history, pageContext: currentSection });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Произошла ошибка. Попробуйте ещё раз." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  if (!open) return null;

  return (
    <div className="ai-panel" role="dialog" aria-label="ИИ Помощник">
      {/* Header */}
      <div className="ai-panel-header">
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15 }}>
          <span style={{ fontSize: 18 }}>✦</span> Aqyl AI
        </span>
        <button className="ai-close-btn" onClick={onClose} aria-label="Закрыть">✕</button>
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {messages.length === 0 && (
          <div className="ai-welcome">
            <p className="ai-welcome-text">Привет! Я ИИ-ассистент платформы Aqyl. Чем могу помочь?</p>
            <div className="ai-quick-btns">
              {quickPrompts.map((p) => (
                <button key={p} className="ai-quick-btn" onClick={() => send(p)}>{p}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`ai-msg ai-msg-${m.role}`}>
            <div className="ai-bubble">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="ai-msg ai-msg-assistant">
            <div className="ai-bubble ai-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="ai-input-row" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Напишите вопрос..."
          disabled={loading}
        />
        <button className="ai-send-btn" type="submit" disabled={loading || !input.trim()} aria-label="Отправить">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export function AiChatButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      className={`ai-fab${open ? " ai-fab-open" : ""}`}
      onClick={onClick}
      aria-label="ИИ Помощник"
      title="ИИ Помощник"
    >
      <span className="ai-fab-icon">✦</span>
      <span className="ai-fab-label">ИИ Помощник</span>
    </button>
  );
}
