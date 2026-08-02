"use client";

/**
 * Линейные иконки Aqyl — замена эмодзи в интерфейсе.
 *
 * Все иконки: обводка (без заливки), viewBox 24×24, цвет наследуется через
 * `currentColor`, толщина линии настраивается. Поэтому иконка автоматически
 * принимает цвет текста и одинаково смотрится в светлой и тёмной темах.
 *
 * Использование:  <Icon name="school" />        — размер 18 по умолчанию
 *                 <Icon name="chart" size={22} />
 *                 <Icon name="warning" style={{ color: "var(--warn)" }} />
 */

export type IconName =
  | "school" | "clipboard" | "chart" | "chart-line" | "chart-down" | "file" | "files"
  | "trophy" | "medal" | "graduation" | "pencil" | "warning" | "search" | "folder"
  | "folder-open" | "book" | "books" | "user" | "users" | "trash" | "check-circle"
  | "ai" | "star" | "bolt" | "calendar" | "eye" | "clock" | "hash" | "flask"
  | "paperclip" | "map" | "refresh" | "sparkles" | "inbox" | "message" | "ban"
  | "save" | "upload" | "download" | "palette" | "help" | "sun" | "moon" | "target"
  | "sprout" | "wrench" | "brain" | "handshake" | "lock" | "key" | "pin" | "puzzle"
  | "card" | "bank" | "phone" | "wallet" | "printer" | "globe" | "link" | "x-circle"
  | "settings" | "bell" | "mail" | "image" | "laptop" | "layers" | "list" | "plus";

// Пути в стиле обводки 24×24. Заливки нет — только stroke.
const PATHS: Record<IconName, string> = {
  school: "M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5M12 3v2",
  clipboard: "M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1zM8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2M9 12h6M9 16h4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  "chart-line": "M3 17l5-6 4 3 6-8M3 21h18",
  "chart-down": "M3 7l5 6 4-3 6 8M3 21h18",
  file: "M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4zM14 3v4h4M9 13h6M9 17h4",
  files: "M8 3h6l4 4v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4M4 7v13a1 1 0 0 0 1 1h10",
  trophy: "M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 19h6M12 14v5",
  medal: "M12 3l3 5 5 1-4 4 1 5-5-3-5 3 1-5-4-4 5-1 3-5z",
  graduation: "M2 8l10-4 10 4-10 4L2 8zM6 10v5c0 1.5 3 3 6 3s6-1.5 6-3v-5",
  pencil: "M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3zM15 6l3 3",
  warning: "M12 4l9 16H3l9-16zM12 10v4M12 17h.01",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l4 4",
  folder: "M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z",
  "folder-open": "M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v2M3 10h18l-2 9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L3 10z",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM19 19H6",
  books: "M12 6a5 5 0 0 0-8 0v12a5 5 0 0 1 8 0M12 6a5 5 0 0 1 8 0v12a5 5 0 0 0-8 0M12 6v12",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6",
  users: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3.2-6 7-6s7 2 7 6M17 5a4 4 0 0 1 0 7M19 21c0-2.5-.7-4.2-2-5.3",
  trash: "M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6",
  "check-circle": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12l3 3 5-6",
  ai: "M8 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM10 11h.01M14 11h.01M9 15h6M12 6V3M9 3h6M3 10v4M21 10v4",
  star: "M12 4l2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8L12 4z",
  bolt: "M13 3L5 14h6l-1 7 8-11h-6l1-7z",
  calendar: "M4 7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7zM4 11h16M9 4v4M15 4v4",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  hash: "M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16",
  flask: "M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7 15h10",
  paperclip: "M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8",
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  refresh: "M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5",
  sparkles: "M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15z",
  inbox: "M3 13h5l1 3h6l1-3h5M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z",
  message: "M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V5z",
  ban: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM6 6l12 12",
  save: "M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 4v5h7M8 14h8v7H8v-7z",
  upload: "M12 16V4M8 8l4-4 4 4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2",
  download: "M12 4v12M8 12l4 4 4-4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2",
  palette: "M12 3a9 9 0 1 0 0 18 2 2 0 0 0 1.6-3.2 2 2 0 0 1 1.6-3.2H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3zM7.5 11h.01M10 7h.01M15 7.5h.01",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10z",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1z",
  sprout: "M12 21v-8M12 13c0-3-2-5-5-5H4c0 3 2 5 5 5h3zM12 13c0-3 2-5 5-5h3c0 3-2 5-5 5h-3z",
  wrench: "M15 3a5 5 0 0 0-4.6 7L3 17.4V21h3.6l7.4-7.4A5 5 0 0 0 21 9l-3 3-3-3 3-3a5 5 0 0 0-3-3z",
  brain: "M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V15a3 3 0 0 0 4 3M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8V15a3 3 0 0 1-4 3M12 4v16",
  handshake: "M8 12l3-3 2 2 3-3 4 4-5 5-2-2-2 2-5-5 2-2zM3 10l4-4",
  lock: "M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V8a4 4 0 0 1 8 0v3M12 15v3",
  key: "M15 3a6 6 0 1 1-4.3 10.2L4 20v-3h3v-3h3l.7-.8A6 6 0 0 1 15 3zM16.5 7.5h.01",
  pin: "M12 21v-7M8 3h8l-1 6 3 3H6l3-3-1-6z",
  puzzle: "M10 4h4v2a2 2 0 1 0 0 4v2h-4v-2a2 2 0 1 1 0-4V4zM10 12H8v2a2 2 0 1 1-4 0v-2H4v8h16v-8h-2v2a2 2 0 1 1-4 0v-2h-4z",
  card: "M3 8a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8zM3 11h18M7 15h3",
  bank: "M3 10h18L12 4 3 10zM5 10v8M10 10v8M14 10v8M19 10v8M3 21h18",
  phone: "M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM10 18h4",
  wallet: "M3 8a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M3 8v10a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-3M20 10h-4a2.5 2.5 0 0 0 0 5h4a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z",
  printer: "M7 9V4h10v5M7 19H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 15h10v6H7v-6z",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z",
  link: "M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-5.7-5.7l-1 1M14 11a4 4 0 0 0-6-.5l-2 2A4 4 0 0 0 11.7 18l1-1",
  "x-circle": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9l6 6M15 9l-6 6",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.5 1.5l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z",
  bell: "M18 16V11a6 6 0 0 0-12 0v5l-2 3h16l-2-3zM10 20a2 2 0 0 0 4 0",
  mail: "M3 6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6zM3 7l9 6 9-6",
  image: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM3 16l5-4 4 3 4-4 5 5",
  laptop: "M5 6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9H5V6zM2 18h20l-1 2H3l-1-2z",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  plus: "M12 5v14M5 12h14",
};

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, strokeWidth = 1.7, style, ...rest }: IconProps) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: "none", display: "inline-block", verticalAlign: "-0.15em", ...style }}
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}

export default Icon;
