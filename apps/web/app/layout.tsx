import type { Metadata } from "next";
import { Inter, Manrope, Fraunces } from "next/font/google";
import { Toaster } from "sonner";
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

export const metadata: Metadata = {
  title: "Aqyl — планы уроков",
  description:
    "Планы уроков, задания и раздаточные материалы по стандартам Министерства просвещения РК.",
};

const ANTI_FOUC = `(function(){try{var t=localStorage.getItem('aqyl-theme')||'system';var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.setAttribute('data-theme',dark?'dark':'light');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${manrope.variable} ${fraunces.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC }} />
      </head>
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
