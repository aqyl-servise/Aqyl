"use client";

import { useState } from "react";
import Image from "next/image";

type Lang = "ru" | "kz" | "en";
type Theme = "dark" | "light";

const T: Record<Lang, Record<string, string>> = {
  ru: {
    nav_home: "Главная",
    nav_features: "Функции",
    nav_contacts: "Контакты",
    nav_enter: "Войти",

    hero_badge: "ИИ для казахстанских школ",
    hero_title_1: "Меньше документов.",
    hero_title_2: "Больше времени на учеников.",
    hero_sub:
      "Aqyl — платформа с искусственным интеллектом, которая берёт на себя школьную рутину: планы, отчёты, аналитику и материалы. Всё в одном месте.",
    hero_cta_start: "Начать работу",
    hero_cta_more: "Узнать больше",

    problem_title: "Сколько времени уходит на бумаги?",
    problem_1_num: "до 3 часов в день",
    problem_1_text: "учитель тратит на оформление документов",
    problem_2_num: "40+ документов",
    problem_2_text: "в год приходится на одного педагога",
    problem_3_num: "20% времени",
    problem_3_text: "уходит на рутину вместо работы с учениками",

    features_title: "Возможности платформы",
    features_sub: "Всё необходимое для работы школы — в одном решении",
    f1_title: "AI-генерация КМЖ",
    f1_text: "Краткосрочные планы уроков за секунды по готовым шаблонам.",
    f2_title: "Аналитика школы",
    f2_text: "Успеваемость, рейтинги педагогов и отчёты в реальном времени.",
    f3_title: "СОР / СОЧ и аттестация",
    f3_text: "Суммативное оценивание и аттестация — всё в одном месте.",
    f4_title: "Функциональная грамотность",
    f4_text: "Задачи, тесты и аналитика для развития функциональной грамотности.",
    f5_title: "Файловый менеджер",
    f5_text: "КТП, материалы и папки — удобно организованы и всегда под рукой.",
    f6_title: "Уведомления",
    f6_text: "Важные события и напоминания в реальном времени.",

    numbers_1_num: "3+",
    numbers_1_text: "школы в пилоте",
    numbers_2_num: "100+",
    numbers_2_text: "учителей используют платформу",
    numbers_3_num: "1000+",
    numbers_3_text: "документов сгенерировано",

    contacts_title: "Свяжитесь с нами",
    contacts_sub: "Готовы показать Aqyl вашей школе — напишите удобным способом",
    footer_rights: "© 2026 Aqyl. Все права защищены.",
    footer_privacy: "Политика конфиденциальности",
  },
  kz: {
    nav_home: "Басты бет",
    nav_features: "Мүмкіндіктер",
    nav_contacts: "Байланыс",
    nav_enter: "Кіру",

    hero_badge: "Қазақстан мектептеріне арналған ЖИ",
    hero_title_1: "Құжат аз.",
    hero_title_2: "Оқушыларға уақыт көп.",
    hero_sub:
      "Aqyl — мектеп жұмысын жеңілдететін жасанды интеллект платформасы: жоспарлар, есептер, аналитика және материалдар. Барлығы бір жерде.",
    hero_cta_start: "Жұмысты бастау",
    hero_cta_more: "Толығырақ",

    problem_title: "Құжаттарға қанша уақыт кетеді?",
    problem_1_num: "күніне 3 сағатқа дейін",
    problem_1_text: "мұғалім құжаттарды рәсімдеуге жұмсайды",
    problem_2_num: "40+ құжат",
    problem_2_text: "бір педагогке жылына келеді",
    problem_3_num: "уақыттың 20%-ы",
    problem_3_text: "оқушылардың орнына күнделікті жұмысқа кетеді",

    features_title: "Платформа мүмкіндіктері",
    features_sub: "Мектеп жұмысына қажеттінің бәрі — бір шешімде",
    f1_title: "ҚМЖ-ны ЖИ генерациясы",
    f1_text: "Қысқа мерзімді сабақ жоспарлары секундтарда дайын үлгілермен.",
    f2_title: "Мектеп аналитикасы",
    f2_text: "Үлгерім, педагогтер рейтингі және есептер нақты уақытта.",
    f3_title: "БЖБ / ТЖБ және аттестаттау",
    f3_text: "Жиынтық бағалау мен аттестаттау — барлығы бір жерде.",
    f4_title: "Функционалдық сауаттылық",
    f4_text: "Функционалдық сауаттылықты дамытуға арналған тапсырмалар, тесттер, аналитика.",
    f5_title: "Файл менеджері",
    f5_text: "КТЖ, материалдар және қалталар — ыңғайлы ұйымдастырылған.",
    f6_title: "Хабарламалар",
    f6_text: "Маңызды оқиғалар мен еске салулар нақты уақытта.",

    numbers_1_num: "3+",
    numbers_1_text: "пилоттағы мектеп",
    numbers_2_num: "100+",
    numbers_2_text: "мұғалім платформаны қолданады",
    numbers_3_num: "1000+",
    numbers_3_text: "құжат жасалды",

    contacts_title: "Бізбен байланысыңыз",
    contacts_sub: "Aqyl-ды мектебіңізге көрсетуге дайынбыз — ыңғайлы тәсілмен жазыңыз",
    footer_rights: "© 2026 Aqyl. Барлық құқықтар қорғалған.",
    footer_privacy: "Құпиялылық саясаты",
  },
  en: {
    nav_home: "Home",
    nav_features: "Features",
    nav_contacts: "Contacts",
    nav_enter: "Sign in",

    hero_badge: "AI for Kazakhstani schools",
    hero_title_1: "Less paperwork.",
    hero_title_2: "More time for students.",
    hero_sub:
      "Aqyl is an AI-powered platform that takes over school routine: plans, reports, analytics and materials. Everything in one place.",
    hero_cta_start: "Get started",
    hero_cta_more: "Learn more",

    problem_title: "How much time goes into paperwork?",
    problem_1_num: "up to 3 hours a day",
    problem_1_text: "a teacher spends preparing documents",
    problem_2_num: "40+ documents",
    problem_2_text: "per teacher every year",
    problem_3_num: "20% of time",
    problem_3_text: "is spent on routine instead of students",

    features_title: "Platform capabilities",
    features_sub: "Everything a school needs — in a single solution",
    f1_title: "AI lesson plan generation",
    f1_text: "Short-term lesson plans in seconds from ready-made templates.",
    f2_title: "School analytics",
    f2_text: "Performance, teacher ratings and reports in real time.",
    f3_title: "Assessments & certification",
    f3_text: "Summative assessment and certification — all in one place.",
    f4_title: "Functional literacy",
    f4_text: "Tasks, tests and analytics to develop functional literacy.",
    f5_title: "File manager",
    f5_text: "Long-term plans, materials and folders — neatly organized.",
    f6_title: "Notifications",
    f6_text: "Important events and reminders in real time.",

    numbers_1_num: "3+",
    numbers_1_text: "schools in the pilot",
    numbers_2_num: "100+",
    numbers_2_text: "teachers use the platform",
    numbers_3_num: "1000+",
    numbers_3_text: "documents generated",

    contacts_title: "Get in touch",
    contacts_sub: "Ready to show Aqyl to your school — reach out any way you like",
    footer_rights: "© 2026 Aqyl. All rights reserved.",
    footer_privacy: "Privacy policy",
  },
};

