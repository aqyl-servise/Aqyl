import Link from "next/link";
import type { Metadata } from "next";
import { PublicHeader } from "../../components/public-header";
import { PublicFooter } from "../../components/public-footer";
import { fetchExamples, labels, type ExampleListItem } from "../../lib/library";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Примеры КСП и ҚМЖ — краткосрочные планы уроков по приказу № 130 | Aqyl",
  description:
    "Готовые краткосрочные планы уроков (КСП) и қысқа мерзімді сабақ жоспарлары (ҚМЖ) по форме приказа № 130: " +
    "этапы, действия учителя и учащихся, критерии и дескрипторы. По предметам и классам.",
  alternates: { canonical: "/plans" },
  openGraph: { type: "website", url: "/plans", title: "Примеры КСП и ҚМЖ | Aqyl", images: ["/og-ru.png"] },
};

/**
 * Библиотека примеров: вход из поиска по запросам «КСП по … класс» и
 * «ҚМЖ … сынып». Показывает только опубликованные (вычитанные) примеры.
 */
export default async function PlansIndex() {
  const items = await fetchExamples();
  const groups = (["ru", "kz"] as const).map((lang) => ({
    lang,
    bySubject: groupBy(items.filter((x) => x.lang === lang), (x) => x.subject),
  }));

  return (
    <div className="aqyl-pub">
      <PublicHeader />
      <section className="pub-section">
        <div className="pub-container">
          <h1 style={{ marginBottom: 12 }}>Примеры краткосрочных планов уроков</h1>
          <p style={{ maxWidth: 720, marginBottom: 28 }}>
            Готовые КСП на русском и ҚМЖ на казахском языке по форме приказа Министра образования и науки РК
            от 6 апреля 2020 года № 130: этапы урока, действия учителя и учащихся, критерии оценивания и
            дескрипторы. Каждый план создан в Aqyl и вычитан перед публикацией.
          </p>

          {items.length === 0 && (
            <div className="pub-card">Примеры скоро появятся. А пока — <Link href="/demo">посмотрите демо-урок</Link>.</div>
          )}

          {groups.map(({ lang, bySubject }) => bySubject.size > 0 && (
            <div key={lang} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: "1.3rem", marginBottom: 14 }}>
                {lang === "ru" ? "КСП на русском языке" : "ҚМЖ қазақ тілінде"}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
                {[...bySubject.entries()].map(([subject, list]) => (
                  <div key={subject} className="pub-card">
                    <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>{subject}</h3>
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                      {list.sort((a, b) => a.grade - b.grade).map((x) => (
                        <li key={x.slug}>
                          <Link href={`/plans/${x.slug}`}>
                            {x.grade} {labels(x.lang).grade}: {x.topic}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={cta}>
            <div style={{ flex: "1 1 260px" }}>
              <div style={{ fontWeight: 600, color: "var(--pub-text)", marginBottom: 4 }}>Нет вашей темы?</div>
              <div style={{ fontSize: "0.9rem", color: "var(--pub-text-2)" }}>
                Aqyl соберёт план по любой теме за 30 секунд. 5 уроков бесплатно, без карты.
              </div>
            </div>
            <Link href="/register?utm_source=library&utm_medium=seo&utm_campaign=index" className="pub-btn pub-btn-primary">
              Начать бесплатно →
            </Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}

function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x]);
  return m;
}

const cta: React.CSSProperties = {
  display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
  padding: "20px 22px", borderRadius: "var(--pub-radius-md)",
  background: "var(--pub-purple-bg)", border: "1px solid var(--pub-border)",
};

export type { ExampleListItem };
