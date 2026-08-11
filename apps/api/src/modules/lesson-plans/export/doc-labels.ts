/**
 * Подписи скачиваемого документа КСП на трёх языках (ТЗ 1.1, дефект 5).
 *
 * Раньше шапка и заголовки столбцов были захардкожены по-английски: казахский
 * план приходил проверяющему с «Teacher name» и «Students' actions» — то же
 * смешение языков, что чинили в багфиксе 1.0 внутри сгенерированного текста,
 * только на уровне шаблона. Язык подписей = `Lesson.language`, а не язык
 * интерфейса: учитель может собирать казахский урок в русском интерфейсе.
 */
export interface DocLabels {
  /** Заголовок документа. */
  docTitle: string;
  // шапка
  shortTermPlan: string;
  unit: string;
  lessonNo: string;
  teacherName: string;
  date: string;
  grade: string;
  presentAbsent: string;
  lessonTitle: string;
  languageFocus: string;
  learningObjectives: string;
  lessonObjectives: string;
  valueLinks: string;
  // таблица хода урока
  plan: string;
  stagesTime: string;
  teacherActions: string;
  studentActions: string;
  assessmentCriteria: string;
  resources: string;
  // внутри ячеек
  method: string;
  descriptor: string;
  total: string;
  points: string;
  min: string;
  // приложения / раздаточные материалы (срез 2)
  appendix: string;       // «Приложение»
  seeAppendix: string;    // «см. Приложение» (в графе «Ресурсы»)
  answersLabel: string;   // «Ключи / ответы»
  studentVersion: string; // «Версия для ученика»
  teacherVersion: string; // «Версия для учителя»
  levelA: string;         // «Уровень A (базовый)»
  levelB: string;         // «Уровень B (средний)»
  levelC: string;         // «Уровень C (продвинутый)»
}

const kz: DocLabels = {
  docTitle: 'Қысқа мерзімді жоспар (ҚМЖ)',
  shortTermPlan: 'Қысқа мерзімді жоспар',
  unit: 'Бөлім',
  lessonNo: 'Сабақ №',
  teacherName: 'Мұғалім аты',
  date: 'Күні',
  grade: 'Сынып',
  presentAbsent: 'Қатысқан / қатыспаған саны',
  lessonTitle: 'Сабақ тақырыбы',
  languageFocus: 'Тілдік мақсат',
  learningObjectives: 'Оқу мақсаттары',
  lessonObjectives: 'Сабақ мақсаттары',
  valueLinks: 'Құндылықтарды дарыту',
  plan: 'Сабақ барысы',
  stagesTime: 'Кезең / Уақыт',
  teacherActions: 'Мұғалімнің әрекеті',
  studentActions: 'Оқушының әрекеті',
  assessmentCriteria: 'Бағалау критерийлері',
  resources: 'Ресурстар',
  method: 'Әдіс',
  descriptor: 'Дескриптор',
  total: 'Барлығы',
  points: 'ұпай',
  min: 'мин',
  appendix: 'Қосымша',
  seeAppendix: 'қараңыз: Қосымша',
  answersLabel: 'Кілттер / жауаптар',
  studentVersion: 'Оқушыға арналған нұсқа',
  teacherVersion: 'Мұғалімге арналған нұсқа',
  levelA: 'A деңгейі (бастапқы)',
  levelB: 'B деңгейі (орта)',
  levelC: 'C деңгейі (жоғары)',
};

const ru: DocLabels = {
  docTitle: 'Краткосрочный план урока (КСП)',
  shortTermPlan: 'Краткосрочный план',
  unit: 'Раздел',
  lessonNo: 'Урок №',
  teacherName: 'Имя учителя',
  date: 'Дата',
  grade: 'Класс',
  presentAbsent: 'Количество присутствующих / отсутствующих',
  lessonTitle: 'Тема урока',
  languageFocus: 'Языковая цель',
  learningObjectives: 'Цели обучения',
  lessonObjectives: 'Цели урока',
  valueLinks: 'Привитие ценностей',
  plan: 'Ход урока',
  stagesTime: 'Этап / Время',
  teacherActions: 'Действия учителя',
  studentActions: 'Действия обучающегося',
  assessmentCriteria: 'Критерии оценивания',
  resources: 'Ресурсы',
  method: 'Метод',
  descriptor: 'Дескриптор',
  total: 'Всего',
  points: 'баллов',
  min: 'мин',
  appendix: 'Приложение',
  seeAppendix: 'см. Приложение',
  answersLabel: 'Ключи / ответы',
  studentVersion: 'Версия для ученика',
  teacherVersion: 'Версия для учителя',
  levelA: 'Уровень A (базовый)',
  levelB: 'Уровень B (средний)',
  levelC: 'Уровень C (продвинутый)',
};

const en: DocLabels = {
  docTitle: 'Short-term plan',
  shortTermPlan: 'Short term plan',
  unit: 'Unit',
  lessonNo: 'Lesson №',
  teacherName: 'Teacher name',
  date: 'Date',
  grade: 'Grade',
  presentAbsent: 'Number present / absent',
  lessonTitle: 'Lesson title',
  languageFocus: 'Language focus',
  learningObjectives: 'Learning objectives',
  lessonObjectives: 'Lesson objectives',
  valueLinks: 'Value links',
  plan: 'Plan',
  stagesTime: 'Stages / Time',
  teacherActions: "Teachers' actions",
  studentActions: "Students' actions",
  assessmentCriteria: 'Assessment criteria',
  resources: 'Resources',
  method: 'Method',
  descriptor: 'Descriptor',
  total: 'Total',
  points: 'points',
  min: 'min',
  appendix: 'Appendix',
  seeAppendix: 'see Appendix',
  answersLabel: 'Answer key',
  studentVersion: 'Student version',
  teacherVersion: 'Teacher version',
  levelA: 'Level A (basic)',
  levelB: 'Level B (intermediate)',
  levelC: 'Level C (advanced)',
};

const BY_LANG: Record<string, DocLabels> = { kz, ru, en };

/** Подписи документа по языку урока. Неизвестный язык → казахский. */
export function docLabels(language?: string | null): DocLabels {
  return BY_LANG[language ?? ''] ?? kz;
}
