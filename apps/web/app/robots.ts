import type { MetadataRoute } from "next";

/**
 * Кабинет и служебные адреса закрыты от индексации: там персональные данные
 * и нет смысла для поиска. Витрина, демо и документы — открыты.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /r/ — короткие ссылки: робот накрутил бы счётчик переходов.
        disallow: ["/dashboard", "/api", "/play", "/r/", "/reset-password", "/forgot-password"],
      },
    ],
    sitemap: "https://aqyl-service.kz/sitemap.xml",
    host: "https://aqyl-service.kz",
  };
}
