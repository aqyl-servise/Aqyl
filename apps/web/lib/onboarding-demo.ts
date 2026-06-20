// TODO: DEMO_GENERATION — это статический демо-генератор КМЖ для онбординга.
// Бэкенд-эндпоинт POST /auth/b2c/onboarding-demo (реальная AI-генерация упрощённого
// КМЖ) пока не реализован — здесь формируется реалистичный пример на клиенте.
// Когда появится эндпоинт, заменить вызовы generateDemoKmzh на запрос к API.

export type DemoKmzhStage = {
  name: string;
  duration: string;
  teacherActivity: string;
  studentActivity: string;
};

export type DemoKmzh = {
  title: string;
  objectives: string[];
  stages: DemoKmzhStage[];
};

export type DemoKmzhInput = {
  subject?: string;
  gradeLevel?: string;
  topic?: string;
  language?: string;
};

// Примеры тем-плейсхолдеров по предмету для поля ввода.
export const TOPIC_PLACEHOLDERS: Record<string, string> = {
  "Математика": "Например: Дроби, 5 класс",
  "Русский язык": "Например: Части речи",
  "Казахский язык": "Например: Етістік (Глагол)",
  "История": "Например: Образование Казахского ханства",
  "Физика": "Например: Закон Ома",
  "Химия": "Например: Периодический закон Менделеева",
  "Биология": "Например: Строение клетки",
  "География": "Например: Климат Казахстана",
  "Английский язык": "Например: Present Simple",
  "Информатика": "Например: Алгоритмы и блок-схемы",
  "Литература": "Например: Творчество Абая",
  "Физкультура": "Например: Баскетбол: ведение мяча",
};

export function topicPlaceholder(subject?: string): string {
  if (subject && TOPIC_PLACEHOLDERS[subject]) return TOPIC_PLACEHOLDERS[subject];
  return "Например: тема вашего урока";
}

/**
 * Формирует реалистичный пример КМЖ (введение + 2 этапа) по выбранным параметрам.
 * Чистый демонстрационный контент — не сохраняется и не претендует на AI-качество.
 */
export function generateDemoKmzh(input: DemoKmzhInput): DemoKmzh {
  const subject = input.subject?.trim() || "Математика";
  const topic = input.topic?.trim() || "Квадратные уравнения";
  const grade = input.gradeLevel?.trim() || "9 класс";

  const title = `${topic} — ${subject}, ${grade}`;

  const objectives = [
    `Объяснить основные понятия по теме «${topic}»`,
    `Сформировать умение применять полученные знания на практике`,
    `Развивать функциональную грамотность и навыки самостоятельной работы`,
  ];

  const stages: DemoKmzhStage[] = [
    {
      name: "Организационный момент. Введение",
      duration: "5 мин",
      teacherActivity:
        `Приветствует учеников, создаёт позитивный настрой. Объявляет тему «${topic}» и цели урока. Проводит актуализацию опорных знаний через короткие вопросы.`,
      studentActivity:
        "Включаются в работу, отвечают на вопросы, формулируют ожидания от урока.",
    },
    {
      name: "Изучение нового материала",
      duration: "20 мин",
      teacherActivity:
        `Объясняет ключевые понятия темы «${topic}», демонстрирует примеры, организует работу в парах. Сопровождает объяснение наглядными материалами.`,
      studentActivity:
        "Слушают, делают записи, разбирают примеры, обсуждают в парах и задают уточняющие вопросы.",
    },
  ];

  return { title, objectives, stages };
}