const LANGS: Lang[] = ["ru", "kz", "en"];

/* Inline stroke-based icons (24×24, strokeWidth 1.5, currentColor). */
function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "file":
      return (
        <svg {...p}><path d="M6 2h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" /><path d="M13 2v5h5" /></svg>
      );
    case "clipboard":
      return (
        <svg {...p}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9z" /><path d="M8.5 10h7M8.5 14h7M8.5 18h4" /></svg>
      );
    case "clock":
      return (
        <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      );
    case "chip":
      return (
        <svg {...p}><rect x="7" y="7" width="10" height="10" rx="1.5" /><rect x="10" y="10" width="4" height="4" rx="0.5" /><path d="M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3" /></svg>
      );
    case "chart":
      return (
        <svg {...p}><path d="M4 20h16" /><rect x="6" y="10" width="3" height="8" rx="0.5" /><rect x="11" y="6" width="3" height="12" rx="0.5" /><rect x="16" y="13" width="3" height="5" rx="0.5" /></svg>
      );
    case "edit":
      return (
        <svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
      );
    case "target":
      return (
        <svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>
      );
    case "folder":
      return (
        <svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>
      );
    case "bell":
      return (
        <svg {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
      );
    case "phone":
      return (
        <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.6a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" /></svg>
      );
    case "send":
      return (
        <svg {...p}><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
      );
    case "mail":
      return (
        <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
      );
    default:
      return null;
  }
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("ru");
  const [theme, setTheme] = useState<Theme>("dark");
  const t = T[lang];

  const problems = [
    { icon: "file", num: t.problem_1_num, text: t.problem_1_text },
    { icon: "clipboard", num: t.problem_2_num, text: t.problem_2_text },
    { icon: "clock", num: t.problem_3_num, text: t.problem_3_text },
  ];

  const features = [
    { icon: "chip", title: t.f1_title, text: t.f1_text },
    { icon: "chart", title: t.f2_title, text: t.f2_text },
    { icon: "edit", title: t.f3_title, text: t.f3_text },
    { icon: "target", title: t.f4_title, text: t.f4_text },
    { icon: "folder", title: t.f5_title, text: t.f5_text },
    { icon: "bell", title: t.f6_title, text: t.f6_text },
  ];

  const numbers = [
    { num: t.numbers_1_num, text: t.numbers_1_text },
    { num: t.numbers_2_num, text: t.numbers_2_text },
    { num: t.numbers_3_num, text: t.numbers_3_text },
  ];

  return (
    <div className={`lp lp-${theme}`}>
      {/* HEADER */}
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <a href="#" className="lp-logo">
            <Image src="/icon.png" alt="Aqyl" className="lp-logo-img" width={32} height={32} />
            <span className="lp-logo-text">Aqyl</span>
          </a>

          <nav className="lp-nav">
            <a href="#" className="lp-nav-link">{t.nav_home}</a>
            <a href="#features" className="lp-nav-link">{t.nav_features}</a>
            <a href="#contacts" className="lp-nav-link">{t.nav_contacts}</a>
          </nav>

          <div className="lp-header-actions">
            <div className="lp-lang">
              {LANGS.map((l) => (
                <button
                  key={l}
                  className={`lp-lang-btn${l === lang ? " lp-lang-active" : ""}`}
                  onClick={() => setLang(l)}
                  aria-pressed={l === lang}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              className="lp-theme-btn"
              onClick={() => setTheme((th) => (th === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <a href="/login" className="lp-btn lp-btn-primary lp-btn-sm">{t.nav_enter}</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-hero" id="top">
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />
        <div className="lp-blob lp-blob-3" />
        <div className="lp-container lp-hero-inner">
          <span className="lp-badge">{t.hero_badge}</span>
          <h1 className="lp-hero-title">
            <span className="lp-hero-line">{t.hero_title_1}</span>
            <span className="lp-hero-line lp-gradient">{t.hero_title_2}</span>
          </h1>
          <p className="lp-hero-sub">{t.hero_sub}</p>
          <div className="lp-cta-row">
            <a href="/login" className="lp-btn lp-btn-primary lp-btn-lg">{t.hero_cta_start}</a>
            <a href="#features" className="lp-btn lp-btn-outline lp-btn-lg">{t.hero_cta_more}</a>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="lp-section" id="problem">
        <div className="lp-container">
          <h2 className="lp-section-title">{t.problem_title}</h2>
          <div className="lp-grid lp-grid-3">
            {problems.map((p) => (
              <div key={p.text} className="lp-card lp-card-center">
                <div className="lp-card-icon"><Icon name={p.icon} size={40} /></div>
                <div className="lp-card-num lp-gradient">{p.num}</div>
                <p className="lp-card-text">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section" id="features">
        <div className="lp-container">
          <h2 className="lp-section-title">{t.features_title}</h2>
          <p className="lp-section-sub">{t.features_sub}</p>
          <div className="lp-grid lp-grid-3 lp-features">
            {features.map((f) => (
              <div key={f.title} className="lp-card lp-card-hover">
                <div className="lp-card-icon"><Icon name={f.icon} size={32} /></div>
                <h3 className="lp-card-title">{f.title}</h3>
                <p className="lp-card-text">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NUMBERS */}
      <section className="lp-section" id="numbers">
        <div className="lp-container">
          <div className="lp-numbers">
            {numbers.map((n) => (
              <div key={n.text} className="lp-number">
                <div className="lp-number-num lp-gradient">{n.num}</div>
                <div className="lp-number-text">{n.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTS */}
      <section className="lp-section" id="contacts">
        <div className="lp-container">
          <h2 className="lp-section-title">{t.contacts_title}</h2>
          <p className="lp-section-sub">{t.contacts_sub}</p>
          <div className="lp-grid lp-grid-3">
            <a className="lp-card lp-card-hover lp-card-center lp-contact" href="tel:+77000000000">
              <div className="lp-card-icon"><Icon name="phone" size={40} /></div>
              <div className="lp-contact-label">WhatsApp</div>
              <div className="lp-contact-value">+7 (700) 000-00-00</div>
            </a>
            <a className="lp-card lp-card-hover lp-card-center lp-contact" href="https://t.me/aqyl_platform" target="_blank" rel="noopener noreferrer">
              <div className="lp-card-icon"><Icon name="send" size={40} /></div>
              <div className="lp-contact-label">Telegram</div>
              <div className="lp-contact-value">@aqyl_platform</div>
            </a>
            <a className="lp-card lp-card-hover lp-card-center lp-contact" href="mailto:info@aqyl-service.kz">
              <div className="lp-card-icon"><Icon name="mail" size={40} /></div>
              <div className="lp-contact-label">Email</div>
              <div className="lp-contact-value">info@aqyl-service.kz</div>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <a href="#" className="lp-logo">
            <Image src="/icon.png" alt="Aqyl" className="lp-logo-img" width={28} height={28} />
            <span className="lp-logo-text">Aqyl</span>
          </a>
          <span className="lp-footer-copy">{t.footer_rights}</span>
          <a href="#" className="lp-footer-link">{t.footer_privacy}</a>
        </div>
      </footer>

      <style>{`
        html { scroll-behavior: smooth; }

        .lp {
          /* Brand palette */
          --lp-purple: #6B5CE7;
          --lp-blue: #4A90D9;
          --lp-green: #2DC08E;
          --lp-orange: #F5A623;
          --lp-gradient: linear-gradient(100deg, var(--lp-purple), var(--lp-blue) 45%, var(--lp-green));

          min-height: 100vh;
          background: var(--lp-bg);
          color: var(--lp-text);
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
          line-height: 1.6;
          transition: background .3s ease, color .3s ease;
        }
        /* Theme tokens */
        .lp-dark {
          --lp-bg: #0D0E1A;
          --lp-text: #F0F0FF;
          --lp-muted: #9A9ACB;
          --lp-card: #161728;
          --lp-card-2: #1C1D31;
          --lp-border: #262741;
          --lp-header-bg: rgba(13,14,26,0.72);
        }
        .lp-light {
          --lp-bg: #F5F5FF;
          --lp-text: #1A1A2E;
          --lp-muted: #5A5A7A;
          --lp-card: #FFFFFF;
          --lp-card-2: #FFFFFF;
          --lp-border: #E4E4F5;
          --lp-header-bg: rgba(245,245,255,0.72);
        }

        .lp a { color: inherit; text-decoration: none; }
        .lp-container { width: 100%; max-width: 1140px; margin: 0 auto; padding: 0 24px; }
        .lp-gradient {
          background: var(--lp-gradient);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }

        /* Buttons */
        .lp-btn {
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 12px; font-weight: 600; cursor: pointer;
          border: 1px solid transparent; white-space: nowrap;
          transition: all .3s ease;
        }
        .lp-btn-sm { padding: 9px 18px; font-size: 14px; }
        .lp-btn-lg { padding: 15px 30px; font-size: 16px; }
        .lp-btn-primary { background: var(--lp-purple); color: #fff; box-shadow: 0 6px 20px rgba(107,92,231,0.35); }
        .lp-btn-primary:hover { background: #5a4bd6; transform: translateY(-2px); box-shadow: 0 10px 28px rgba(107,92,231,0.45); }
        .lp-btn-outline { background: transparent; color: var(--lp-text); border-color: var(--lp-border); }
        .lp-btn-outline:hover { border-color: var(--lp-purple); transform: translateY(-2px); }

        /* Header */
        .lp-header {
          position: sticky; top: 0; z-index: 50;
          background: var(--lp-header-bg);
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--lp-border);
          transition: background .3s ease, border-color .3s ease;
        }
        .lp-header-inner { display: flex; align-items: center; justify-content: space-between; height: 66px; gap: 16px; }
        .lp-logo { display: inline-flex; align-items: center; gap: 9px; }
        .lp-logo-img { border-radius: 8px; display: block; }
        .lp-logo-text { font-size: 20px; font-weight: 800; letter-spacing: .3px; }
        .lp-nav { display: flex; gap: 28px; }
        .lp-nav-link { color: var(--lp-muted); font-size: 15px; font-weight: 500; transition: color .3s ease; }
        .lp-nav-link:hover { color: var(--lp-text); }
        .lp-header-actions { display: flex; align-items: center; gap: 12px; }
        .lp-lang { display: inline-flex; background: var(--lp-card); border: 1px solid var(--lp-border); border-radius: 10px; padding: 3px; }
        .lp-lang-btn {
          border: none; background: transparent; color: var(--lp-muted);
          font-size: 12px; font-weight: 700; padding: 5px 9px; border-radius: 7px; cursor: pointer;
          transition: all .3s ease;
        }
        .lp-lang-active { background: var(--lp-purple); color: #fff; }
        .lp-theme-btn {
          width: 38px; height: 38px; border-radius: 10px; cursor: pointer;
          background: var(--lp-card); border: 1px solid var(--lp-border);
          font-size: 16px; line-height: 1; transition: all .3s ease;
        }
        .lp-theme-btn:hover { border-color: var(--lp-purple); }

        /* Hero */
        .lp-hero { position: relative; min-height: 100vh; display: flex; align-items: center; overflow: hidden; }
        .lp-hero-inner { position: relative; z-index: 2; text-align: center; padding: 80px 24px 64px; }
        .lp-blob { position: absolute; border-radius: 50%; filter: blur(100px); z-index: 1; pointer-events: none; }
        .lp-blob-1 { width: 460px; height: 460px; background: var(--lp-purple); opacity: .20; top: -80px; left: -60px; }
        .lp-blob-2 { width: 420px; height: 420px; background: var(--lp-blue); opacity: .16; top: 20%; right: -80px; }
        .lp-blob-3 { width: 480px; height: 480px; background: var(--lp-green); opacity: .15; bottom: -120px; left: 35%; }
        .lp-badge {
          display: inline-block; padding: 8px 18px; border-radius: 999px;
          background: var(--lp-card); border: 1px solid var(--lp-border);
          color: var(--lp-muted); font-size: 14px; font-weight: 600; margin-bottom: 28px;
        }
        .lp-hero-title { font-size: clamp(36px, 7vw, 68px); font-weight: 800; line-height: 1.08; margin: 0 0 24px; }
        .lp-hero-line { display: block; }
        .lp-hero-sub { max-width: 640px; margin: 0 auto 38px; font-size: clamp(16px, 2.2vw, 19px); color: var(--lp-muted); }
        .lp-cta-row { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }

        /* Sections */
        .lp-section { padding: 48px 0; }
        .lp-section-title { font-size: clamp(28px, 4.5vw, 42px); font-weight: 800; text-align: center; margin: 0 0 12px; }
        .lp-section-sub { text-align: center; color: var(--lp-muted); font-size: 18px; max-width: 640px; margin: 0 auto 36px; }
        .lp-section-title + .lp-grid { margin-top: 32px; }

        /* Grid + cards */
        .lp-grid { display: grid; gap: 22px; }
        .lp-grid-3 { grid-template-columns: repeat(3, 1fr); }
        .lp-card {
          background: var(--lp-card); border: 1px solid var(--lp-border);
          border-radius: 18px; padding: 30px;
          transition: all .3s ease;
        }
        .lp-card-center { text-align: center; }
        .lp-card-hover:hover { border-color: var(--lp-purple); transform: translateY(-5px); box-shadow: 0 14px 34px rgba(107,92,231,0.12); }
        .lp-card-icon { color: var(--lp-purple); line-height: 0; margin-bottom: 14px; }
        .lp-card-center .lp-card-icon { display: flex; justify-content: center; }
        .lp-card-num { font-size: clamp(24px, 3vw, 32px); font-weight: 800; margin-bottom: 8px; }
        .lp-card-title { font-size: 19px; font-weight: 700; margin: 0 0 8px; }
        .lp-card-text { font-size: 15px; color: var(--lp-muted); margin: 0; }

        /* Numbers block */
        .lp-numbers {
          background: var(--lp-card-2); border: 1px solid var(--lp-border);
          border-radius: 24px; padding: 44px 32px;
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; text-align: center;
        }
        .lp-number-num { font-size: clamp(40px, 6vw, 60px); font-weight: 800; line-height: 1; }
        .lp-number-text { color: var(--lp-muted); font-size: 16px; margin-top: 10px; }

        /* Contacts */
        .lp-contact { display: flex; flex-direction: column; align-items: center; }
        .lp-contact-label { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: var(--lp-muted); margin-bottom: 4px; }
        .lp-contact-value { font-size: 17px; font-weight: 700; }

        /* Footer */
        .lp-footer { border-top: 1px solid var(--lp-border); padding: 30px 0; }
        .lp-footer-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
        .lp-footer-copy { color: var(--lp-muted); font-size: 14px; }
        .lp-footer-link { color: var(--lp-muted); font-size: 14px; transition: color .3s ease; }
        .lp-footer-link:hover { color: var(--lp-text); }

        /* Responsive */
        @media (max-width: 768px) {
          .lp-nav { display: none; }
          .lp-grid-3 { grid-template-columns: 1fr; }
          .lp-numbers { grid-template-columns: 1fr; gap: 32px; padding: 36px 24px; }
          .lp-section { padding: 40px 0; }
          .lp-header-actions { gap: 8px; }
          .lp-lang-btn { padding: 5px 7px; }
          .lp-footer-inner { justify-content: center; text-align: center; }
        }
      `}</style>
    </div>
  );
}
