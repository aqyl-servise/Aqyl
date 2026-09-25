import type { Metadata } from "next";
import { Landing } from "../../components/landing/landing";
import { LANDING_KZ } from "../../lib/landing-copy";

const title = "Aqyl — сабақ жоспары 30 секундта, № 130 бұйрық нысаны бойынша";
const description =
  "Қысқа мерзімді сабақ жоспары (ҚМЖ) № 130 бұйрық нысаны бойынша 30 секундта: кезеңдер, " +
  "критерийлер мен дескрипторлар, үш деңгейлі таратпа және презентация. Қазақ және орыс тілдерінде. " +
  "5 сабақ тегін.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/kz",
    languages: { "ru-KZ": "/", "kk-KZ": "/kz", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    siteName: "Aqyl",
    locale: "kk_KZ",
    url: "/kz",
    title: "Aqyl — сабақ жоспары 30 секундта",
    description: "№ 130 бұйрық нысаны бойынша: кезеңдер, критерийлер, үш деңгейлі таратпа және презентация — Word-та. 5 сабақ тегін.",
    images: [{ url: "/og-kz.png?v=2", width: 1200, height: 630, alt: "Aqyl — сабақ жоспары 30 секундта" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aqyl — сабақ жоспары 30 секундта",
    description: "№ 130 бұйрық нысаны бойынша. 5 сабақ тегін.",
    images: ["/og-kz.png?v=2"],
  },
};

export default function LandingKzPage() {
  return <Landing c={LANDING_KZ} />;
}
