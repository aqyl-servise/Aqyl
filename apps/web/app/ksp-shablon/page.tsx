import type { Metadata } from "next";
import { TemplatePage } from "../../components/template-page";

export const metadata: Metadata = {
  title: "Шаблон КСП по приказу № 130 — скачать в Word бесплатно | Aqyl",
  description:
    "Бесплатный шаблон краткосрочного плана урока (КСП) по форме приказа № 130 в формате Word: шапка, цели обучения, " +
    "ход урока, критерии оценивания. Или заполните его автоматически за 30 секунд.",
  alternates: { canonical: "/ksp-shablon", languages: { "ru-KZ": "/ksp-shablon", "kk-KZ": "/kz/kmzh-ulgisi" } },
  openGraph: { type: "website", url: "/ksp-shablon", title: "Шаблон КСП по приказу № 130 — скачать в Word", images: ["/og-ru.png"] },
};

export default function KspTemplatePage() {
  return <TemplatePage lang="ru" />;
}
