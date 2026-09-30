import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "../../../components/public-header";
import { PublicFooter } from "../../../components/public-footer";
import { PlanView } from "../../../components/library/plan-view";
import { LANDING_KZ } from "../../../lib/landing-copy";
import { SITE, fetchExample, labels } from "../../../lib/library";

export const revalidate = 600;

type Params = { params: Promise<{ slug: string }> };

/** «КСП по химии, 8 класс: Кислород» — так учителя и ищут. */
function titleOf(x: { lang: "ru" | "kz"; subject: string; grade: number; topic: string }) {
  const L = labels(x.lang);
  return `${L.kind}: ${x.topic} — ${x.subject}, ${x.grade} ${L.grade}`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const x = await fetchExample(slug);
  if (!x) return { title: "Пример не найден | Aqyl", robots: { index: false } };
  const title = `${titleOf(x)} | Aqyl`;
  const description = x.lang === "kz"
    ? `Қысқа мерзімді сабақ жоспары (ҚМЖ): «${x.topic}», ${x.subject}, ${x.grade} сынып. № 130 бұйрық нысаны бойынша: кезеңдер, мұғалім мен оқушы әрекеттері, критерийлер мен дескрипторлар.`
    : `Краткосрочный план урока (КСП): «${x.topic}», ${x.subject}, ${x.grade} класс. По форме приказа № 130: этапы, действия учителя и учащихся, критерии и дескрипторы.`;
  return {
    title,
    description,
    alternates: { canonical: `/plans/${x.slug}` },
    openGraph: {
      type: "article", url: `/plans/${x.slug}`, title: titleOf(x), description,
      locale: x.lang === "kz" ? "kk_KZ" : "ru_KZ",
      images: [x.lang === "kz" ? "/og-kz.png?v=2" : "/og-ru.png"],
    },
  };
}

export default async function PlanPage({ params }: Params) {
  const { slug } = await params;
  const x = await fetchExample(slug);
  if (!x || !x.plan) notFound();
  const L = labels(x.lang);
  const register = `/register?utm_source=library&utm_medium=seo&utm_campaign=${encodeURIComponent(x.slug).slice(0, 120)}`;

  // Разметка для поиска: учебный материал с предметом, классом и языком.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: titleOf(x),
    inLanguage: x.lang === "kz" ? "kk" : "ru",
    learningResourceType: "Lesson plan",
    educationalLevel: `${x.grade} ${L.grade}`,
    about: x.subject,
    url: `${SITE}/plans/${x.slug}`,
    isAccessibleForFree: true,
    provider: { "@type": "Organization", name: "Aqyl", url: SITE },
  };

  return (
    <div className="aqyl-pub" lang={x.lang === "kz" ? "kk" : "ru"}>
      <PublicHeader labels={x.lang === "kz" ? LANDING_KZ.header : undefined} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="pub-section">
        <div className="pub-container">
          <div style={{ fontSize: "0.875rem", marginBottom: 12 }}>
            <Link href="/plans">← {L.back}</Link>
          </div>
          <span className="pub-badge pub-badge-green" style={{ marginBottom: 12 }}>{L.docTitle}</span>
          <h1 style={{ margin: "10px 0 12px", fontSize: "clamp(1.5rem,3.5vw,2.2rem)" }}>{titleOf(x)}</h1>
          <p style={{ maxWidth: 720, marginBottom: 24, fontSize: "0.9rem", color: "var(--pub-text-3)" }}>{L.note}</p>

          <PlanView plan={x.plan} lang={x.lang} subject={x.subject} grade={x.grade} topic={x.topic} />

          <div style={cta}>
            <div style={{ flex: "1 1 260px" }}>
              <div style={{ fontWeight: 600, color: "var(--pub-text)", marginBottom: 4 }}>{L.ctaTitle}</div>
              <div style={{ fontSize: "0.9rem", color: "var(--pub-text-2)" }}>{L.ctaText}</div>
            </div>
            <Link href={register} className="pub-btn pub-btn-primary">{L.ctaBtn}</Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}

const cta: React.CSSProperties = {
  display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 8,
  padding: "20px 22px", borderRadius: "var(--pub-radius-md)",
  background: "var(--pub-purple-bg)", border: "1px solid var(--pub-border)",
};
