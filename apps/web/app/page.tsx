import Link from "next/link";
import { PublicHeader } from "../components/public-header";

const PAINS = [
  { icon: "📋", title: "КМЖ вручную", text: "Каждый план урока — 1–2 часа работы. Ежедневно." },
  { icon: "📊", title: "Отчёты и БЖБ", text: "Бесконечные таблицы вместо подготовки к урокам." },
  { icon: "🔄", title: "Изменения МОН РК", text: "Стандарты меняются — всё переделывать заново." },
];

const SOLUTIONS = [
  { title: "КМЖ", text: "Краткосрочный план урока по теме, классу и стандарту МОН РК" },
  { title: "КТЖ", text: "Долгосрочное планирование на весь учебный год" },
  { title: "БЖБ/ТЖБ", text: "Суммативные оценки с критериями автоматически" },
  { title: "Аналитика", text: "Рейтинги, отчёты, статистика по классу и школе" },
];

const ROLES = [
  { icon: "👩‍🏫", title: "Учитель", text: "КМЖ, материалы, оценки" },
  { icon: "🏫", title: "Директор", text: "Аналитика, контроль, отчёты" },
  { icon: "📚", title: "Завуч", text: "Расписание, открытые уроки" },
  { icon: "🧠", title: "Психолог", text: "Анкеты, наблюдения, протоколы" },
  { icon: "👥", title: "Соц. педагог", text: "Питание, особые учащиеся" },
  { icon: "🎓", title: "Ученик", text: "Портфолио, задания, оценки" },
];

const STATS = [
  { num: "3 часа", text: "экономит учитель в неделю" },
  { num: "30 сек", text: "генерация КМЖ" },
  { num: "100%", text: "соответствие МОН РК" },
];

const PLAN_SCHOOL = ["КМЖ / КТЖ", "БЖБ / ТЖБ", "Аналитика", "Все роли", "Поддержка"];
const PLAN_PERSONAL = ["КМЖ генерация", "Материалы", "Профиль"];

export default function LandingPage() {
  return (
    <div className="aqyl-ds aqyl-fade">
      <PublicHeader />

      {/* СЕКЦИЯ 1 — Hero */}
      <section style={{ minHeight: "80vh", display: "flex", alignItems: "center", background: "var(--bg-primary)" }}>
        <div className="aqyl-container" style={{ textAlign: "center", padding: "64px 32px" }}>
          <span className="badge badge-purple" style={{ marginBottom: 20 }}>ИИ для казахстанских школ</span>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", maxWidth: 760, margin: "0 auto 18px" }}>
            Меньше документов. Больше времени на учеников.
          </h1>
          <p style={{ fontSize: "1.0625rem", maxWidth: 620, margin: "0 auto 32px" }}>
            Aqyl автоматизирует КМЖ, отчёты, БЖБ/ТЖБ и аналитику по стандартам МОН РК.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
            <Link href="/register" className="btn btn-primary btn-lg">Начать бесплатно →</Link>
            <Link href="/login" className="btn btn-secondary btn-lg">Смотреть демо</Link>
          </div>
          <div style={{ display: "flex", gap: 40, justifyContent: "center", flexWrap: "wrap" }}>
            {STATS.map((s) => (
              <div key={s.text} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent-purple)", letterSpacing: "-0.02em" }}>{s.num}</div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: 4 }}>{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* СЕКЦИЯ 2 — Проблема */}
      <section className="aqyl-section aqyl-section-alt">
        <div className="aqyl-container">
          <h2 className="aqyl-section-title">Учитель тратит 40% времени на документы, не на детей</h2>
          <div className="aqyl-grid aqyl-grid-3">
            {PAINS.map((p) => (
              <div key={p.title} className="card">
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>{p.icon}</div>
                <h3 style={{ marginBottom: 6 }}>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* СЕКЦИЯ 3 — Решение */}
      <section className="aqyl-section" id="features">
        <div className="aqyl-container">
          <h2 className="aqyl-section-title">Aqyl решает это за 30 секунд</h2>
          <div className="aqyl-grid aqyl-grid-2">
            {SOLUTIONS.map((s) => (
              <div key={s.title} className="card aqyl-card-accent">
                <h3 style={{ marginBottom: 6, color: "var(--accent-purple)" }}>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* СЕКЦИЯ 4 — Для кого */}
      <section className="aqyl-section aqyl-section-alt">
        <div className="aqyl-container">
          <h2 className="aqyl-section-title">Для всей школы</h2>
          <div className="aqyl-grid aqyl-grid-3">
            {ROLES.map((r) => (
              <div key={r.title} className="card">
                <div style={{ fontSize: "1.75rem", marginBottom: 10 }}>{r.icon}</div>
                <h3 style={{ marginBottom: 4 }}>{r.title}</h3>
                <p>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* СЕКЦИЯ 5 — Тарифы */}
      <section className="aqyl-section">
        <div className="aqyl-container">
          <h2 className="aqyl-section-title">Прозрачные цены</h2>
          <div className="aqyl-grid aqyl-grid-2" style={{ maxWidth: 820, margin: "0 auto" }}>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h3>Школьная лицензия</h3>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                от 9 500 ₸ <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-muted)" }}>/ учитель / год</span>
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, margin: 0, padding: 0 }}>
                {PLAN_SCHOOL.map((f) => (
                  <li key={f} style={{ fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--accent-green)", marginRight: 8 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="btn btn-secondary btn-full" style={{ marginTop: "auto" }}>Оставить заявку</Link>
            </div>

            <div className="card aqyl-card-accent" style={{ display: "flex", flexDirection: "column", gap: 14, borderLeftWidth: 3, boxShadow: "var(--shadow-md)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3>Личная подписка</h3>
                <span className="badge badge-purple">Популярное</span>
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                4 000 ₸ <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-muted)" }}>/ месяц</span>
              </div>
              <span className="badge badge-green" style={{ alignSelf: "flex-start" }}>14 дней бесплатно</span>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, margin: 0, padding: 0 }}>
                {PLAN_PERSONAL.map((f) => (
                  <li key={f} style={{ fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--accent-green)", marginRight: 8 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="btn btn-primary btn-full" style={{ marginTop: "auto" }}>Начать бесплатно →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* СЕКЦИЯ 6 — CTA */}
      <section style={{ background: "var(--accent-purple)", padding: "64px 0" }}>
        <div className="aqyl-container" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff", marginBottom: 12 }}>Начните экономить время уже сегодня</h2>
          <p style={{ color: "rgba(255,255,255,0.85)", marginBottom: 28 }}>14 дней бесплатно. Без привязки карты.</p>
          <Link href="/register" className="btn btn-white btn-lg">Зарегистрироваться →</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contacts" style={{ borderTop: "1px solid var(--border-color)", background: "var(--bg-surface)", padding: "32px 0" }}>
        <div className="aqyl-container" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--accent-purple)" }}>Aqyl</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: 4 }}>© 2025 Aqyl. SarbonLab</div>
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            <a href="#">Политика конфиденциальности</a>
            <a href="#">Условия использования</a>
            <a href="https://instagram.com/aqyl_platform" target="_blank" rel="noopener noreferrer">Instagram @aqyl_platform</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
