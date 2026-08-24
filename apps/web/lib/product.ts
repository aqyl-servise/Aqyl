/**
 * Единый источник правды по коммерческим параметрам продукта.
 *
 * ВАЖНО: эти же значения попадают в оферту, в политику и в анкеты App Store и
 * Google Play. Расхождение между интерфейсом, документами и карточками
 * магазинов — самостоятельная причина отказа при публикации. Менять только
 * здесь, а в остальных местах импортировать.
 */

/**
 * Объём бесплатного доступа в полных уроках. Обязан совпадать с офертой
 * (п. 4.1, «5 (пяти) полных комплектов») и с дефолтом env TRIAL_LESSONS
 * на API — если меняете env, поменяйте и здесь, и в оферте.
 */
export const TRIAL_LESSONS = 5;

/** Подпись бесплатного доступа для витрины и экрана регистрации. */
export const TRIAL_LABEL = `${TRIAL_LESSONS} полных уроков бесплатно`;

/**
 * Продаём пакеты уроков, а не месяцы (ТЗ №3). Каталог живёт на API
 * (billing/packages.ts) и приходит фронту через GET /billing/balance;
 * здесь — только цифры для ПУБЛИЧНЫХ страниц, где запроса к API нет.
 * При смене прайса менять в обоих местах.
 */
export interface LandingPackage {
  lessons: number;
  priceKzt: number;
  note: string;
  popular?: boolean;
}
export const LANDING_PACKAGES: readonly LandingPackage[] = [
  { lessons: 10, priceKzt: 3990, note: "закрыть тяжёлые уроки недели" },
  { lessons: 30, priceKzt: 9990, note: "1–2 готовых урока в учебный день", popular: true },
  { lessons: 64, priceKzt: 19990, note: "полная месячная норма" },
  { lessons: 128, priceKzt: 38990, note: "два месяца под ключ" },
];

/** Срок, в течение которого удалённый аккаунт можно восстановить (календарные дни). */
export const ACCOUNT_RESTORE_DAYS = 14;

/** Срок хранения платёжных документов — требование налогового законодательства РК. */
export const PAYMENT_DOCS_YEARS = 5;

/** Срок хранения необратимых отпечатков почты/телефона (защита пробного периода). */
export const FINGERPRINT_RETENTION_YEARS = 3;

/** Форматирование цены для витрины: 2990 → «2 990 ₸». */
export function formatTenge(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₸`;
}
