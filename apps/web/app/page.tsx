import Link from "next/link";
import { PublicHeader } from "../components/public-header";
import { PublicFooter } from "../components/public-footer";
import { TRIAL_LABEL, LANDING_PACKAGES, formatTenge } from "../lib/product";

const STATS = [
  { num: "до 3 часов", sub: "в неделю экономии" },
  { num: "30 сек", sub: "генерация КСП" },
  // Не «100% одобрено ведомством» — это читается как заявление об аккредитации, которой нет.
  // МОН РК разделено 11.06.2022; школьное образование ведёт Министерство просвещения.
  { num: "№130", sub: "форма по приказу № 130" },
];

const PAINS = [
  { dot: "pub-dot-purple", title: "КСП вручную", text: "1–2 часа на план урока. Ежедневно." },
  { dot: "pub-dot-purple", title: "Отчёты и СОР", text: "Таблицы вместо подготовки к урокам." },
  { dot: "pub-dot-purple", title: "Изменения требований Министерства просвещения", text: "Стандарты меняются — всё переделывать." },
];

const SOLUTIONS = [
  { accent: "pub-card-accent-purple", title: "КСП", text: "Краткосрочный план урока по теме, классу и стандарту" },
  { accent: "pub-card-accent-green", title: "Функциональная грамотность", text: "Задания в формате PISA со стимульным материалом" },
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
            Введите тему — Aqyl развернёт краткосрочный план урока по требованиям Министерства просвещения РК: этапы, задания, критерии оценивания и готовый документ в Word.
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
          <h2 style={{ marginBottom: 8 }}>Бумажная работа отнимает у учителя часы каждую неделю</h2>
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
          <h2 style={{ marginBottom: 10 }}>Прозрачная цена</h2>
          <p style={{ color: "var(--pub-text-3)", marginBottom: 28, maxWidth: 640 }}>
            Один урок пакета — полный комплект: план (КСП), раздатки трёх уровней,
            критерии оценивания и презентация. {TRIAL_LABEL} при регистрации.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: 18 }}>
            {LANDING_PACKAGES.map((p) => (
              <div key={p.lessons} className="pub-card" style={{ display: "flex", flexDirection: "column", gap: 10, border: p.popular ? "2px solid var(--pub-purple)" : undefined, boxShadow: p.popular ? "var(--pub-shadow-lg)" : undefined, position: "relative" }}>
                {p.popular && (
                  <span className="pub-badge pub-badge-green" style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>Выбор учителей</span>
                )}
                <h3 style={{ margin: 0 }}>{p.lessons} уроков</h3>
                <div>
                  <span style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--pub-purple)" }}>{formatTenge(p.priceKzt)}</span>
                </div>
                <div style={{ color: "var(--pub-text-3)", fontSize: "0.8rem" }}>
                  {Math.round(p.priceKzt / p.lessons)} ₸ за урок
                </div>
                <div style={{ fontSize: "0.9rem", lineHeight: 1.45 }}>{p.note}</div>
                <Link href="/register" className="pub-btn pub-btn-primary pub-btn-full" style={{ marginTop: "auto" }}>Начать бесплатно →</Link>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 24px", marginTop: 22 }}>
            {PLAN_PERSONAL.map((f) => (
              <div key={f} style={listItem}><span className="pub-dot pub-dot-green" /> {f}</div>
            ))}
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
