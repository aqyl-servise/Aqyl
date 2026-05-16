"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { useAiUsage } from "../../contexts/ai-usage-context";

type Message = { role: "user" | "assistant"; content: string };

const PAGE_PROMPTS: Record<string, string[]> = {
  analytics:          ["Проанализируй успеваемость класса", "Дай рекомендации по слабым ученикам"],
  "school-analytics": ["Проанализируй успеваемость по школе", "Какие классы требуют внимания?"],
  assignments:        ["Создай задание по теме", "Придумай тест для проверки знаний"],
  "ktp-plans":        ["Сгенерируй поурочный план", "Помоги с темой урока"],
  lessons:            ["Как оформить открытый урок?", "Генерируй план открытого урока"],
  "open-lessons":     ["Как оформить открытый урок?", "Генерируй план открытого урока"],
  students:           ["Дай советы по работе с учениками", "Как мотивировать слабых учеников?"],
  dashboard:          ["Что я могу делать на платформе?", "Как работать с классом?"],
  gifted:             ["Как работать с одарёнными учениками?", "Помоги составить план для олимпиады"],
  fl:                 ["Создай задание по функциональной грамотности", "Объясни PISA-формат заданий"],
  attestation:        ["Как подготовиться к аттестации?", "Требования МОН РК к аттестации"],
  "sor-soch":         ["Как составить СОР по предмету?", "Критерии оценивания для СОЧ"],
};

const COMMON_PROMPTS = ["Как пользоваться платформой?", "Что я могу здесь сделать?"];

const SECTION_MAP: Record<string, string> = {
  ktp: "kmzh_generator",
  "ktp-plans": "ktp_ksp",
  tasks: "task_generator",
  assignments: "assignments",
  analytics: "analytics",
  "school-analytics": "school_analytics",
  lessons: "open_lessons",
  "open-lessons": "open_lessons",
  gifted: "gifted_students",
  fl: "fl_tasks",
  attestation: "attestation",
  "final-attestation": "attestation",
  bbjm: "modo",
  "school-control": "modo",
  "sor-soch": "sor_soch",
};

function getSection(currentSection: string): string {
  return SECTION_MAP[currentSection] ?? "default";
}

interface AiChatProps {
  token: string;
  currentSection: string;
  open: boolean;
  onClose: () => void;
  language?: string;
}

export function AiChat({ token, currentSection, open, onClose, language = "ru" }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { triggerWarning, refresh } = useAiUsage();

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

    const newUserMsg: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    // Send last 6 messages as structured history (excluding current user message)
    const history = messages.slice(-6);

    try {
      const res = await api.aiChat(token, {
        message: trimmed,
        history,
        section: getSection(currentSection),
        context: {},
        language,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      if (res.warning && res.warningMessage) triggerWarning(res.warningMessage);
      refresh();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 429) {
        setMessages((prev) => [...prev, { role: "assistant", content: "🚫 Дневной лимит AI-запросов исчерпан (20/20). Обновится в полночь." }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Произошла ошибка. Попробуйте ещё раз." }]);
      }
      refresh();
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
