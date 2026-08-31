'use client';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

// Знак Aqyl: три штриха (лаванда/мята/янтарь) собираются в одну вершину —
// метафора сборки урока из модулей. Цвета фиксированы (логотип).
export const LogoIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 112 112" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="108" height="108" rx="26" fill="#3B2E7E" />
    <path d="M56 26 L34 84" stroke="#8B7FE8" strokeWidth="11" strokeLinecap="round" />
    <path d="M56 26 L78 84" stroke="#3FBF8F" strokeWidth="11" strokeLinecap="round" />
    <path d="M44 60 L68 60" stroke="#F5A623" strokeWidth="11" strokeLinecap="round" />
    <circle cx="56" cy="26" r="6.5" fill="#F5F4FB" />
  </svg>
);

export function PublicHeader() {
  return (
    <header style={{
      height: '52px',
      borderBottom: '1px solid var(--pub-border)',
      background: 'var(--pub-bg-surface)',
      display: 'flex', alignItems: 'center',
      gap: '16px',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div className="pub-container" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
          <LogoIcon size={26} />
          <span style={{ fontFamily: 'var(--pub-font-display)', fontWeight: 600, fontSize: '1.1875rem', letterSpacing: '0.02em', color: 'var(--pub-text)' }}>aqy<span style={{ color: 'var(--pub-amber)' }}>l</span></span>
        </Link>

        <nav className="pub-nav" style={{ display: 'flex', gap: '2px', marginLeft: '12px', flex: 1 }}>
          <Link href="/#features" className="pub-btn pub-btn-ghost pub-btn-sm">Функции</Link>
          <Link href="/#contacts" className="pub-btn pub-btn-ghost pub-btn-sm">Контакты</Link>
        </nav>

        {/* minWidth: 0 — без него флекс-элемент не даёт себя ужать, и группа
            выталкивала страницу за край экрана на телефоне. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', minWidth: 0 }}>
          <ThemeToggle />
          <Link href="/login" className="pub-btn pub-btn-outline pub-btn-sm">Войти</Link>
          <Link href="/register" className="pub-btn pub-btn-primary pub-btn-sm">
            Начать<span className="pub-word-optional">&nbsp;бесплатно</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
