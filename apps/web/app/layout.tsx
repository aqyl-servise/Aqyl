import type { Metadata } from "next";
import { Inter, Manrope, Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import { AttributionCapture } from "../components/attribution-capture";
import "./globals.css";
import "./globals-design.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

// Бренд-система Aqyl: Manrope — интерфейс/текст (вариативный, полная кириллица + КЗ-глифы);
// Fraunces — заголовки (латиница; кириллица/КЗ подхватываются пофлифным фолбэком на Manrope).
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

/**
 * Метаданные по умолчанию для всех страниц.
 *
 * Превью (openGraph/twitter) критично для роста: основной трафик приходит по
 * ссылкам из Threads, Instagram и учительских чатов. Без этих тегов ссылка в
 * ленте и в мессенджере выглядела голой строкой — без картинки и заголовка.
 *
 * Канонический адрес (alternates.canonical) здесь намеренно НЕ задаётся: в
 * общем шаблоне он унаследовался бы каждой странице, и все они объявили бы
 * себя копией главной. Канонические адреса ставятся постранично.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://aqyl-service.kz"),
  title: "Aqyl — план урока за 30 секунд по приказу № 130",
  description:
    "Краткосрочный план урока (КСП) по форме приказа № 130 за 30 секунд: этапы, " +
    "критерии и дескрипторы, раздатки трёх уровней и презентация. На казахском, русском и английском. " +
    "5 уроков бесплатно.",
  applicationName: "Aqyl",
  // Подтверждение прав на сайт в Google Search Console и Яндекс Вебмастере
  // (01.10.2026). Удалять нельзя: без тега права слетают, а с ними отчёты.
  verification: {
    google: "bOYGbjF2vZMubHkkBqp3WKHfF0-ncagzwk9kGimVCeA",
    yandex: "bcfad3e088fcb19e",
  },
  openGraph: {
    type: "website",
    siteName: "Aqyl",
    locale: "ru_RU",
    title: "Aqyl — план урока за 30 секунд",
    description:
      "По форме приказа № 130: этапы, критерии, раздатки трёх уровней и презентация — в Word. 5 уроков бесплатно.",
    images: [{ url: "/og-ru.png", width: 1200, height: 630, alt: "Aqyl — план урока за 30 секунд" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aqyl — план урока за 30 секунд",
    description: "По форме приказа № 130. 5 уроков бесплатно.",
    images: ["/og-ru.png"],
  },
};

const ANTI_FOUC = `(function(){try{var t=localStorage.getItem('aqyl-theme')||'system';var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.setAttribute('data-theme',dark?'dark':'light');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning — ровно для этого случая: скрипт ниже ставит
    // data-theme до гидратации, в разметке сервера атрибута нет, и React на
    // каждой странице писал в консоль расхождение. Подавляется только атрибут
    // самого <html>, на содержимое страницы это не распространяется.
    <html
      lang="ru"
      className={`${inter.variable} ${manrope.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC }} />
      </head>
      <body>
        {children}
        <AttributionCapture />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
