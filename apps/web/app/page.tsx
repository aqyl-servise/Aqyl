import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aqyl — цифровая платформа для школ",
  description:
    "Aqyl автоматизирует школьные документы, аналитику и взаимодействие — меньше бумаги, больше времени на учеников.",
};

const FEATURES = [
  {
    icon: "🗂️",
    title: "Документы без рутины",
    text: "Планы уроков, отчёты и характеристики формируются автоматически по готовым шаблонам.",
  },
  {
    icon: "🤖",
    title: "ИИ-ассистент",
    text: "Генерация материалов, презентаций и заданий с помощью искусственного интеллекта.",
  },
  {
    icon: "📊",
    title: "Аналитика школы",
    text: "Успеваемость, нагрузка и рейтинг педагогов — наглядно и в реальном времени.",
  },
  {
    icon: "👩‍🏫",
    title: "Роли для всех",
    text: "Администрация, учителя, классные руководители и ученики — каждому свой кабинет.",
  },
  {
    icon: "🧩",
    title: "Функциональная грамотность",
    text: "Готовые модули для развития и оценки функциональной грамотности учеников.",
  },
  {
    icon: "🔒",
    title: "Данные под защитой",
    text: "Изоляция данных каждой школы и безопасное хранение информации.",
  },
];

const NUMBERS = [
  { value: "50+", label: "школ на платформе" },
  { value: "1 200+", label: "учителей работают каждый день" },
  { value: "85 000+", label: "документов сформировано" },
];

