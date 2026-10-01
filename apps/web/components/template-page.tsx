import Link from "next/link";
import { PublicHeader } from "./public-header";
import { PublicFooter } from "./public-footer";
import { LANDING_KZ } from "../lib/landing-copy";

/**
 * Страница «Шаблон КСП / ҚМЖ по приказу № 130 — скачать в Word».
 *
 * Один из самых частых запросов учителей — пустой бланк («шаблон КСП
 * скачать», «ҚМЖ үлгісі»). Бланк отдаём бесплатно и без регистрации — это
 * честный ответ на запрос, — а рядом предлагаем заполнить его автоматически.
 * Бланк собран тем же модулем, что и Word-файлы учителей (docx-kit), поэтому
 * совпадает с нашими планами по структуре.
 */
const COPY = {
  ru: {
    badge: "Бесплатно, без регистрации",
    h1: "Шаблон КСП по приказу № 130 — скачать в Word",
    lead:
      "Краткосрочный план урока (КСП) по форме приказа Министра образования и науки РК от 6 апреля 2020 года № 130. " +
      "Пустой бланк в формате Word: заполните его сами или поручите это Aqyl.",
    download: "Скачать шаблон КСП (.docx)",
    file: "/templates/ksp-130-shablon.docx",
    whatTitle: "Что в шаблоне",
    what: [
      "Шапка: раздел, № урока, ФИО педагога, дата, класс, присутствующие и отсутствующие, тема урока, языковые цели.",
      "Цели обучения по учебной программе и цели урока.",
      "Ценности, которые прививаются на уроке.",
      "Ход урока: начало, середина и конец урока.",
      "Столбцы: этап и время, действия педагога, действия ученика, оценивание, ресурсы.",
    ],
    autoTitle: "Не хотите заполнять вручную?",
    autoText:
      "Укажите предмет, класс и тему — Aqyl заполнит этот шаблон за 30 секунд: этапы урока, действия учителя и учащихся, " +
      "критерии оценивания и дескрипторы. Готовый план скачивается в Word, его можно поправить как обычный документ.",
    autoBtn: "Заполнить автоматически — 5 уроков бесплатно →",
    examples: "Посмотреть примеры готовых КСП",
    other: "Қазақ тілінде: ҚМЖ үлгісі",
    otherHref: "/kz/kmzh-ulgisi",
    faq: [
      ["Можно ли редактировать шаблон?", "Да. Это обычный документ Word: меняйте текст, добавляйте строки этапов, сохраняйте под своим именем."],
      ["Подходит ли шаблон для любого предмета?", "Да. Форма КСП одна для всех предметов и классов; меняется только содержание."],
      ["Сколько стоит автоматическое заполнение?", "Первые 5 уроков — бесплатно, без привязки карты. Дальше — пакеты уроков, оплата разовая."],
    ] as [string, string][],
    utm: "ksp_template",
  },
  kz: {
    badge: "Тегін, тіркелусіз",
    h1: "№ 130 бұйрық бойынша ҚМЖ үлгісі — Word-та жүктеу",
    lead:
      "ҚР Білім және ғылым министрінің 2020 жылғы 6 сәуірдегі № 130 бұйрығындағы нысан бойынша қысқа мерзімді сабақ жоспары (ҚМЖ). " +
      "Word форматындағы бос үлгі: өзіңіз толтырыңыз немесе Aqyl-ға тапсырыңыз.",
    download: "ҚМЖ үлгісін жүктеу (.docx)",
    file: "/templates/kmzh-130-ulgi.docx",
    whatTitle: "Үлгіде не бар",
    what: [
      "Тақырыптама: бөлім, сабақ №, педагогтің аты-жөні, күні, сынып, қатысқандар мен қатыспағандар, сабақ тақырыбы, тілдік мақсаттар.",
      "Оқу бағдарламасына сәйкес оқу мақсаттары және сабақ мақсаттары.",
      "Сабақта дарытылатын құндылықтар.",
      "Сабақ барысы: сабақтың басы, ортасы және соңы.",
      "Бағандар: кезең мен уақыт, педагогтің әрекеті, оқушының әрекеті, бағалау, ресурстар.",
    ],
    autoTitle: "Қолмен толтырғыңыз келмей ме?",
    autoText:
      "Пәнді, сыныпты және тақырыпты көрсетіңіз — Aqyl бұл үлгіні 30 секундта толтырады: сабақ кезеңдері, мұғалім мен оқушы " +
      "әрекеттері, бағалау критерийлері мен дескрипторлар. Дайын жоспар Word-қа жүктеледі, оны әдеттегі құжат сияқты түзетуге болады.",
    autoBtn: "Автоматты түрде толтыру — 5 сабақ тегін →",
    examples: "Дайын ҚМЖ мысалдарын қарау",
    other: "На русском: шаблон КСП",
    otherHref: "/ksp-shablon",
    faq: [
      ["Үлгіні өңдеуге бола ма?", "Иә. Бұл әдеттегі Word құжаты: мәтінді өзгертіңіз, кезең жолдарын қосыңыз, өз атыңызбен сақтаңыз."],
      ["Үлгі кез келген пәнге жарай ма?", "Иә. ҚМЖ нысаны барлық пәндер мен сыныптарға бірдей, тек мазмұны өзгереді."],
      ["Автоматты толтыру қанша тұрады?", "Алғашқы 5 сабақ — тегін, картасыз. Әрі қарай — сабақ пакеттері, төлем бір реттік."],
    ] as [string, string][],
    utm: "kmzh_template",
  },
} as const;

