'use client';
import { useEffect, useState } from 'react';

export function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('aqyl-theme');
    if (saved === 'dark') {
      setDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('aqyl-theme', next ? 'dark' : 'light');
  };

  return (
    <button onClick={toggle} className="pub-btn pub-btn-ghost pub-btn-sm"
      style={{
        fontSize: '0.8125rem', padding: '6px 10px', letterSpacing: '0.02em',
        ...(onDark ? { color: 'rgba(244,240,255,0.85)' } : {}),
      }}
      aria-label="Переключить тему">
      {dark ? '◑ Светлая' : '◐ Тёмная'}
    </button>
  );
}
