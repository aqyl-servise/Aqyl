'use client';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

export function PublicHeader() {
  return (
    <header style={{
      height: 'var(--header-height)',
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--bg-surface)',
      display: 'flex', alignItems: 'center',
      padding: '0 32px', gap: '16px',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <Link href="/" style={{
        fontWeight: 700, fontSize: '1.25rem',
        color: 'var(--accent-purple)', textDecoration: 'none',
        letterSpacing: '-0.02em',
      }}>
        Aqyl
      </Link>
      <nav className="aqyl-public-nav" style={{ display: 'flex', gap: '4px', marginLeft: '16px', flex: 1 }}>
        <Link href="/#features" className="btn btn-ghost btn-sm">Функции</Link>
        <Link href="/#contacts" className="btn btn-ghost btn-sm">Контакты</Link>
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        <ThemeToggle />
        <Link href="/login" className="btn btn-secondary btn-sm">Войти</Link>
        <Link href="/register" className="btn btn-primary btn-sm">Начать бесплатно</Link>
      </div>
    </header>
  );
}
