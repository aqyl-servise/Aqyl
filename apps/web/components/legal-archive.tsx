import Link from "next/link";
import { PublicHeader } from "./public-header";
import { PublicFooter } from "./public-footer";
import { COMPANY } from "../lib/company";
import type { LegalDoc } from "../lib/legal-docs";

/**
 * Архив редакций публичного документа.
 *
 * Существует потому, что на него ссылается сам документ. Пустая страница по
 * такому адресу — битая ссылка внутри опубликованной политики, а это отдельная
 * причина отказа в магазине и явный признак небрежности для проверяющего.
 * Поэтому даже при отсутствии предыдущих редакций страница отвечает
 * содержательно, а не пустотой.
 */
export function LegalArchive({ doc }: { doc: LegalDoc }) {
  const { revisions } = doc;

  return (
    <div className="aqyl-pub">
      <PublicHeader />

      <section className="pub-section">
        <div className="pub-container" style={{ maxWidth: 760 }}>
          <h1 style={{ marginBottom: 8 }}>Предыдущие редакции</h1>
          <p style={{ color: "var(--pub-text-3)", fontSize: "0.875rem", marginBottom: 28 }}>
            {doc.title} · <Link href={`/${doc.slug}`}>перейти к действующей редакции</Link>
          </p>

          {revisions.length === 0 ? (
            <div className="pub-card">
              <h3 style={{ marginBottom: 8 }}>Предыдущих редакций нет</h3>
              <p style={{ lineHeight: 1.75 }}>
                Документ действует в первой редакции{doc.updatedAt ? ` от ${doc.updatedAt}` : ""}.
                Когда редакция изменится, прежний текст останется доступен по этому адресу,
                а об изменении мы сообщим письмом.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {revisions.map((r) => (
                <div key={r.date} className="pub-card">
                  <h3 style={{ marginBottom: 6 }}>Редакция от {r.date}</h3>
                  <p style={{ lineHeight: 1.75, marginBottom: r.href ? 10 : 0 }}>{r.summary}</p>
                  {r.href && <a href={r.href}>Открыть текст этой редакции</a>}
                </div>
              ))}
            </div>
          )}

          <p style={{ marginTop: 32, fontSize: "0.875rem", color: "var(--pub-text-3)" }}>
            Запросить текст любой редакции: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
