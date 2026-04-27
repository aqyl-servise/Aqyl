import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aqyl MVP",
  description: "Teacher dashboard MVP for lesson planning and analytics.",
};

const ANTI_FOUC = `(function(){try{var t=localStorage.getItem('aqyl-theme')||'system';var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.setAttribute('data-theme',dark?'dark':'light');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
