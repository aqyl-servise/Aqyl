import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "../../../components/public-header";
import { PublicFooter } from "../../../components/public-footer";
import { PlanView } from "../../../components/library/plan-view";
import { LANDING_KZ } from "../../../lib/landing-copy";
import { fetchShared, labels } from "../../../lib/library";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

const TXT = {
  ru: {
    badge: "Коллега поделился планом урока",
    note: "План создан в Aqyl. Сделайте такой же по своей теме, классу и языку — за 30 секунд.",
    ctaTitle: "Свой план урока — за 30 секунд",
    ctaText: "По форме приказа № 130, с критериями и дескрипторами, скачивается в Word. 5 уроков бесплатно, без карты.",
    ctaBtn: "Сделать свой план →",
    gone: "Ссылка больше не действует",
  },
  kz: {
    badge: "Әріптесіңіз сабақ жоспарымен бөлісті",
    note: "Жоспар Aqyl-да жасалған. Өз тақырыбыңыз, сыныбыңыз бен тіліңіз бойынша осындай жоспарды 30 секундта жасаңыз.",
    ctaTitle: "Өз сабақ жоспарыңыз — 30 секундта",
    ctaText: "№ 130 бұйрық нысаны бойынша, критерийлер мен дескрипторлармен, Word-қа жүктеледі. 5 сабақ тегін, картасыз.",
    ctaBtn: "Өз жоспарымды жасау →",
    gone: "Сілтеме енді жарамсыз",
  },
} as const;

function titleOf(x: { lang: "ru" | "kz"; subject: string; grade: number | null; topic: string }) {
  const L = labels(x.lang);
  const tail = [x.subject, x.grade ? `${x.grade} ${L.grade}` : ""].filter(Boolean).join(", ");
  return `${L.kind}: ${x.topic}${tail ? ` — ${tail}` : ""}`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const x = await fetchShared(token);
  // Личные ссылки учителей в поиск не попадают; превью в WhatsApp — да.
  const robots = { index: false, follow: false };
  if (!x) return { title: "Aqyl", robots };
  const T = TXT[x.lang];
  return {
    title: `${titleOf(x)} | Aqyl`,
    description: T.note,
    robots,
    openGraph: {
      type: "article", title: titleOf(x), description: T.note,
      locale: x.lang === "kz" ? "kk_KZ" : "ru_KZ",
      images: [x.lang === "kz" ? "/og-kz.png?v=2" : "/og-ru.png"],
    },
  };
}

/**
 * Урок, которым поделился учитель. Учителя пересылают материалы в школьных
 * чатах — эта страница превращает каждый такой пересланный урок в
 * приглашение: кнопка ведёт на регистрацию с кодом приглашения автора.
 */
export default async function SharedLessonPage({ params }: Params) {
  const { token } = await params;
  const x = await fetchShared(token);
  if (!x) notFound();
  const T = TXT[x.lang];
  const L = labels(x.lang);
  const q = new URLSearchParams({ utm_source: "share", utm_medium: "lesson_link" });
  if (x.ref) q.set("ref", x.ref);
  const register = `/register?${q.toString()}`;

  return (
    <div className="aqyl-pub" lang={x.lang === "kz" ? "kk" : "ru"}>
      <PublicHeader labels={x.lang === "kz" ? LANDING_KZ.header : undefined} />
      <section className="pub-section">
        <div className="pub-container">
          <span className="pub-badge pub-badge-green" style={{ marginBottom: 12 }}>{T.badge}</span>
          <h1 style={{ margin: "10px 0 12px", fontSize: "clamp(1.4rem,3.2vw,2.1rem)" }}>{titleOf(x)}</h1>
          <p style={{ maxWidth: 720, marginBottom: 20, fontSize: "0.95rem", color: "var(--pub-text-2)" }}>{T.note}</p>

          <div style={cta}>
            <div style={{ flex: "1 1 260px" }}>
              <div style={{ fontWeight: 600, color: "var(--pub-text)", marginBottom: 4 }}>{T.ctaTitle}</div>
              <div style={{ fontSize: "0.9rem", color: "var(--pub-text-2)" }}>{T.ctaText}</div>
            </div>
            <Link href={register} className="pub-btn pub-btn-primary">{T.ctaBtn}</Link>
          </div>

          <PlanView plan={x.plan} lang={x.lang} subject={x.subject} grade={x.grade ?? 0} topic={x.topic} />

          <div style={{ ...cta, marginTop: 8 }}>
            <div style={{ flex: "1 1 260px" }}>
              <div style={{ fontWeight: 600, color: "var(--pub-text)", marginBottom: 4 }}>{T.ctaTitle}</div>
              <div style={{ fontSize: "0.9rem", color: "var(--pub-text-2)" }}>{L.docTitle} · {T.ctaText}</div>
            </div>
            <Link href={register} className="pub-btn pub-btn-primary">{T.ctaBtn}</Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}

const cta: React.CSSProperties = {
  display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 20,
  padding: "18px 20px", borderRadius: "var(--pub-radius-md)",
  background: "var(--pub-purple-bg)", border: "1px solid var(--pub-border)",
};
