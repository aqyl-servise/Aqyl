import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android-обёртка Aqyl.
 *
 * Приложение открывает прод-сайт: правки на сайте видны сразу, без нового
 * релиза в Play. Осознанный выбор — интерфейс правится по несколько раз в
 * день, а ревью занимает 1–3 дня.
 *
 * ВАЖНО — appendUserAgent: маркер читает apps/web/lib/platform.ts и по нему
 * прячет всё, что предлагает оплату. Google Play требует продавать цифровые
 * товары через Play Billing, а наши пакеты оплачиваются через Kaspi. Убрать
 * маркер = получить отказ на ревью.
 */
const config: CapacitorConfig = {
  appId: 'kz.aqyl.app',
  appName: 'Aqyl',
  // Каталог локальных файлов: сюда кладётся только офлайн-заглушка (see errorPath).
  webDir: 'www',
  server: {
    url: 'https://aqyl-service.kz',
    androidScheme: 'https',
    // Открытый http запрещён: приложение обязано ходить только по TLS.
    cleartext: false,
    // Страница, которую показываем, если сайт недоступен (нет сети).
    errorPath: 'offline.html',
  },
  android: {
    appendUserAgent: 'AqylApp/Android',
  },
};

export default config;