export default function LandingPage() {
  return (
    <div className="lp">
      {/* HEADER */}
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <a href="/" className="lp-logo" aria-label="Aqyl">
            <span className="lp-logo-mark">✦</span>
            <span className="lp-logo-text">Aqyl</span>
          </a>
          <a href="/login" className="lp-btn lp-btn-primary lp-btn-sm">
            Войти
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-container">
          <p className="lp-eyebrow">Цифровая школа</p>
          <h1 className="lp-hero-title">
            Меньше документов.<br />
            <span className="lp-accent">Больше времени на учеников.</span>
          </h1>
          <p className="lp-hero-sub">
            Aqyl — платформа, которая автоматизирует школьную рутину: планы,
            отчёты, аналитику и материалы. Всё в одном месте, с поддержкой ИИ.
          </p>
          <div className="lp-cta-row">
            <a href="/login" className="lp-btn lp-btn-primary lp-btn-lg">
              Начать работу
            </a>
            <a href="#features" className="lp-btn lp-btn-ghost lp-btn-lg">
              Узнать больше
            </a>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="lp-section">
        <div className="lp-container lp-problem">
          <h2 className="lp-section-title">Сколько времени уходит на документы?</h2>
          <p className="lp-section-lead">
            Учителя тратят до <span className="lp-accent">15 часов в неделю</span> на
            бумажную работу — планы, отчёты, характеристики и таблицы. Это время,
            которое можно вернуть детям.
          </p>
          <p className="lp-section-lead">
            Aqyl берёт рутину на себя: шаблоны, автозаполнение и ИИ сокращают
            работу с документами в разы.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section" id="features">
        <div className="lp-container">
          <h2 className="lp-section-title lp-center">Возможности платформы</h2>
          <div className="lp-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-card">
                <div className="lp-card-icon">{f.icon}</div>
                <h3 className="lp-card-title">{f.title}</h3>
                <p className="lp-card-text">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NUMBERS */}
      <section className="lp-section lp-numbers-section">
        <div className="lp-container lp-numbers">
          {NUMBERS.map((n) => (
            <div key={n.label} className="lp-number">
              <div className="lp-number-value">{n.value}</div>
              <div className="lp-number-label">{n.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACTS */}
      <section className="lp-section" id="contacts">
        <div className="lp-container lp-center">
          <h2 className="lp-section-title">Свяжитесь с нами</h2>
          <p className="lp-section-lead">
            Готовы показать Aqyl вашей школе. Напишите удобным способом.
          </p>
          <div className="lp-contacts">
            <a className="lp-contact" href="https://wa.me/77000000000" target="_blank" rel="noopener noreferrer">
              <span className="lp-contact-icon">💬</span>
              <span className="lp-contact-label">WhatsApp</span>
              <span className="lp-contact-value">+7 (700) 000-00-00</span>
            </a>
            <a className="lp-contact" href="https://t.me/aqyl_platform" target="_blank" rel="noopener noreferrer">
              <span className="lp-contact-icon">✈️</span>
              <span className="lp-contact-label">Telegram</span>
              <span className="lp-contact-value">@aqyl_platform</span>
            </a>
            <a className="lp-contact" href="mailto:info@aqyl-service.kz">
              <span className="lp-contact-icon">✉️</span>
              <span className="lp-contact-label">Email</span>
              <span className="lp-contact-value">info@aqyl-service.kz</span>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <span className="lp-logo-text">Aqyl</span>
          <span className="lp-footer-copy">
            © {new Date().getFullYear()} Aqyl. Все права защищены.
          </span>
        </div>
      </footer>

      {/* Scoped styles — this project does not use Tailwind, so the landing
          ships its own minimal dark theme via a scoped stylesheet. */}
      <style>{`
        .lp {
          --lp-bg: #0f1117;
          --lp-bg-soft: #161922;
          --lp-card: #1a1e29;
          --lp-border: #262b38;
          --lp-text: #e8eaf0;
          --lp-muted: #9aa0b4;
          --lp-accent: #7c6cf6;
          --lp-accent-2: #4f8cff;
          background: var(--lp-bg);
          color: var(--lp-text);
          min-height: 100vh;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
          line-height: 1.6;
        }
        .lp a { text-decoration: none; color: inherit; }
        .lp-container { width: 100%; max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .lp-center { text-align: center; }
        .lp-accent {
          background: linear-gradient(90deg, var(--lp-accent), var(--lp-accent-2));
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }

        /* Buttons */
        .lp-btn {
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 10px; font-weight: 600; cursor: pointer;
          transition: transform .12s ease, opacity .12s ease, background .12s ease;
          border: 1px solid transparent;
        }
        .lp-btn:hover { transform: translateY(-1px); }
        .lp-btn-sm { padding: 9px 18px; font-size: 14px; }
        .lp-btn-lg { padding: 14px 28px; font-size: 16px; }
        .lp-btn-primary {
          background: linear-gradient(90deg, var(--lp-accent), var(--lp-accent-2));
          color: #fff;
        }
        .lp-btn-ghost {
          background: transparent; color: var(--lp-text);
          border-color: var(--lp-border);
        }
        .lp-btn-ghost:hover { background: var(--lp-bg-soft); }

        /* Header */
        .lp-header {
          position: sticky; top: 0; z-index: 10;
          backdrop-filter: blur(10px);
          background: rgba(15,17,23,0.8);
          border-bottom: 1px solid var(--lp-border);
        }
        .lp-header-inner {
          display: flex; align-items: center; justify-content: space-between;
          height: 64px;
        }
        .lp-logo { display: inline-flex; align-items: center; gap: 8px; }
        .lp-logo-mark { color: var(--lp-accent); font-size: 20px; }
        .lp-logo-text { font-size: 20px; font-weight: 700; letter-spacing: .5px; }

        /* Hero */
        .lp-hero { padding: 96px 0 72px; text-align: center; position: relative; overflow: hidden; }
        .lp-hero::before {
          content: ""; position: absolute; top: -180px; left: 50%;
          transform: translateX(-50%);
          width: 680px; height: 680px; border-radius: 50%;
          background: radial-gradient(circle, rgba(124,108,246,0.18), transparent 60%);
          pointer-events: none;
        }
        .lp-eyebrow {
          display: inline-block; color: var(--lp-accent);
          font-size: 13px; font-weight: 600; letter-spacing: 2px;
          text-transform: uppercase; margin-bottom: 16px;
        }
        .lp-hero-title {
          font-size: clamp(34px, 6vw, 60px); font-weight: 800;
          line-height: 1.1; margin: 0 0 20px;
        }
        .lp-hero-sub {
          max-width: 620px; margin: 0 auto 36px;
          font-size: 18px; color: var(--lp-muted);
        }
        .lp-cta-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

        /* Sections */
        .lp-section { padding: 72px 0; border-top: 1px solid var(--lp-border); }
        .lp-section-title { font-size: clamp(26px, 4vw, 38px); font-weight: 700; margin: 0 0 20px; }
        .lp-section-lead { font-size: 18px; color: var(--lp-muted); max-width: 720px; margin: 0 auto 14px; }
        .lp-problem { max-width: 760px; }

        /* Features grid */
        .lp-features {
          display: grid; gap: 20px; margin-top: 40px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }
        .lp-card {
          background: var(--lp-card); border: 1px solid var(--lp-border);
          border-radius: 16px; padding: 28px;
          transition: border-color .15s ease, transform .15s ease;
        }
        .lp-card:hover { border-color: var(--lp-accent); transform: translateY(-3px); }
        .lp-card-icon { font-size: 28px; margin-bottom: 14px; }
        .lp-card-title { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
        .lp-card-text { font-size: 15px; color: var(--lp-muted); margin: 0; }

        /* Numbers */
        .lp-numbers-section { background: var(--lp-bg-soft); }
        .lp-numbers {
          display: grid; gap: 24px; text-align: center;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }
        .lp-number-value {
          font-size: clamp(36px, 5vw, 52px); font-weight: 800;
          background: linear-gradient(90deg, var(--lp-accent), var(--lp-accent-2));
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }
        .lp-number-label { color: var(--lp-muted); font-size: 15px; margin-top: 6px; }

        /* Contacts */
        .lp-contacts {
          display: grid; gap: 20px; margin-top: 36px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .lp-contact {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          background: var(--lp-card); border: 1px solid var(--lp-border);
          border-radius: 16px; padding: 28px 20px;
          transition: border-color .15s ease, transform .15s ease;
        }
        .lp-contact:hover { border-color: var(--lp-accent); transform: translateY(-3px); }
        .lp-contact-icon { font-size: 26px; }
        .lp-contact-label { font-size: 13px; color: var(--lp-muted); text-transform: uppercase; letter-spacing: 1px; }
        .lp-contact-value { font-size: 16px; font-weight: 600; }

        /* Footer */
        .lp-footer { border-top: 1px solid var(--lp-border); padding: 28px 0; }
        .lp-footer-inner {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }
        .lp-footer-copy { color: var(--lp-muted); font-size: 14px; }
      `}</style>
    </div>
  );
}
