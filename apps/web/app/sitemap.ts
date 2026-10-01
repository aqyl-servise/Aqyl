import type { MetadataRoute } from "next";
import { fetchExamples } from "../lib/library";

// Опубликованные примеры библиотеки попадают в карту в пределах часа.
export const revalidate = 3600;

const BASE = "https://aqyl-service.kz";

/**
 * Карта сайта для поисковиков. Главная указана на двух языках со ссылками
 * друг на друга — так поиск показывает казахскоязычному учителю казахскую
 * версию, а не русскую.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const langs = { languages: { ru: `${BASE}/`, kk: `${BASE}/kz` } };
  const examples = await fetchExamples();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1, alternates: langs },
    { url: `${BASE}/kz`, lastModified: now, changeFrequency: "weekly", priority: 1, alternates: langs },
    { url: `${BASE}/demo`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/consent`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    // Бесплатный бланк — частый запрос «шаблон КСП скачать» / «ҚМЖ үлгісі».
    { url: `${BASE}/ksp-shablon`, lastModified: now, changeFrequency: "monthly", priority: 0.9, alternates: { languages: { ru: `${BASE}/ksp-shablon`, kk: `${BASE}/kz/kmzh-ulgisi` } } },
    { url: `${BASE}/kz/kmzh-ulgisi`, lastModified: now, changeFrequency: "monthly", priority: 0.9, alternates: { languages: { ru: `${BASE}/ksp-shablon`, kk: `${BASE}/kz/kmzh-ulgisi` } } },
    // Библиотека примеров: страницы под поисковые запросы «КСП по … класс».
    { url: `${BASE}/plans`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...examples.map((x) => ({
      url: `${BASE}/plans/${x.slug}`,
      lastModified: x.publishedAt ? new Date(x.publishedAt) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
