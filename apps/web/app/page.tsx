import Link from "next/link";
import { PublicHeader } from "../components/public-header";
import { PublicFooter } from "../components/public-footer";
import { TRIAL_LABEL, PRICE_PER_MONTH, formatTenge } from "../lib/product";

const STATS = [
  { num: "3 часа", sub: "в неделю экономии" },
  { num: "30 сек", sub: "генерация КСП" },
  // Не «100% МОН РК» — это читается как заявление об аккредитации, которой нет.
  { num: "№130", sub: "формат по требованиям МОН РК" },
];

const PAINS = [
  { dot: "pub-dot-purple", title: "КСП вручную", text: "1–2 часа на план урока. Ежедневно." },
  { dot: "pub-dot-purple", title: "Отчёты и СОР", text: "Таблицы вместо подготовки к урокам." },
  { dot: "pub-dot-purple", title: "Изменения МОН РК", text: "Стандарты меняются — всё переделывать." },
];

const SOLUTIONS = [
  { accent: "pub-card-accent-purple", title: "КСП", text: "Краткосрочный план урока по теме, классу и стандарту" },
  { accent: "pub-card-accent-green", title: "Функциональная грамотность", text: "Задания по уровням PISA со стимульным материалом" },
  { accent: "pub-card-accent-amber", title: "Материалы к уроку", text: "Схемы, адаптация текста, рабочие листы" },
  { accent: "pub-card-accent-purple", title: "Экспорт в Word", text: "Готовый документ по формату №130" },
];

// Школьный контур (роли ученика, психолога, соцпедагога и школьный тариф)
// вынесен с витрины на этап B2G — с отдельным договором и согласиями.
const PLAN_PERSONAL = ["Генерация КСП", "Функциональная грамотность", "Материалы к урокам", "Экспорт в Word"];

const listItem: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, fontSize: "0.9375rem", color: "var(--pub-text-2)" };

export default function LandingPage() {
  return (
    <div className="aqyl-pub">
      <PublicHeader />

      {/* HERO */}
      <section style={{ padding: "72px 0 64px" }}>
        <div className="pub-container" style={{ textAlign: "center" }}>
          <span className="pub-badge pub-badge-purple" style={{ marginBottom: 24 }}>
            <span className="pub-dot pub-dot-green" /> ИИ для казахстанских школ
          </span>
          <h1 style={{ maxWidth: 760, margin: "0 auto 20px" }}>
            Меньше документов.<br />
            Больше времени <span style={{ color: "var(--pub-green)" }}>на учеников.</span>
          </h1>
          <p style={{ maxWidth: 600, margin: "0 auto 32px", fontSize: "1.0625rem" }}>
            Введите тему — Aqyl развернёт краткосрочный план урока по требованиям МОН РК: этапы, задания, критерии оценивания и готовый документ в Word.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
            <Link href="/register" className="pub-btn pub-btn-primary pub-btn-lg">Начать бесплатно →</Link>
            {/* Демо открывается без регистрации — требование правила App Store 5.1.1. */}
            <Link href="/demo" className="pub-btn pub-btn-outline pub-btn-lg">Смотреть демо</Link>
          </div>

          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", maxWidth: 700, margin: "0 auto", border: "1px solid var(--pub-border)", borderRadius: "var(--pub-radius-md)", background: "var(--pub-bg-surface)" }}>
            {STATS.map((s, i) => (
              <div key={s.sub} style={{ flex: "1 1 160px", padding: "24px 16px", borderLeft: i ? "1px solid var(--pub-border)" : "none" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--pub-purple)", letterSpacing: "-0.02em" }}>{s.num}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--pub-text-3)", letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 6 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ПРОБЛЕМА */}
      <section className="pub-section pub-section-subtle">
        <div className="pub-container">
          <h2 style={{ marginBottom: 8 }}>Учитель тратит 40% времени на документы</h2>
          <p style={{ marginBottom: 32 }}>Каждый план урока — часы работы. Каждый день.</p>
          <div className="pub-grid pub-grid-3">
            {PAINS.map((p) => (
              <div key={p.title} className="pub-card pub-card-accent-purple">
                <span className={`pub-dot ${p.dot}`} style={{ marginBottom: 14 }} />
                <h3 style={{ marginBottom: 6 }}>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* РЕШЕНИЕ */}
      <section className="pub-section" id="features">
        <div className="pub-container">
          <h2 style={{ marginBottom: 32 }}>Aqyl решает это за 30 секунд</h2>
          <div className="pub-grid pub-grid-2">
            {SOLUTIONS.map((s) => (
              <div key={s.title} className={`pub-card ${s.accent}`}>
                <h3 style={{ marginBottom: 6 }}>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ТАРИФ */}
      <section className="pub-section">
        <div className="pub-container">
          <h2 style={{ marginBottom: 32 }}>Прозрачная цена</h2>
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            <div className="pub-card" style={{ display: "flex", flexDirection: "column", gap: 16, border: "1px solid var(--pub-purple)", boxShadow: "var(--pub-shadow-lg)" }}>
              <h3>Для учителя</h3>
              <div>
                <span style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--pub-purple)" }}>{formatTenge(PRICE_PER_MONTH)}</span>
                <span style={{ color: "var(--pub-text-3)" }}> / месяц</span>
              </div>
              <span className="pub-badge pub-badge-green" style={{ alignSelf: "flex-start" }}>{TRIAL_LABEL}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {PLAN_PERSONAL.map((f) => (
                  <div key={f} style={listItem}><span className="pub-dot pub-dot-green" /> {f}</div>
                ))}
              </div>
              <Link href="/register" className="pub-btn pub-btn-primary pub-btn-full" style={{ marginTop: "auto" }}>Начать бесплатно →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "var(--pub-dark)", padding: "64px 0" }}>
        <div className="pub-container" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff", marginBottom: 12 }}>Начните экономить время уже сегодня</h2>
          <p style={{ color: "rgba(244,240,255,0.7)", marginBottom: 28 }}>{TRIAL_LABEL}. Без привязки карты.</p>
          <Link href="/register" className="pub-btn pub-btn-lg" style={{ background: "#fff", color: "var(--pub-dark)", borderColor: "#fff" }}>
            Зарегистрироваться →
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