export function TemplatePage({ lang }: { lang: "ru" | "kz" }) {
  const c = COPY[lang];
  const register = `/register?utm_source=template&utm_medium=seo&utm_campaign=${c.utm}`;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return (
    <div className="aqyl-pub" lang={lang === "kz" ? "kk" : "ru"}>
      <PublicHeader labels={lang === "kz" ? LANDING_KZ.header : undefined} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <section className="pub-section">
        <div className="pub-container" style={{ maxWidth: 860 }}>
          <span className="pub-badge pub-badge-green" style={{ marginBottom: 12 }}>{c.badge}</span>
          <h1 style={{ margin: "10px 0 14px", fontSize: "clamp(1.6rem,4vw,2.4rem)" }}>{c.h1}</h1>
          <p style={{ marginBottom: 22, fontSize: "1rem" }}>{c.lead}</p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
            <a href={c.file} download className="pub-btn pub-btn-primary">{c.download}</a>
            <Link href={c.otherHref} className="pub-btn" style={{ border: "1px solid var(--pub-border)" }}>{c.other}</Link>
          </div>

          <div className="pub-card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: 10 }}>{c.whatTitle}</h2>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
              {c.what.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>

          <div style={cta}>
            <div style={{ flex: "1 1 280px" }}>
              <h2 style={{ fontSize: "1.15rem", margin: "0 0 6px", color: "var(--pub-text)" }}>{c.autoTitle}</h2>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--pub-text-2)" }}>{c.autoText}</p>
            </div>
            <Link href={register} className="pub-btn pub-btn-primary">{c.autoBtn}</Link>
          </div>

          <p style={{ margin: "18px 0 28px" }}><Link href="/plans">{c.examples} →</Link></p>

          {c.faq.map(([q, a]) => (
            <div key={q} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: "1rem", marginBottom: 4 }}>{q}</h3>
              <p style={{ margin: 0, color: "var(--pub-text-2)" }}>{a}</p>
            </div>
          ))}
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}

const cta: React.CSSProperties = {
  display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center",
  padding: "20px 22px", borderRadius: "var(--pub-radius-md)",
  background: "var(--pub-purple-bg)", border: "1px solid var(--pub-border)",
};
