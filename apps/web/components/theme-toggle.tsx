'use client';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
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
    <button onClick={toggle} className="btn btn-ghost btn-sm" aria-label="Переключить тему"
      style={{ fontSize: '1.1rem', padding: '6px 10px' }}>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
