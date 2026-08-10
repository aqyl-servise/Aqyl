import { PublicHeader } from "./public-header";
import { PublicFooter } from "./public-footer";
import { COMPANY } from "../lib/company";
import type { LegalDoc } from "../lib/legal-docs";

/**
 * Общий шаблон страницы публичного документа. Доступен без входа в аккаунт —
 * магазины и платёжный оператор проверяют документ по постоянному адресу.
 */
export function LegalPage({ doc, children }: { doc: LegalDoc; children?: React.ReactNode }) {
  const paragraphs = doc.body.trim() ? doc.body.trim().split(/\n\s*\n/) : [];

  return (
    <div className="aqyl-pub">
      <PublicHeader />

      <section className="pub-section">
        <div className="pub-container" style={{ maxWidth: 760 }}>
          <h1 style={{ marginBottom: 8 }}>{doc.title}</h1>
          {doc.updatedAt && (
            <p style={{ color: "var(--pub-text-3)", fontSize: "0.875rem", marginBottom: 28 }}>
              Редакция от {doc.updatedAt}
            </p>
          )}

          {paragraphs.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {paragraphs.map((p, i) =>
                p.startsWith("## ") ? (
                  <h2 key={i} style={{ marginTop: 12 }}>{p.slice(3)}</h2>
                ) : (
                  <p key={i} style={{ lineHeight: 1.75 }}>{p}</p>
                ),
              )}
            </div>
          ) : (
            <div className="pub-card">
              <h3 style={{ marginBottom: 8 }}>Документ готовится к публикации</h3>
              <p style={{ marginBottom: 12 }}>
                Текст документа будет размещён по этому адресу. Адрес постоянный — он не изменится
                после публикации.
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--pub-text-3)" }}>
                Вопросы по обработке данных:{" "}
                <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              </p>
            </div>
          )}
          {children}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
