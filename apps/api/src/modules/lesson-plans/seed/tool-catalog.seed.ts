import { StageType } from '../entities/lesson-stage.entity';

export interface ToolSeed {
  toolId: string;
  stageType: StageType;
  nameRu: string;
  nameKz: string;
  nameEn: string;
  isDefault: boolean;
  description: string;
  sortOrder: number;
}

// Arsenal of stage tools (ТЗ раздел 7). `diagram` = Visualizer, `text_adaptation`
// = Text-adapter — они живут ВНУТРИ этапов, а не как отдельные разделы главной.
export const TOOL_CATALOG_SEED: ToolSeed[] = [
  // ── warmup ──────────────────────────────────────────────────────
  { toolId: 'prior_knowledge', stageType: 'warmup', nameRu: 'Активатор прошлых знаний', nameKz: 'Бұрынғы білімді жаңғырту', nameEn: 'Prior knowledge activator', isDefault: true, sortOrder: 1, description: 'Актуализация ранее изученного: короткие вопросы/задания на повторение перед новой темой.' },
  { toolId: 'lead_in', stageType: 'warmup', nameRu: 'Проблемный вход', nameKz: 'Проблемалық кіріспе', nameEn: 'Problem lead-in', isDefault: false, sortOrder: 2, description: 'Проблемный вопрос/ситуация, мотивирующая к теме урока.' },
  { toolId: 'vocab_warmup', stageType: 'warmup', nameRu: 'Словарная разминка', nameKz: 'Сөздік жаттығу', nameEn: 'Vocabulary warm-up', isDefault: false, sortOrder: 3, description: 'Разминка на ключевую лексику темы.' },
  { toolId: 'brainstorm', stageType: 'warmup', nameRu: 'Брейншторм / ассоциации', nameKz: 'Ми шабуылы / ассоциация', nameEn: 'Brainstorm / associations', isDefault: false, sortOrder: 4, description: 'Сбор ассоциаций и идей по теме.' },
  { toolId: 'ai_randomizer', stageType: 'warmup', nameRu: 'AI-рандомайзер групп', nameKz: 'AI топ бөлгіш', nameEn: 'AI group randomizer', isDefault: false, sortOrder: 5, description: 'Деление на группы случайным образом с игровыми названиями.' },
  // ── explanation ─────────────────────────────────────────────────
  { toolId: 'structured', stageType: 'explanation', nameRu: 'Структурированное объяснение', nameKz: 'Құрылымды түсіндіру', nameEn: 'Structured explanation', isDefault: true, sortOrder: 1, description: 'Пошаговое объяснение нового материала с примерами.' },
  { toolId: 'diagram', stageType: 'explanation', nameRu: 'Визуализатор / диаграмма', nameKz: 'Визуализатор / диаграмма', nameEn: 'Visualizer / diagram', isDefault: false, sortOrder: 2, description: 'Объяснение через схему/диаграмму (инструмент Визуализатора).' },
  { toolId: 'analogy', stageType: 'explanation', nameRu: 'Объяснение через пример/аналогию', nameKz: 'Мысал/аналогия арқылы түсіндіру', nameEn: 'Explanation by analogy', isDefault: false, sortOrder: 3, description: 'Объяснение через жизненный пример или аналогию.' },
  // ── task ────────────────────────────────────────────────────────
  { toolId: 'individual', stageType: 'task', nameRu: 'Индивидуальное задание (по уровням)', nameKz: 'Жеке тапсырма (деңгейлік)', nameEn: 'Individual task (by levels)', isDefault: true, sortOrder: 1, description: 'Индивидуальная работа с дифференциацией уровней A/B/C.' },
  { toolId: 'pair', stageType: 'task', nameRu: 'Парная активность / диалог', nameKz: 'Жұптық жұмыс / диалог', nameEn: 'Pair activity / dialogue', isDefault: true, sortOrder: 2, description: 'Работа в парах: диалог, взаимопроверка, ролевая ситуация.' },
  { toolId: 'group', stageType: 'task', nameRu: 'Групповая активность / кейс / игра', nameKz: 'Топтық жұмыс / кейс / ойын', nameEn: 'Group activity / case / game', isDefault: true, sortOrder: 3, description: 'Групповая работа: кейс, проект, обучающая игра.' },
  { toolId: 'text_adaptation', stageType: 'task', nameRu: 'Адаптация текста (дифф-листы)', nameKz: 'Мәтінді бейімдеу (дифф-парақ)', nameEn: 'Text adaptation (diff sheets)', isDefault: false, sortOrder: 4, description: 'Задание на адаптированном тексте по уровню класса (инструмент Адаптации текста).' },
  // ── quiz ────────────────────────────────────────────────────────
  { toolId: 'quiz_generator', stageType: 'quiz', nameRu: 'Генератор квиза', nameKz: 'Квиз генераторы', nameEn: 'Quiz generator', isDefault: true, sortOrder: 1, description: 'Квиз с настраиваемыми типами вопросов по теме урока.' },
  // ── reflection ──────────────────────────────────────────────────
  { toolId: 'self_reflection', stageType: 'reflection', nameRu: 'Саморефлексия', nameKz: 'Өзін-өзі бағалау', nameEn: 'Self-reflection', isDefault: true, sortOrder: 1, description: 'Саморефлексия ученика по итогам урока.' },
  { toolId: 'goal_reflection', stageType: 'reflection', nameRu: 'Рефлексия по целям', nameKz: 'Мақсат бойынша рефлексия', nameEn: 'Goal-based reflection', isDefault: false, sortOrder: 2, description: 'Рефлексия относительно целей урока.' },
  { toolId: 'emotional', stageType: 'reflection', nameRu: 'Эмоциональная (светофор)', nameKz: 'Эмоциялық (бағдаршам)', nameEn: 'Emotional (traffic light)', isDefault: false, sortOrder: 3, description: 'Эмоциональная рефлексия методом «светофор».' },
  { toolId: 'gamified', stageType: 'reflection', nameRu: 'Игровая рефлексия (XP)', nameKz: 'Ойын рефлексиясы (XP)', nameEn: 'Gamified reflection (XP)', isDefault: false, sortOrder: 4, description: 'Игровая рефлексия с очками опыта (XP).' },
];
