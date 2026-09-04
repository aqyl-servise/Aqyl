export const AI_MODELS = {
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-haiku-4-5-20251001',
} as const;

export const ACTION_MODEL_MAP: Record<string, keyof typeof AI_MODELS> = {
  kmzh_generate: 'SONNET',
  kmzh_objectives: 'HAIKU',
  presentation_generate: 'SONNET',
  task_generate: 'HAIKU',
  analysis_class: 'HAIKU',
  assistant_chat: 'HAIKU',
  open_lesson_analysis: 'HAIKU',
  fl_task_generate: 'HAIKU',
  rating_analysis: 'HAIKU',
  visualizer_classify: 'HAIKU',
  visualizer_generate: 'SONNET',
  text_adapter_generate: 'SONNET',
  text_adapter_translate: 'SONNET',
  // Квиз (ТЗ 3.0): вопросы с вариантами — Sonnet, Haiku путает правильный ответ.
  quiz_generate: 'SONNET',
  // Паспорт урока (ТЗ 1.6): формулировки целей программы — Sonnet, точность важнее цены.
  lesson_core: 'SONNET',
  // Лист фактов (ТЗ 1.6): даты и трактовки — только Sonnet, Haiku их выдумывает.
  lesson_facts: 'SONNET',
  lesson_objectives: 'HAIKU',
  lesson_value_link: 'HAIKU',
  lesson_stage: 'SONNET',
  lesson_descriptors: 'SONNET',
  // Уровневые: четыре набора сразу, потолок втрое выше обычного.
  lesson_descriptors_leveled: 'SONNET',
  // Раздаточные листы (срез 2): задания — Sonnet (качество, объём A/B/C),
  // простые (разминка/объяснение/квиз/рефлексия) — Haiku втрое дешевле (ТЗ 1.2).
  lesson_handout: 'SONNET',
  lesson_handout_light: 'HAIKU',
  // Точечная перегенерация блока оценивания (ТЗ 1.5.2): чинит арифметику
  // шкалы/дескрипторов по списку конкретных нарушений. Sonnet: Haiku эти же
  // числа и перепутал при генерации листа.
  lesson_scoring_fix: 'SONNET',
  literacy_stimulus: 'SONNET',
  literacy_analyze: 'HAIKU',
  literacy_questions: 'SONNET',
  literacy_regen_question: 'SONNET',
};

export const MAX_TOKENS_MAP: Record<string, number> = {
  lesson_core: 1200,
  lesson_facts: 2500,
  kmzh_generate: 2000,
  kmzh_objectives: 300,
  presentation_generate: 3000, // все слайды одним вызовом (ТЗ 2.0)
  task_generate: 800,
  analysis_class: 600,
  assistant_chat: 400,
  open_lesson_analysis: 800,
  fl_task_generate: 800,
  rating_analysis: 500,
  visualizer_classify: 20,
  visualizer_generate: 2000,
  text_adapter_generate: 2000,
  text_adapter_translate: 2000,
  // Квиз: до 15 вопросов по 4 варианта. Потолок с запасом, платим за факт.
  quiz_generate: 2500,
  // Лимиты выставлены с запасом к ограничениям объёма в самих промптах
  // («teacherActions — до 30 слов» и т.п.). Это потолок, а не плата: платим за
  // фактический выход. Потолок нужен, чтобы одна аномальная генерация не
  // съела бюджет и не обрезалась посреди JSON.
  lesson_objectives: 400,
  lesson_value_link: 250, // 1–2 предложения, до 45 слов
  lesson_stage: 700, // было 1200 — с ограничением объёма столько не нужно
  lesson_descriptors: 350, // было 500
  lesson_descriptors_leveled: 1500,
  // Раздаточный лист. Потолок 2600 обрывал казахский A/B/C и парную работу
  // (JSON рвался на полуслове → пустой лист, ТЗ 1.2 дефект 1). Казахский
  // токеномкий, поэтому запас большой; платим за фактический выход, не за
  // потолок. Лёгкие листы на Haiku — отдельный, меньший лимит.
  lesson_handout: 5000,
  lesson_handout_light: 2600,
  lesson_scoring_fix: 1200, // только criteria + scoring, без текста задания

  literacy_stimulus: 900, // было 1500 — стимул ограничен 250 словами
  literacy_analyze: 400,
  literacy_questions: 2200, // было 3000
  literacy_regen_question: 500, // было 800
};

export function getModelForAction(action: string): string {
  const key = ACTION_MODEL_MAP[action] ?? 'HAIKU';
  return AI_MODELS[key];
}

export function getMaxTokensForAction(action: string): number {
  return MAX_TOKENS_MAP[action] ?? 500;
}
