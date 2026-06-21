import Link from "next/link";
import { PublicHeader, LogoIcon } from "../components/public-header";

const STATS = [
  { num: "3 часа", sub: "в неделю экономии" },
  { num: "30 сек", sub: "генерация КМЖ" },
  { num: "100%", sub: "МОН РК" },
];

const PAINS = [
  { dot: "pub-dot-purple", title: "КМЖ вручную", text: "1–2 часа на план урока. Ежедневно." },
  { dot: "pub-dot-purple", title: "Отчёты и БЖБ", text: "Таблицы вместо подготовки к урокам." },
  { dot: "pub-dot-purple", title: "Изменения МОН РК", text: "Стандарты меняются — всё переделывать." },
];

const SOLUTIONS = [
  { accent: "pub-card-accent-purple", title: "КМЖ", text: "Краткосрочный план урока по теме, классу и стандарту" },
  { accent: "pub-card-accent-green", title: "КТЖ", text: "Долгосрочное планирование на учебный год" },
  { accent: "pub-card-accent-amber", title: "БЖБ/ТЖБ", text: "Суммативные оценки с критериями автоматически" },
  { accent: "pub-card-accent-purple", title: "Аналитика", text: "Рейтинги, отчёты, статистика класса и школы" },
];

const ROLES = [
  { dot: "pub-dot-purple", title: "Учитель", text: "КМЖ, материалы, оценки" },
  { dot: "pub-dot-green", title: "Директор", text: "Аналитика, контроль, отчёты" },
  { dot: "pub-dot-amber", title: "Завуч", text: "Расписание, открытые уроки" },
  { dot: "pub-dot-purple", title: "Психолог", text: "Анкеты, наблюдения, протоколы" },
  { dot: "pub-dot-green", title: "Соц. педагог", text: "Питание, особые учащиеся" },
  { dot: "pub-dot-amber", title: "Ученик", text: "Портфолио, задания, оценки" },
];

const PLAN_SCHOOL = ["КМЖ и КТЖ", "БЖБ / ТЖБ", "Аналитика школы", "Все роли", "Поддержка"];
const PLAN_PERSONAL = ["Генерация КМЖ", "Материалы к урокам", "Личный профиль"];

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
            Aqyl автоматизирует КМЖ, КТЖ, БЖБ/ТЖБ и аналитику по стандартам МОН РК. Для учителей, директоров и всей школы.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
            <Link href="/register" className="pub-btn pub-btn-primary pub-btn-lg">Начать бесплатно →</Link>
            <Link href="/login" className="pub-btn pub-btn-outline pub-btn-lg">Смотреть демо</Link>
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

      {/* ДЛЯ КОГО */}
      <section className="pub-section pub-section-subtle">
        <div className="pub-container">
          <h2 style={{ marginBottom: 32 }}>Для всей школы</h2>
          <div className="pub-grid pub-grid-3">
            {ROLES.map((r) => (
              <div key={r.title} className="pub-card">
                <h3 style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span className={`pub-dot ${r.dot}`} /> {r.title}
                </h3>
                <p>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ТАРИФЫ */}
      <section className="pub-section">
        <div className="pub-container">
          <h2 style={{ marginBottom: 32 }}>Прозрачные цены</h2>
          <div className="pub-grid pub-grid-2" style={{ maxWidth: 820, margin: "0 auto" }}>
            {/* Школьная лицензия */}
            <div className="pub-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h3>Для школы</h3>
              <div>
                <span style={{ fontSize: "1.75rem", fontWeight: 700 }}>от 9 500 ₸</span>
                <span style={{ color: "var(--pub-text-3)", fontSize: "0.875rem" }}> / учитель / год</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {PLAN_SCHOOL.map((f) => (
                  <div key={f} style={listItem}><span className="pub-dot pub-dot-green" /> {f}</div>
                ))}
              </div>
              <Link href="/register" className="pub-btn pub-btn-outline pub-btn-full" style={{ marginTop: "auto" }}>Оставить заявку</Link>
            </div>

            {/* Личная подписка */}
            <div className="pub-card" style={{ display: "flex", flexDirection: "column", gap: 16, border: "1px solid var(--pub-purple)", boxShadow: "var(--pub-shadow-lg)" }}>
              <span className="pub-badge pub-badge-purple" style={{ alignSelf: "flex-start" }}>Популярное</span>
              <h3>Для учителя</h3>
              <div>
                <span style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--pub-purple)" }}>4 000 ₸</span>
                <span style={{ color: "var(--pub-text-3)" }}> / месяц</span>
              </div>
              <span className="pub-badge pub-badge-green" style={{ alignSelf: "flex-start" }}>14 дней бесплатно</span>
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
          <p style={{ color: "rgba(244,240,255,0.7)", marginBottom: 28 }}>14 дней бесплатно. Без привязки карты.</p>
          <Link href="/register" className="pub-btn pub-btn-lg" style={{ background: "#fff", color: "var(--pub-dark)", borderColor: "#fff" }}>
            Зарегистрироваться →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contacts" style={{ background: "var(--pub-bg)", borderTop: "1px solid var(--pub-border)", padding: "24px 0" }}>
        <div className="pub-container" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <LogoIcon size={22} />
            <span style={{ fontWeight: 600, letterSpacing: "0.08em" }}>aqyl</span>
            <span style={{ fontSize: "0.8125rem", color: "var(--pub-text-3)" }}>© 2025 SarbonLab</span>
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginLeft: "auto", fontSize: "0.8125rem", color: "var(--pub-text-3)" }}>
            <a href="#">Политика конфиденциальности</a>
            <a href="#">Условия</a>
            <a href="https://instagram.com/aqyl_platform" target="_blank" rel="noopener noreferrer">Instagram @aqyl_platform</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
