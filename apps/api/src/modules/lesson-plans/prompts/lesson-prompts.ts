// System prompts for the КСП generator (ТЗ раздел 10).
// The AI methodology context uses КМЖ/КТЖ/БЖБ/ТЖБ terms (correct in KZ methodology);
// the RU *interface* never shows "КМЖ" — that's a UI-layer concern, not the prompt.

export const SYSTEM_BASE =
  'Ты — опытный методист системы образования Республики Казахстан. ' +
  'Ты составляешь краткосрочные планы урока (КСП/ҚМЖ) по формату приказа №130, ' +
  'владеешь терминологией КМЖ/КТЖ/БЖБ/ТЖБ, формативным и суммативным оцениванием. ' +
  'Отвечай СТРОГО валидным JSON без преамбулы и без markdown-ограждений (```).';

const LANG_NAME: Record<string, string> = { kz: 'казахском', ru: 'русском', en: 'английском' };

/**
 * Требование языка. Раньше в системном промпте стояло «пиши на языке предмета
 * урока» — модель угадывала язык по названию предмета и смешивала три языка в
 * одном документе. Теперь язык приходит явно и требование стоит в каждом
 * вызове, а не один раз в общей части.
 */
function langRule(language?: string): string {
  const name = LANG_NAME[language ?? ''] ?? 'казахском';
  return (
    `ЯЗЫК ОТВЕТА: пиши ИСКЛЮЧИТЕЛЬНО на ${name} языке. ` +
    'Это касается всего текста без исключений: названий этапов, действий учителя и ученика, ' +
    'метода, критериев, дескрипторов и ресурсов. ' +
    'Не вставляй слова и подписи на других языках. ' +
    'Исключение только для формул, химических символов и общепринятых сокращений.'
  );
}

export interface LessonContext {
  subject?: string;
  grade?: number;
  lessonTitle?: string;
  languageFocus?: string | null;
  learningObjectives: string[];
  lessonObjectives: string[];
  language?: string; // ru | kz | en (язык предмета)
}

// ── Lesson objectives (Haiku) — единый список, без most/some/all ──
export function objectivesPrompt(ctx: LessonContext): { system: string; user: string } {
  return {
    system: SYSTEM_BASE,
    user:
      `Составь ЦЕЛИ УРОКА единым списком (3-4 пункта). ` +
      `Без градации most/some/all. Каждая цель измерима и достижима за один урок.\n` +
      // Раньше промпт сам предписывал этот префикс — фраза уходила в документ
      // на всех языках и предметах. Теперь она запрещена явно.
      `ЗАПРЕЩЕНО начинать цель с вводных конструкций: «All learners will be able to», ` +
      `«Все ученики смогут», «Барлық оқушылар ... алады» и любых их вариантов. ` +
      `Каждая цель начинается сразу с результата — с глагола действия.\n` +
      `${langRule(ctx.language)}\n` +
      `Предмет: ${ctx.subject ?? '—'}\nКласс: ${ctx.grade ?? '—'}\nТема: ${ctx.lessonTitle ?? '—'}\n` +
      `Языковая цель: ${ctx.languageFocus ?? '—'}\n` +
      `Цели обучения (коды): ${ctx.learningObjectives.join(', ') || '—'}\n\n` +
      `Верни JSON: {"objectives": ["...", "..."]}. ` +
      // Цель урока — одна строка таблицы, не абзац.
      `Каждая цель — до 15 слов. Без markdown и пояснений вне JSON.`,
  };
}

// Распределение баллов больше не запрашивается у модели: веса этапов считает
// points-engine (proposeWeights). Прежний вызов возвращал предложение, которое
// движок всё равно пересчитывал до суммы 10 — платный вызов за арифметику.

// ── Single stage content (Sonnet) ────────────────────────────────
export function stagePrompt(
  stage: { stageType: string; toolId?: string; timeMinutes: number },
  toolDescription: string,
  ctx: LessonContext,
): { system: string; user: string } {
  return {
    system: SYSTEM_BASE,
    user:
      `Сгенерируй содержание ЭТАПА урока по формату №130.\n` +
      `Этап: ${stage.stageType}, инструмент: ${stage.toolId ?? '—'} (${toolDescription}), время: ${stage.timeMinutes} мин.\n` +
      `Контекст урока — предмет: ${ctx.subject}, класс: ${ctx.grade}, тема: ${ctx.lessonTitle}, ` +
      `цели урока: ${ctx.lessonObjectives.join('; ')}.\n\n` +
      `Верни JSON: {"stageName": "...", "teacherActions": "...", "studentActions": "...", ` +
      `"method": "...", "assessmentCriteria": "...", "resources": "..."}. ` +
      `teacherActions и studentActions — конкретные действия. Разогрев и рефлексия — формативно, без баллов.\n` +
      `${langRule(ctx.language)}\n` +
      // Ограничения длины: это ячейки таблицы КСП, их читают глазами на одном
      // листе. Развёрнутые абзацы там не нужны, а выходные токены — основная
      // статья расхода (примерно 90% стоимости генерации).
      `ОБЪЁМ: stageName — до 4 слов. teacherActions и studentActions — до 30 слов каждое, ` +
      `одним предложением, без вводных и пояснений. method, assessmentCriteria, resources — до 12 слов. ` +
      `Не повторяй тему и класс в тексте — они уже в шапке. Без markdown и пояснений вне JSON.`,
  };
}

// ── Descriptors for an assessed stage (Sonnet) ───────────────────
export function descriptorsPrompt(
  stage: { stageType: string; toolId?: string; teacherActions?: string | null },
  points: number,
  ctx: LessonContext,
): { system: string; user: string } {
  return {
    system: SYSTEM_BASE,
    user:
      `Сгенерируй 2-3 ДЕСКРИПТОРА для оцениваемого задания (этап ${stage.stageType}), ` +
      `сумма баллов дескрипторов = ${points}. Каждый дескриптор — измеримый критерий выполнения.\n` +
      `Задание учителя: ${stage.teacherActions ?? '—'}\nПредмет: ${ctx.subject}, класс: ${ctx.grade}.\n\n` +
      `${langRule(ctx.language)}\n` +
      `Верни JSON: {"descriptors": [{"text": "...", "points": N}]}. Сумма points = ${points}. ` +
      // Дескриптор — короткий проверяемый критерий, а не описание задания.
      `Каждый дескриптор — до 15 слов, начинается с глагола. Без markdown и пояснений вне JSON.`,
  };
}
