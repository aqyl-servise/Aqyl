"use client";
import { useTheme, type Theme } from "../../hooks/use-theme";

const OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: "light",  icon: "☀️", label: "Светлая" },
  { value: "dark",   icon: "🌙", label: "Тёмная" },
  { value: "system", icon: "💻", label: "Системная" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Тема оформления">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          className={`theme-btn${theme === o.value ? " active" : ""}`}
          onClick={() => setTheme(o.value)}
          title={o.label}
          aria-pressed={theme === o.value}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
