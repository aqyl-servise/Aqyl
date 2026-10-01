import type { Metadata } from "next";
import { TemplatePage } from "../../../components/template-page";

export const metadata: Metadata = {
  title: "ҚМЖ үлгісі № 130 бұйрық бойынша — Word-та тегін жүктеу | Aqyl",
  description:
    "№ 130 бұйрық нысаны бойынша қысқа мерзімді сабақ жоспарының (ҚМЖ) тегін үлгісі, Word форматында: тақырыптама, оқу мақсаттары, " +
    "сабақ барысы, бағалау. Немесе оны 30 секундта автоматты түрде толтырыңыз.",
  alternates: { canonical: "/kz/kmzh-ulgisi", languages: { "ru-KZ": "/ksp-shablon", "kk-KZ": "/kz/kmzh-ulgisi" } },
  openGraph: { type: "website", url: "/kz/kmzh-ulgisi", locale: "kk_KZ", title: "ҚМЖ үлгісі № 130 бұйрық бойынша — Word-та жүктеу", images: ["/og-kz.png?v=2"] },
};

export default function KmzhTemplatePage() {
  return <TemplatePage lang="kz" />;
}
