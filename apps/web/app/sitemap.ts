import type { MetadataRoute } from "next";

const BASE = "https://aqyl-service.kz";

/**
 * Карта сайта для поисковиков. Главная указана на двух языках со ссылками
 * друг на друга — так поиск показывает казахскоязычному учителю казахскую
 * версию, а не русскую.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const langs = { languages: { ru: `${BASE}/`, kk: `${BASE}/kz` } };
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1, alternates: langs },
    { url: `${BASE}/kz`, lastModified: now, changeFrequency: "weekly", priority: 1, alternates: langs },
    { url: `${BASE}/demo`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/consent`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
