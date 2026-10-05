/**
 * Справочник школьных предметов: одно название на языке интерфейса для всех
 * вариантов написания.
 *
 * Предмет вводится в форме урока свободным текстом, и у одного учителя
 * встречались «English», «english», «Английский язык», «английский язык»,
 * «Ағылшын тілі», «ағылшын тілі» — а в казахском интерфейсе карточки
 * показывали «АНГЛИЙСКИЙ ЯЗЫК · 7 СЫНЫП» (замечание методиста, 05.10.2026).
 *
 * Та же таблица — в apps/api/src/modules/lesson-plans/engine/subjects.ts
 * (нормализация при сохранении). Менять обе вместе.
 */
export type SubjectLang = "ru" | "kz" | "en";

interface Subject { ru: string; kz: string; en: string; aliases?: string[] }

const SUBJECTS: Subject[] = [
  { ru: "Математика", kz: "Математика", en: "Mathematics", aliases: ["math", "maths"] },
  { ru: "Алгебра", kz: "Алгебра", en: "Algebra" },
  { ru: "Алгебра и начала анализа", kz: "Алгебра және анализ бастамалары", en: "Algebra and Introduction to Analysis" },
  { ru: "Геометрия", kz: "Геометрия", en: "Geometry" },
  { ru: "Информатика", kz: "Информатика", en: "Computer Science", aliases: ["informatics"] },
  { ru: "Физика", kz: "Физика", en: "Physics" },
  { ru: "Химия", kz: "Химия", en: "Chemistry" },
  { ru: "Биология", kz: "Биология", en: "Biology" },
  { ru: "География", kz: "География", en: "Geography" },
  { ru: "Естествознание", kz: "Жаратылыстану", en: "Natural Science" },
  { ru: "Познание мира", kz: "Дүниетану", en: "World Knowledge" },
  { ru: "История Казахстана", kz: "Қазақстан тарихы", en: "History of Kazakhstan", aliases: ["история казахстан", "история", "тарих", "казахстан тарихы"] },
  { ru: "Всемирная история", kz: "Дүниежүзі тарихы", en: "World History", aliases: ["дүние жүзі тарихы"] },
  { ru: "Казахский язык", kz: "Қазақ тілі", en: "Kazakh Language", aliases: ["казахский", "казак тили", "қазақ тілі мен әдебиеті"] },
  { ru: "Казахская литература", kz: "Қазақ әдебиеті", en: "Kazakh Literature" },
  { ru: "Русский язык", kz: "Орыс тілі", en: "Russian Language", aliases: ["русский"] },
  { ru: "Русская литература", kz: "Орыс әдебиеті", en: "Russian Literature", aliases: ["литература"] },
  { ru: "Литературное чтение", kz: "Әдебиеттік оқу", en: "Literary Reading" },
  { ru: "Английский язык", kz: "Ағылшын тілі", en: "English", aliases: ["английский", "англ", "english language", "ағылшын"] },
  { ru: "Физическая культура", kz: "Дене шынықтыру", en: "Physical Education", aliases: ["физкультура", "денешыныктыру", "дене шыныктыру"] },
  { ru: "Изобразительное искусство", kz: "Бейнелеу өнері", en: "Art" },
  { ru: "Музыка", kz: "Музыка", en: "Music" },
  { ru: "Художественный труд", kz: "Көркем еңбек", en: "Art and Technology", aliases: ["технология", "труд"] },
  { ru: "Самопознание", kz: "Өзін-өзі тану", en: "Self-Knowledge" },
  { ru: "Основы права", kz: "Құқық негіздері", en: "Fundamentals of Law" },
];

/** Ключ сравнения: регистр, ё, двойные и концевые пробелы — не различаются. */
function key(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

const INDEX = new Map<string, Subject>();
for (const s of SUBJECTS) {
  for (const v of [s.ru, s.kz, s.en, ...(s.aliases ?? [])]) INDEX.set(key(v), s);
}

/** Предмет на языке интерфейса; неизвестное название — как ввёл учитель. */
export function subjectLabel(raw: string | null | undefined, lang: SubjectLang): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const hit = INDEX.get(key(s));
  return hit ? hit[lang] : s;
}
