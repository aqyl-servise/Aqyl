"use client";

import { useRouter } from "next/navigation";

const DARK = "#0D0E1A";

export default function HelpPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: DARK, color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.push("/dashboard/b2c")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>← Назад</button>
        <span style={{ fontWeight: 700 }}>❓ Помощь</span>
      </header>
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 4px 18px rgba(13,14,26,0.06)", lineHeight: 1.7, color: DARK, fontSize: 15 }}>
          <h2 style={{ marginTop: 0 }}>Как пользоваться Aqyl</h2>
          <p><b>Создать урок</b> — заполните шапку КСП, сгенерируйте цели, выберите режим (быстрый или конструктор) и получите готовый краткосрочный план по формату №130.</p>
          <p><b>Мои материалы</b> — сохранённые уроки, их можно скачать в Word.</p>
          <p><b>Подписка</b> — тарифы и оплата через Kaspi.</p>
          <h3>Поддержка</h3>
          <p>Вопросы и предложения: <a href="mailto:support@aqyl-service.kz">support@aqyl-service.kz</a></p>
        </div>
      </main>
    </div>
  );
}
