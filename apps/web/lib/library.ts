/**
 * Библиотека примеров планов — данные для публичных страниц /plans.
 * Читается на сервере Next (страницы — серверные компоненты), кэш 10 минут:
 * опубликованный пример появляется на сайте в пределах этого срока.
 */
export interface ExampleListItem {
  slug: string; lang: "ru" | "kz"; subject: string; grade: number; topic: string; publishedAt: string | null;
}

export interface ExamplePlan {
  durationMinutes: number | null;
  curriculum: Array<{ code: string; text: string }>;
  lessonObjectives: string[];
  valueLink: string | null;
  homework: string | null;
  stages: Array<{
    stageName: string; timeMinutes: number;
    teacherActions: string; studentActions: string;
    assessmentCriteria: string; method: string; resources: string;
    points: number | null;
    descriptors: Array<{ text: string; points: number }>;
  }>;
}

export interface ExamplePage extends ExampleListItem {
  plan: ExamplePlan | null;
}

export const SITE = "https://aqyl-service.kz";
const REVALIDATE = 600;

function apiBase(): string {
  // На проде API на той же машине — напрямую, мимо nginx и его лимита запросов.
  if (process.env.API_INTERNAL_URL) return process.env.API_INTERNAL_URL;
  if (process.env.NODE_ENV === "production") return "http://127.0.0.1:4000";
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function fetchExamples(): Promise<ExampleListItem[]> {
  try {
    const res = await fetch(`${apiBase()}/library/examples`, { next: { revalidate: REVALIDATE } });
    return res.ok ? ((await res.json()) as ExampleListItem[]) : [];
  } catch {
    return [];
  }
}

export async function fetchExample(slug: string): Promise<ExamplePage | null> {
  try {
    const res = await fetch(`${apiBase()}/library/examples/${encodeURIComponent(slug)}`, { next: { revalidate: REVALIDATE } });
    return res.ok ? ((await res.json()) as ExamplePage) : null;
  } catch {
    return null;
  }
}

/** Подписи страницы на языке примера — по утверждённой таблице терминов. */
export function labels(lang: "ru" | "kz") {
  return lang === "kz"
    ? {
        kind: "ҚМЖ", docTitle: "Қысқа мерзімді сабақ жоспары", grade: "сынып", minutes: "мин",
        subject: "Пән", gradeLabel: "Сынып", topic: "Сабақ тақырыбы", duration: "Ұзақтығы",
        curriculum: "Оқу мақсаттары", goals: "Сабақ мақсаттары", value: "Құндылықтар",
        course: "Сабақ барысы", stage: "Кезең / уақыт", teacher: "Мұғалімнің әрекеті", student: "Оқушының әрекеті",
        criteria: "Бағалау", resources: "Ресурстар", method: "Әдіс", points: "балл", total: "Барлығы",
        descriptors: "Дескрипторлар", homework: "Үй тапсырмасы",
        ctaTitle: "Өз тақырыбыңыз бойынша осындай жоспар — 30 секундта",
        ctaText: "№ 130 бұйрық нысаны бойынша, Word-қа жүктеледі. 5 сабақ тегін, картасыз.",
        ctaBtn: "Тегін бастау →",
        note: "Жоспарды Aqyl жасаған. Мысал ретінде жарияланған: сабаққа дейін сыныбыңызға бейімдеп, тексеріп алыңыз.",
        back: "Барлық мысалдар",
      }
    : {
        kind: "КСП", docTitle: "Краткосрочный план урока", grade: "класс", minutes: "мин",
        subject: "Предмет", gradeLabel: "Класс", topic: "Тема урока", duration: "Длительность",
        curriculum: "Цели обучения", goals: "Цели урока", value: "Ценности",
        course: "Ход урока", stage: "Этап / время", teacher: "Действия учителя", student: "Действия учащихся",
        criteria: "Оценивание", resources: "Ресурсы", method: "Метод", points: "балл.", total: "Итого",
        descriptors: "Дескрипторы", homework: "Домашнее задание",
        ctaTitle: "Такой план по вашей теме — за 30 секунд",
        ctaText: "По форме приказа № 130, скачивается в Word. 5 уроков бесплатно, без карты.",
        ctaBtn: "Начать бесплатно →",
        note: "План создан в Aqyl и опубликован как пример: перед уроком адаптируйте его под свой класс и проверьте.",
        back: "Все примеры",
      };
}

/** Урок по ссылке «Поделиться» (/s/<token>). */
export interface SharedPage {
  lang: "ru" | "kz";
  subject: string;
  grade: number | null;
  topic: string;
  /** Код приглашения автора: регистрация по кнопке засчитывается ему. */
  ref: string | null;
  plan: ExamplePlan;
}

export async function fetchShared(token: string): Promise<SharedPage | null> {
  try {
    // Без кэша: ссылку могут отозвать, а счётчик просмотров должен считать каждый.
    const res = await fetch(`${apiBase()}/share/${encodeURIComponent(token)}`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as SharedPage) : null;
  } catch {
    return null;
  }
}