// Prompts for the functional-literacy (PISA) generator (ТЗ раздел 8).

export const SYSTEM_BASE =
  'Ты — эксперт по функциональной грамотности в формате PISA и стандартам МОН РК. ' +
  'Ты создаёшь задания на ПРИМЕНЕНИЕ знаний в реальных жизненных ситуациях, а не на воспроизведение. ' +
  'Отвечай СТРОГО валидным JSON без преамбулы и без markdown-ограждений (```).';

const LANG_NAME: Record<string, string> = { ru: 'русском', kz: 'казахском', en: 'английском' };

export interface StimulusParams {
  literacyType: 'reading' | 'math' | 'science';
  subject?: string;
  grade?: number;
  language: string;
  sourceTopic?: string | null;
  sourceNotes?: string | null;
}

export interface QuestionsParams {
  stimulusText: string;
  stimulusData?: unknown;
  literacyType: 'reading' | 'math' | 'science';
  grade?: number;
  questionCount: number;
  pisaLevels: number[];
  questionTypes: string[];
  language: string;
}

function langLine(lang: string): string {
  return `Язык генерации — ${LANG_NAME[lang] ?? 'русском'}.`;
}

// ── Stimulus (mode B, Sonnet) ────────────────────────────────────
export function stimulusPrompt(p: StimulusParams): { system: string; user: string } {
  const typeHint =
    p.literacyType === 'reading'
      ? 'связный текст (статья / инструкция / объявление / диалог)'
      : p.literacyType === 'math'
        ? 'ситуацию с числовыми данными (таблица, чек, расписание, график)'
        : 'описание явления/опыта с данными наблюдений';
  const dataHint =
    p.literacyType === 'reading'
      ? '"stimulusData": null'
      : '"stimulusData": { "tables": [ { "title": "...", "columns": ["..."], "rows": [["..."]] } ] }  // числовые данные/таблицы';
  return {
    system: SYSTEM_BASE,
    user:
      `Создай СТИМУЛЬНЫЙ МАТЕРИАЛ для задания по функциональной грамотности (${p.literacyType}) — ${typeHint}.\n` +
      `Предмет: ${p.subject ?? '—'}. Класс: ${p.grade ?? '—'} (адаптируй сложность и объём). ${langLine(p.language)}\n` +
      `Тема/контекст: ${p.sourceTopic ?? '—'}. Пожелания: ${p.sourceNotes ?? '—'}.\n\n` +
      `Верни JSON: { "stimulusText": "...", ${dataHint} }`,
  };
}

// ── Analyze own material (mode A, Haiku) ─────────────────────────
export function analyzePrompt(text: string, language: string): { system: string; user: string } {
  return {
    system: SYSTEM_BASE,
    user:
      `Кратко оцени пригодность текста для заданий по функциональной грамотности. ${langLine(language)}\n` +
      `Текст:\n"""${text.slice(0, 6000)}"""\n\n` +
      `Верни JSON: { "topic": "...", "difficulty": "низкая|средняя|высокая", "suitable": true|false, "note": "..." }`,
  };
}

// ── Questions (Sonnet) ───────────────────────────────────────────
export function questionsPrompt(p: QuestionsParams): { system: string; user: string } {
  return {
    system: SYSTEM_BASE,
    user:
      `На основе стимульного материала составь РОВНО ${p.questionCount} вопросов по функциональной грамотности (${p.literacyType}), класс ${p.grade ?? '—'}. ${langLine(p.language)}\n` +
      `Разрешённые типы вопросов: ${p.questionTypes.join(', ')}. Уровни PISA (используй из этого набора): ${p.pisaLevels.join(', ')}.\n` +
      `У КАЖДОГО вопроса ОБЯЗАТЕЛЬНО: "pisaLevel" (1-6), "points" (>0), "correctAnswer" (ключ). Для открытых вопросов (open) добавь "answerCriteria".\n` +
      `Для вопросов с вариантами укажи "options" (массив). Вопросы — на применение, а не на воспроизведение.\n\n` +
      `Стимул:\n"""${p.stimulusText.slice(0, 8000)}"""\n` +
      (p.stimulusData ? `Данные: ${JSON.stringify(p.stimulusData).slice(0, 2000)}\n` : '') +
      `\nВерни JSON: { "questions": [ { "questionText": "...", "questionType": "single|multiple|truefalse|short|open|matching", "pisaLevel": N, "points": N, "options": [...]|null, "correctAnswer": ..., "answerCriteria": "..."|null } ] }`,
  };
}

// ── Regenerate one question (Sonnet) ─────────────────────────────
export function regenQuestionPrompt(p: QuestionsParams): { system: string; user: string } {
  return {
    system: SYSTEM_BASE,
    user:
      `Составь ОДИН новый вопрос по функциональной грамотности (${p.literacyType}), класс ${p.grade ?? '—'}. ${langLine(p.language)}\n` +
      `Типы: ${p.questionTypes.join(', ')}. Уровни PISA: ${p.pisaLevels.join(', ')}. Обязательно pisaLevel, points, correctAnswer; для open — answerCriteria.\n` +
      `Стимул:\n"""${p.stimulusText.slice(0, 8000)}"""\n\n` +
      `Верни JSON ОДНОГО вопроса: { "questionText": "...", "questionType": "...", "pisaLevel": N, "points": N, "options": [...]|null, "correctAnswer": ..., "answerCriteria": "..."|null }`,
  };
}
