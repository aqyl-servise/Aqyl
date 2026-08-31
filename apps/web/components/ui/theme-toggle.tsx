"use client";
import { useTheme, type Theme } from "../../hooks/use-theme";
import { Icon, type IconName } from "./icon";

/**
 * Переключатель темы: светлая / тёмная / как в системе.
 *
 * Значки заданы именами из общего набора, а не символами в строке: подписи
 * когда-то потерялись, и все три кнопки рисовались пустыми — в боковой панели
 * оставалась голая полоска, по которой нельзя было понять, что это вообще
 * элемент управления.
 */
const OPTIONS: { value: Theme; icon: IconName; label: string }[] = [
  { value: "light", icon: "sun", label: "Светлая" },
  { value: "dark", icon: "moon", label: "Тёмная" },
  { value: "system", icon: "laptop", label: "Как в системе" },
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
          aria-label={o.label}
          aria-pressed={theme === o.value}
        >
          <Icon name={o.icon} size={15} />
        </button>
      ))}
    </div>
  );
}
