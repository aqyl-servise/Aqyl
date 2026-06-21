'use client';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

// SVG логотип — упрощённая иконка aqyl: тёмно-синий круг, лавандовая левая нога,
// мятная правая нога, янтарная перекладина.
export const LogoIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <circle cx="50" cy="50" r="48" fill="#2E2780" stroke="#7F77DD" strokeWidth="1.5" />
    <path d="M47 25 L22 75 L31 75 L56 25 Z" fill="#9B95E4" />
    <path d="M47 25 L56 25 L81 75 L72 75 Z" fill="#3DB88E" />
    <rect x="31" y="52" width="38" height="7" rx="2" fill="#F5A623" />
    <circle cx="51" cy="25" r="5" fill="white" opacity="0.95" />
    <circle cx="51" cy="25" r="2.5" fill="#2E2780" />
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
          <span style={{ fontWeight: 600, fontSize: '1.0625rem', letterSpacing: '0.08em', color: 'var(--pub-text)' }}>aqyl</span>
        </Link>

        <nav className="pub-nav" style={{ display: 'flex', gap: '2px', marginLeft: '12px', flex: 1 }}>
          <Link href="/#features" className="pub-btn pub-btn-ghost pub-btn-sm">Функции</Link>
          <Link href="/#contacts" className="pub-btn pub-btn-ghost pub-btn-sm">Контакты</Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <ThemeToggle />
          <Link href="/login" className="pub-btn pub-btn-outline pub-btn-sm">Войти</Link>
          <Link href="/register" className="pub-btn pub-btn-primary pub-btn-sm">Начать бесплатно</Link>
        </div>
      </div>
    </header>
  );
}
