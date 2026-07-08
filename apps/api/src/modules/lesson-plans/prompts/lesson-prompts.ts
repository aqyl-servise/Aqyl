// System prompts for the КСП generator (ТЗ раздел 10).
// The AI methodology context uses КМЖ/КТЖ/БЖБ/ТЖБ terms (correct in KZ methodology);
// the RU *interface* never shows "КМЖ" — that's a UI-layer concern, not the prompt.

export const SYSTEM_BASE =
  'Ты — опытный методист системы образования Республики Казахстан. ' +
  'Ты составляешь краткосрочные планы урока (КСП/ҚМЖ) по формату приказа №130 МОН РК, ' +
  'владеешь терминологией КМЖ/КТЖ/БЖБ/ТЖБ, формативным и суммативным оцениванием. ' +
  'Отвечай СТРОГО валидным JSON без преамбулы и без markdown-ограждений (```). ' +
  'Пиши на языке предмета урока.';

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
      `Составь ЦЕЛИ УРОКА единым списком (3-4 пункта), начиная с «All learners will be able to:». ` +
      `Без градации most/some/all. Каждая цель измерима и достижима за один урок.\n` +
      `Предмет: ${ctx.subject ?? '—'}\nКласс: ${ctx.grade ?? '—'}\nТема: ${ctx.lessonTitle ?? '—'}\n` +
      `Языковая цель: ${ctx.languageFocus ?? '—'}\n` +
      `Цели обучения (коды): ${ctx.learningObjectives.join(', ') || '—'}\n\n` +
      `Верни JSON: {"objectives": ["...", "..."]}`,
  };
}

// ── Points distribution across assessed stages (Sonnet) ──────────
export function pointsPrompt(
  assessed: { stageId: string; stageType: string; toolId?: string }[],
  total: number,
): { system: string; user: string } {
  return {
    system: SYSTEM_BASE,
    user:
      `Распредели РОВНО ${total} баллов между оцениваемыми заданиями урока по весу сложности ` +
      `(групповое/сложное — больше, индивидуальное/простое — меньше). У каждого минимум 1 балл.\n` +
      `Задания: ${JSON.stringify(assessed)}\n\n` +
      `Верни JSON: {"points": [{"stageId": "...", "points": N}]}. Сумма points = ${total}.`,
  };
}

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
      `teacherActions и studentActions — конкретные действия. Разогрев и рефлексия — формативно, без баллов.`,
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
      `Верни JSON: {"descriptors": [{"text": "...", "points": N}]}. Сумма points = ${points}.`,
  };
}
