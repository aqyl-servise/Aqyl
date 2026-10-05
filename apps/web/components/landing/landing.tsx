import Link from "next/link";
import { PublicHeader } from "../public-header";
import { PublicFooter } from "../public-footer";
import { Icon, type IconName } from "../ui/icon";
import { LANDING_PACKAGES, SHOW_LIVE_QUIZ, formatTenge } from "../../lib/product";
import type { LandingCopy } from "../../lib/landing-copy";
import "./landing.css";

const BUNDLE_ICONS: IconName[] = ["clipboard", "layers", "target", "image"];
const TRUST_ICONS: IconName[] = ["file", "globe", "lock", "pencil"];
const QUIZ_COLORS = ["#8B7FE8", "#3FBF8F", "#F5A623", "#F28B82"];

/** «64 урока», а не «64 уроков». В казахском числительное не склоняет «сабақ». */
function lessonsWord(n: number, c: LandingCopy): string {
  if (c.lang === "kk") return c.pricing.lessons;
  const d10 = n % 10, d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return "урок";
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return "урока";
  return "уроков";
}

/** Заметки к пакетам на казахском. Русские берутся из lib/product. */
const PACKAGE_NOTES_KK: Record<number, string> = {
  10: "Күрделі тақырыптар мен ашық сабақтарға — жоспар мінсіз болуы керек кезде",
  30: "Әр оқу күніне 1–2 дайын сабақ. Кештеріңіз қайтадан өзіңізде",
  64: "Айлық жүктеменің бәрі дайын — жоспарға бір кеш те кетпейді",
  128: "Тоқсанға жететін қор — сабақтың ең тиімді бағасымен",
};

/**
 * Структурированные данные для поиска. Без рейтинга и отзывов: их пока нет,
 * а выдуманная оценка в разметке — прямой повод для санкций поисковика.
 */
