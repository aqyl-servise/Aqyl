import Link from "next/link";
import { LogoIcon } from "./public-header";
import { COMPANY, hasRequisites } from "../lib/company";

/**
 * Подвал сайта. Пять обязательных ссылок должны быть доступны со всех страниц
 * и из приложения: без них отклоняют в магазинах, без реквизитов не подключит
 * платёжный оператор.
 */
const DOC_LINKS: { href: string; label: string }[] = [
  { href: "/privacy", label: "Политика конфиденциальности" },
  { href: "/terms", label: "Пользовательское соглашение" },
  { href: "/consent", label: "Согласие на обработку персональных данных" },
  { href: "/delete-account", label: "Удаление аккаунта" },
];

export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      id="contacts"
      style={{ background: "var(--pub-bg)", borderTop: "1px solid var(--pub-border)", padding: "28px 0" }}
    >
      <div className="pub-container" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <LogoIcon size={22} />
            <span style={{ fontFamily: "var(--pub-font-display)", fontWeight: 600 }}>
              aqy<span style={{ color: "var(--pub-amber)" }}>l</span>
            </span>
            <span style={{ fontSize: "0.8125rem", color: "var(--pub-text-3)" }}>© {year}</span>
          </div>
          <nav
            style={{
              display: "flex", gap: 18, flexWrap: "wrap", marginLeft: "auto",
              fontSize: "0.8125rem", color: "var(--pub-text-3)",
            }}
          >
            {DOC_LINKS.map((l) => (
              <Link key={l.href} href={l.href}>{l.label}</Link>
            ))}
            <a href="https://instagram.com/aqyl_platform" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          </nav>
        </div>

        {/* Реквизиты. Показываем только когда заполнены — см. lib/company.ts. */}
        {hasRequisites() && (
          <div style={{ fontSize: "0.75rem", color: "var(--pub-text-3)", lineHeight: 1.7 }}>
            {COMPANY.legalName} · БИН {COMPANY.bin}
            {COMPANY.address && <> · {COMPANY.address}</>}
            {COMPANY.phone && <> · {COMPANY.phone}</>}
            {COMPANY.email && (
              <> · <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