function jsonLd(c: LandingCopy) {
  const prices = LANDING_PACKAGES.map((p) => p.priceKzt);
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Aqyl",
    url: c.lang === "kk" ? "https://aqyl-service.kz/kz" : "https://aqyl-service.kz/",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, Android",
    inLanguage: ["kk", "ru", "en"],
    description: `${c.hero.title} ${c.hero.accent}. ${c.hero.sub}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "KZT",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: prices.length,
    },
  };
}

function KspPreview({ c }: { c: LandingCopy }) {
  const p = c.preview;
  return (
    <div className="lp-doc-wrap" aria-label={p.docTitle}>
      <span className="pub-badge pub-badge-green lp-doc-label">{p.label}</span>
      <div className="lp-doc">
        <p className="lp-doc-title">{p.docTitle}</p>
        <div className="lp-doc-meta">{p.meta}</div>
        <table>
          <thead>
            <tr><th>{p.cols[0]}</th><th>{p.cols[1]}</th></tr>
          </thead>
          <tbody>
            {p.rows.map((r) => (
              <tr key={r.stage}>
                <td className="stage">{r.stage}<small>{r.time}</small></td>
                <td>{r.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="lp-doc-desc">
          <b>{p.criteria}</b>
          <ul>{p.descriptors.map((d) => <li key={d}>{d}</li>)}</ul>
          <div className="lp-doc-total">{p.total}</div>
        </div>
      </div>
    </div>
  );
}

export function Landing({ c }: { c: LandingCopy }) {
  const register = "/register";
  return (
    // lang на корневом блоке: у <html> язык задан общим шаблоном (ru),
    // а казахская версия должна объявлять свой язык поиску и экранным читалкам.
    <div className="aqyl-pub" lang={c.lang}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(c)) }} />
      <PublicHeader labels={c.header} />

      {/* ── Первый экран: обещание + сам продукт ── */}
      <section className="lp-hero">
        <div className="pub-container">
          <div className="lp-hero-grid">
            <div>
              <span className="pub-badge pub-badge-purple" style={{ marginBottom: 20 }}>
                <span className="pub-dot pub-dot-green" /> {c.hero.badge}
              </span>
              <h1>
                {c.hero.title}
                <span className="lp-accent">{c.hero.accent}</span>
              </h1>
              <p className="lp-lead">{c.hero.sub}</p>
              <div className="lp-cta-row">
                <Link href={register} className="pub-btn pub-btn-primary pub-btn-lg">{c.hero.cta} →</Link>
                {/* Демо открывается без регистрации — требование правила App Store 5.1.1. */}
                <Link href="/demo" className="pub-btn pub-btn-outline pub-btn-lg">{c.hero.cta2}</Link>
              </div>
              <div className="lp-trust">
                {c.hero.trust.map((t) => (
                  <span key={t}><Icon name="check" size={15} style={{ color: "var(--pub-green)" }} /> {t}</span>
                ))}
              </div>
            </div>
            <KspPreview c={c} />
          </div>

          <div className="lp-stats">
            {c.stats.map((s) => (
              <div key={s.sub} className="lp-stat"><b>{s.num}</b><span>{s.sub}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Было / стало ── */}
      <section className="pub-section pub-section-subtle">
        <div className="pub-container">
          <div className="lp-head"><h2>{c.beforeAfter.title}</h2></div>
          <div className="lp-ba">
            {[c.beforeAfter.before, c.beforeAfter.after].map((x, i) => (
              <div key={x.label} className={`lp-ba-card${i ? " after" : ""}`}>
                <div className="lp-ba-l">{x.label}</div>
                <div className="lp-ba-v">{x.value}</div>
                <p>{x.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Полный комплект ── */}
      <section className="pub-section" id="features">
        <div className="pub-container">
          <div className="lp-head"><h2>{c.bundle.title}</h2><p>{c.bundle.sub}</p></div>
          <div className="lp-bundle">
            {c.bundle.items.map((it, i) => (
              <div key={it.title} className="pub-card">
                <span className="lp-ico"><Icon name={BUNDLE_ICONS[i]} size={20} /></span>
                <h3>{it.title}</h3>
                <p>{it.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Живой квиз (скрыт до готовности: SHOW_LIVE_QUIZ в lib/product.ts) ── */}
      {SHOW_LIVE_QUIZ && (<section className="pub-section pub-section-subtle">
        <div className="pub-container lp-quiz">
          <div>
            <span className="pub-badge pub-badge-green" style={{ marginBottom: 16 }}>{c.quiz.badge}</span>
            <h2>{c.quiz.title}</h2>
            <p style={{ marginTop: 10 }}>{c.quiz.text}</p>
            <ul className="lp-list">
              {c.quiz.bullets.map((b) => <li key={b}><Icon name="check-circle" size={18} /> {b}</li>)}
            </ul>
          </div>
          <div className="lp-quiz-screen" aria-hidden="true">
            <div className="lp-quiz-top">
              <div>
                <div className="lp-quiz-code-l">{c.quiz.code}</div>
                <div className="lp-quiz-code">482 915</div>
              </div>
              <div className="lp-quiz-joined"><b>24</b> {c.quiz.joined}</div>
            </div>
            <div className="lp-quiz-q">{c.lang === "kk" ? "Темір тот басуы үшін не қажет?" : "Что нужно, чтобы железо заржавело?"}</div>
            <div className="lp-quiz-opts">
              {(c.lang === "kk"
                ? ["Су мен оттек", "Тек су", "Тек оттек", "Жылу"]
                : ["Вода и кислород", "Только вода", "Только кислород", "Тепло"]
              ).map((o, i) => (
                <div key={o} className="lp-quiz-opt" style={{ background: QUIZ_COLORS[i] }}>{o}</div>
              ))}
            </div>
          </div>
        </div>
      </section>)}

      {/* ── Как это работает ── */}
      <section className="pub-section">
        <div className="pub-container">
          <div className="lp-head"><h2>{c.how.title}</h2></div>
          <div className="lp-steps">
            {c.how.steps.map((s, i) => (
              <div key={s.title} className="lp-step">
                <div className="lp-step-n">{i + 1}</div>
                <h3 style={{ marginBottom: 6 }}>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Доверие ── */}
      <section className="pub-section pub-section-subtle">
        <div className="pub-container">
          <div className="lp-head"><h2>{c.trust.title}</h2></div>
          <div className="lp-trust-grid">
            {c.trust.items.map((t, i) => (
              <div key={t.title} className="pub-card">
                <span className="lp-ico"><Icon name={TRUST_ICONS[i]} size={20} /></span>
                <h3 style={{ margin: "4px 0 6px" }}>{t.title}</h3>
                <p>{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Отзывы: только настоящие. Пока их нет — блок не показывается. ── */}
      {c.reviews.items.length > 0 && (
        <section className="pub-section">
          <div className="pub-container">
            <div className="lp-head"><h2>{c.reviews.title}</h2></div>
            <div className="lp-reviews">
              {c.reviews.items.map((r) => (
                <figure key={r.name} className="pub-card lp-review" style={{ margin: 0 }}>
                  <blockquote className="lp-review-q" style={{ margin: 0 }}>{r.quote}</blockquote>
                  <figcaption className="lp-review-who">{r.name} · {r.role}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Цены ── */}
      <section className="pub-section" id="pricing">
        <div className="pub-container">
          <div className="lp-head"><h2>{c.pricing.title}</h2><p>{c.pricing.sub}</p></div>
          <div className="lp-prices">
            {LANDING_PACKAGES.map((p) => (
              <div key={p.lessons} className={`pub-card lp-price${p.popular ? " popular" : ""}`}>
                {p.popular && <span className="pub-badge pub-badge-green lp-price-badge">{c.pricing.popular}</span>}
                <h3>{p.lessons} {lessonsWord(p.lessons, c)}</h3>
                <div className="lp-price-sum">{formatTenge(p.priceKzt)}</div>
                <div className="lp-price-per">{Math.round(p.priceKzt / p.lessons)} {c.pricing.perLesson}</div>
                <div className="lp-price-note">{c.lang === "kk" ? (PACKAGE_NOTES_KK[p.lessons] ?? p.note) : p.note}</div>
              </div>
            ))}
          </div>
          <div className="lp-price-cta">
            <Link href={register} className="pub-btn pub-btn-primary pub-btn-lg">{c.pricing.cta} →</Link>
            <p>{c.pricing.note}</p>
          </div>
        </div>
      </section>

      {/* ── Вопросы ── */}
      <section className="pub-section pub-section-subtle" id="faq">
        <div className="pub-container">
          <div className="lp-head"><h2>{c.faq.title}</h2></div>
          <div className="lp-faq">
            {c.faq.items.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Финальный призыв ── */}
      <section style={{ background: "var(--pub-dark)", padding: "64px 0" }}>
        <div className="pub-container" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff", marginBottom: 12 }}>{c.final.title}</h2>
          <p style={{ color: "rgba(244,240,255,0.75)", marginBottom: 28 }}>{c.final.text}</p>
          <Link href={register} className="pub-btn pub-btn-lg" style={{ background: "var(--pub-amber)", color: "var(--pub-on-amber)", borderColor: "var(--pub-amber)" }}>
            {c.final.cta} →
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
