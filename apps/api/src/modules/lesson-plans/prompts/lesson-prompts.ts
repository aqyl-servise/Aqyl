// System prompts for the КСП generator (ТЗ раздел 10).
// The AI methodology context uses КМЖ/КТЖ/БЖБ/ТЖБ terms (correct in KZ methodology);
// the RU *interface* never shows "КМЖ" — that's a UI-layer concern, not the prompt.

export const SYSTEM_BASE =
  'Ты — опытный методист системы образования Республики Казахстан. ' +
  'Ты составляешь краткосрочные планы урока (КСП/ҚМЖ) по формату приказа №130, ' +
  'владеешь терминологией КМЖ/КТЖ/БЖБ/ТЖБ, формативным и суммативным оцениванием. ' +
  'Отвечай СТРОГО валидным JSON без преамбулы и без markdown-ограждений (```).';

import { kazakhTermsBlock } from './term-glossary';
import { parseAllObjectiveElements } from '../engine/objective-elements';

const LANG_NAME: Record<string, string> = { kz: 'казахском', ru: 'русском', en: 'английском' };

/**
 * Требование языка. Раньше в системном промпте стояло «пиши на языке предмета
 * урока» — модель угадывала язык по названию предмета и смешивала три языка в
 * одном документе. Теперь язык приходит явно и требование стоит в каждом
 * вызове, а не один раз в общей части.
 */
function langRule(language?: string, subject?: string | null): string {
  const name = LANG_NAME[language ?? ''] ?? 'казахском';
  const base =
    `ЯЗЫК ОТВЕТА: пиши ИСКЛЮЧИТЕЛЬНО на ${name} языке. ` +
    'Это касается всего текста без исключений: названий этапов, действий учителя и ученика, ' +
    'метода, критериев, дескрипторов и ресурсов. ' +
    'Не вставляй слова и подписи на других языках. ' +
    'Исключение только для формул, химических символов и общепринятых сокращений.';
  // Чистка казахской терминологии (ТЗ 1.5.1, B.1 + глоссарий B.2 по предмету).
  const terms = kazakhTermsBlock(language, subject);
  return terms ? `${base}\n${terms}` : base;
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

/**
 * Наклонение глагола в цели урока.
 *
 * Модель по умолчанию пишет цель командой («анықта», «определи», «identify»),
 * потому что цели обучения в программе формулируются от инфинитива. В КСП цель
 * описывает результат — что ученик ДЕЛАЕТ. Формулировка требования одинаково
 * важна на всех трёх языках, но примеры нужны на языке урока: без них модель
 * переносит русскую форму в казахский текст.
 */
const MOOD_RULE: Record<string, string> = {
  kz:
    'ФОРМА ГЛАГОЛА: каждая цель — действие ученика в 3-м лице настояще-будущего времени ' +
    '(что ученик делает), НЕ повелительное наклонение. ' +
    'Глагол оканчивается на -ады/-еді/-йды/-йді. ' +
    'ПРАВИЛЬНО: «...белсенділігін анықтайды», «...процесін сипаттайды», «...қорытынды жасайды». ' +
    'НЕПРАВИЛЬНО (команда, запрещено): «...анықта», «...сипатта», «...жаса», «...салыстыр».',
  ru:
    'ФОРМА ГЛАГОЛА: каждая цель — действие ученика в 3-м лице настоящего времени ' +
    '(что ученик делает), НЕ повелительное наклонение и НЕ инфинитив. ' +
    'ПРАВИЛЬНО: «определяет активность металлов», «описывает процесс», «делает вывод». ' +
    'НЕПРАВИЛЬНО (команда, запрещено): «определи», «опиши», «сделай вывод».',
  en:
    'ФОРМА ГЛАГОЛА: каждая цель — действие ученика в 3-м лице единственного числа ' +
    '(что ученик делает), НЕ повелительное наклонение и НЕ инфинитив. ' +
    'ПРАВИЛЬНО: «identifies the activity of metals», «describes the process», «draws a conclusion». ' +
    'НЕПРАВИЛЬНО (команда, запрещено): «identify», «describe», «draw a conclusion».',
};

function moodRule(language?: string): string {
  return MOOD_RULE[language ?? ''] ?? MOOD_RULE.kz;
}

// ── Lesson objectives (Haiku) — единый список, без most/some/all ──
export function objectivesPrompt(
  ctx: LessonContext,
  // Цели с нарушенным наклонением из предыдущей попытки. Показать модели её
  // собственную ошибку дешевле и надёжнее, чем повторять общее требование:
  // с одним и тем же промптом она чаще всего возвращает тот же результат.
  imperativeSamples: string[] = [],
): { system: string; user: string } {
  const correction = imperativeSamples.length
    ? `\nПРЕДЫДУЩАЯ ПОПЫТКА ОТКЛОНЕНА: эти цели написаны в повелительном наклонении — ` +
      `${imperativeSamples.map((s) => `«${s}»`).join(', ')}. ` +
      `Переформулируй их в форме действия ученика и проверь каждую цель перед ответом.\n`
    : '';

  // Целевые элементы цели обучения (ТЗ, задача 3). Здесь и терялись «unless»
  // и «if only»: цель 8.6.17.1 перечисляет три конструкции, а цели урока
  // разворачивались только вокруг первой, и дальше по цепочке их уже никто не
  // возвращал. Перечисление извлекается правилами, не моделью.
  const elements = parseAllObjectiveElements(ctx.learningObjectives);
  const elementsRule = elements.length
    ? `ОБЯЗАТЕЛЬНОЕ ПОКРЫТИЕ: цель обучения перечисляет ${elements.map((e) => `«${e}»`).join(', ')}. ` +
      `Каждый элемент должен быть отражён минимум в одной цели урока — не сводись к первому из списка.\n`
    : '';

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
      `${moodRule(ctx.language)}\n` +
      elementsRule +
      correction +
      `${langRule(ctx.language, ctx.subject)}\n` +
      `Предмет: ${ctx.subject ?? '—'}\nКласс: ${ctx.grade ?? '—'}\nТема: ${ctx.lessonTitle ?? '—'}\n` +
      `Языковая цель: ${ctx.languageFocus ?? '—'}\n` +
      `Цели обучения (коды): ${ctx.learningObjectives.join(', ') || '—'}\n\n` +
      // Дефект 4 (ТЗ 1.2): модель роняла букву («ттекпен» вместо «оттекпен»).
      `Соблюдай орфографию языка урока: проверь каждое слово, не пропускай и не задваивай буквы.\n` +
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
  // Привязка этапа к ценности месяца (ТЗ 1.2, дефект 3). Если задано — ценность
  // вплетается в содержание ЭТОГО этапа, синхронно с раздаточным листом.
  opts?: { linkedToValue?: boolean; valueName?: string | null },
): { system: string; user: string } {
  // Описание инструмента в каталоге служебное и на русском. Модель копировала
  // его в method даже в казахском уроке («Пошаговое объяснение») — дефект 2.
  const methodRule =
    'ПОЛЕ method — назови метод СТРОГО на языке урока. Описание инструмента выше — ' +
    'служебная подсказка, возможно на другом языке; НЕ копируй её дословно, сформулируй сам.';

  const valueRule =
    opts?.linkedToValue && opts.valueName
      ? `ЦЕННОСТЬ: этот этап привязан к ценности «${opts.valueName}». Покажи в действиях ` +
        `учителя/ученика, как активность этапа работает на эту ценность — на языке урока, органично.\n`
      : '';

  return {
    system: SYSTEM_BASE,
    user:
      `Сгенерируй содержание ЭТАПА урока по формату №130.\n` +
      `Этап: ${stage.stageType}, инструмент: ${stage.toolId ?? '—'} (${toolDescription}), время: ${stage.timeMinutes} мин.\n` +
      `Контекст урока — предмет: ${ctx.subject}, класс: ${ctx.grade}, тема: ${ctx.lessonTitle}, ` +
      `цели урока: ${ctx.lessonObjectives.join('; ')}.\n\n` +
      valueRule +
      `Верни JSON: {"stageName": "...", "teacherActions": "...", "studentActions": "...", ` +
      `"method": "...", "assessmentCriteria": "...", "resources": "..."}. ` +
      `teacherActions и studentActions — конкретные действия. Разогрев и рефлексия — формативно, без баллов.\n` +
      `${langRule(ctx.language, ctx.subject)}\n` +
      `${methodRule}\n` +
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
      `${langRule(ctx.language, ctx.subject)}\n` +
      `Верни JSON: {"descriptors": [{"text": "...", "points": N}]}. Сумма points = ${points}. ` +
      // Дескриптор — короткий проверяемый критерий, а не описание задания.
      `Каждый дескриптор — до 15 слов, начинается с глагола. Без markdown и пояснений вне JSON.`,
  };
}

/**
 * Дескрипторы ПО ФАКТИЧЕСКОМУ ЗАДАНИЮ (ТЗ, задача 2).
 *
 * Отличие от descriptorsPrompt: тот пишет критерии по описанию этапа — до
 * того, как задание существует, — и потому выдавал «Completes all three
 * sections» там, где секций три нет. Здесь на входе полный текст готового
 * листа, и дескриптор обязан описывать именно его.
 *
 * `problems` — расхождения, найденные кодовой проверкой на прошлой попытке.
 * Показать модели её собственную ошибку надёжнее, чем повторить общее
 * требование: с тем же промптом она чаще всего вернёт тот же результат.
 */
export function descriptorsFromTaskPrompt(
  stage: { stageType: string; toolId?: string | null },
  points: number,
  taskText: string,
  ctx: LessonContext,
  problems: string[] = [],
  // Число пронумерованных заданий в приложении (ТЗ №2, задача 3): дескриптор
  // обязан покрыть каждое. Если заданий больше пунктов — объединять близкие.
  taskCount = 0,
): { system: string; user: string } {
  const correction = problems.length
    ? `\nПРЕДЫДУЩАЯ ПОПЫТКА ОТКЛОНЕНА автоматической проверкой:\n` +
      problems.map((p) => `— ${p}`).join('\n') +
      `\nИсправь это: описывай ровно то, что есть в задании ниже.\n`
    : '';

  const coverageRule = taskCount > 1
    ? `ПОКРЫТИЕ: в задании ${taskCount} пронумерованных подзаданий — КАЖДОЕ должно ` +
      `быть отражено хотя бы в одном пункте дескриптора. Если подзаданий больше, ` +
      `чем пунктов, объединяй близкие в один пункт (не отбрасывай), напр. ` +
      `«Produces one 'wish' clause and one relative clause with 'why' (2)».\n`
    : '';

  return {
    system: SYSTEM_BASE,
    user:
      `Сгенерируй 2-3 ДЕСКРИПТОРА для оцениваемого задания (этап ${stage.stageType}), ` +
      `сумма баллов = ${points}.\n\n` +
      `ТЕКСТ ГОТОВОГО ЗАДАНИЯ (дескрипторы должны описывать ИМЕННО ЕГО):\n"""\n${taskText}\n"""\n\n` +
      `Предмет: ${ctx.subject ?? '—'}, класс: ${ctx.grade ?? '—'}, тема: ${ctx.lessonTitle ?? '—'}.\n` +
      `Цели урока: ${ctx.lessonObjectives.join('; ') || '—'}\n` +
      correction +
      coverageRule +
      `ЗАПРЕЩЕНО:\n` +
      `— упоминать текст/мәтін для чтения, если его в задании нет;\n` +
      `— называть количество частей, которого в задании нет («all three sections» при двух);\n` +
      `— называть грамматические конструкции и понятия, которых нет в теме урока и в задании ` +
      `(например «first conditional», если урок про second conditional).\n` +
      `${langRule(ctx.language, ctx.subject)}\n` +
      `Верни JSON: {"descriptors": [{"text": "...", "points": N}]}. Сумма points = ${points}. ` +
      `Каждый дескриптор — до 15 слов, начинается с глагола, проверяем по работе ученика. ` +
      `Без markdown и пояснений вне JSON.`,
  };
}

/**
 * Дескрипторы уровневого задания: отдельно для A, B, C + обобщённый (ТЗ №2,
 * задача 2). На карточках раньше стоял один агрегированный дескриптор на все
 * три уровня, из-за чего пункт про уровень B оценивался у ученика уровня A.
 *
 * Один вызов на все уровни: дешевле и держит формулировки согласованными.
 * `problems` — расхождения кодовой проверки на прошлой попытке, по уровням.
 */
export function leveledDescriptorsPrompt(
  levels: { A: string; B: string; C: string },
  points: number,
  ctx: LessonContext,
  problems: string[] = [],
): { system: string; user: string } {
  const correction = problems.length
    ? `\nПРЕДЫДУЩАЯ ПОПЫТКА ОТКЛОНЕНА автоматической проверкой:\n` +
      problems.map((p) => `— ${p}`).join('\n') +
      `\nИсправь: каждый дескриптор описывает ТОЛЬКО задание своего уровня.\n`
    : '';

  return {
    system: SYSTEM_BASE,
    user:
      `Уровневое задание с тремя карточками A, B, C. Для КАЖДОЙ карточки дай ` +
      `2-3 дескриптора, сумма баллов каждой карточки = ${points}. Плюс один ` +
      `ОБОБЩЁННЫЙ дескриптор на весь этап (для плана урока), тоже сумма = ${points}.\n\n` +
      `КАРТОЧКА A:\n"""\n${levels.A}\n"""\n\n` +
      `КАРТОЧКА B:\n"""\n${levels.B}\n"""\n\n` +
      `КАРТОЧКА C:\n"""\n${levels.C}\n"""\n\n` +
      `Предмет: ${ctx.subject ?? '—'}, класс: ${ctx.grade ?? '—'}, тема: ${ctx.lessonTitle ?? '—'}.\n` +
      correction +
      `ПРАВИЛА:\n` +
      `— дескриптор уровня описывает ТОЛЬКО задание СВОЕЙ карточки: её номера ` +
      `заданий, число пунктов, названные конструкции, объём текста;\n` +
      `— ЗАПРЕЩЕНО ссылаться на задание другого уровня;\n` +
      `— ЗАПРЕЩЕНЫ обобщения без привязки к содержанию («uses accurate grammar ` +
      `appropriate to the level»);\n` +
      `— не упоминай текст/мәтін для чтения, если на карточке его нет;\n` +
      `— обобщённый дескриптор — общая формулировка того, что проверяется на этапе.\n` +
      `${langRule(ctx.language, ctx.subject)}\n` +
      `Верни JSON: {"A":[{"text":"...","points":N}],"B":[...],"C":[...],"general":[...]}. ` +
      `Каждый пункт — до 15 слов, начинается с глагола. Суммы: A=B=C=general=${points}. ` +
      `Без markdown и пояснений вне JSON.`,
  };
}

/**
 * Раскрытие ценности программы «Адал азамат» применительно к уроку (Haiku).
 *
 * В документе ценность стояла одним словом («Патриотизм»), что для проверяющего
 * равнозначно её отсутствию: непонятно, как именно она реализуется на уроке.
 * Запрашиваем 1–2 предложения, привязанные к теме и содержанию.
 */
export function valueLinkPrompt(valueName: string, ctx: LessonContext): { system: string; user: string } {
  return {
    system: SYSTEM_BASE,
    user:
      `Ценность воспитательной программы: «${valueName}».\n` +
      `Предмет: ${ctx.subject ?? '—'}, класс: ${ctx.grade ?? '—'}, тема урока: ${ctx.lessonTitle ?? '—'}.\n` +
      `Цели урока: ${ctx.lessonObjectives.join('; ') || '—'}\n\n` +
      `Напиши 1–2 предложения о том, КАК ИМЕННО эта ценность реализуется на данном уроке — ` +
      `через содержание темы и деятельность учеников. Не пересказывай определение ценности ` +
      `и не пиши общих фраз, применимых к любому уроку.\n` +
      `${langRule(ctx.language, ctx.subject)}\n` +
      `Начни с названия ценности и двоеточия. До 45 слов.\n` +
      `Верни JSON: {"valueLink": "..."}. Без markdown и пояснений вне JSON.`,
  };
}

/**
 * LessonCore (ТЗ 1.6, этап 2): один вызов до остальных модулей — полные
 * формулировки целей обучения по кодам, 3–4 цели урока, раскрытие ценности.
 * Дальше модули это только читают.
 */
export function lessonCorePrompt(
  ctx: LessonContext,
  valueName: string | null,
): { system: string; user: string } {
  const lang = ctx.language === 'ru' ? 'русском' : ctx.language === 'en' ? 'английском' : 'казахском';
  const system =
    `Ты — методист школы Казахстана. Отвечай СТРОГО валидным JSON без пояснений, ` +
    `все тексты — на ${lang} языке.\n` +
    `Формат: {"curriculum":[{"code":"11.1.2.1","text":"полная формулировка цели обучения из типовой программы"}],` +
    `"lessonObjectives":["3-4 цели урока, глагол в изъявительном наклонении (оқушы ... анықтайды)"],` +
    `"valueRationale":"1-2 предложения, как ценность раскрывается на этом уроке"}\n` +
    `Требования: text каждой цели — полная формулировка по коду из типовой учебной программы МОН РК, ` +
    `НЕ повторение кода и НЕ пустая строка. Если точная формулировка неизвестна — восстанови её по ` +
    `структуре кода и теме максимально близко к программе. lessonObjectives выводятся из curriculum и темы.`;
  const user =
    `Предмет: ${ctx.subject}. Класс: ${ctx.grade}. Тема: «${ctx.lessonTitle}». ` +
    (ctx.languageFocus ? `Языковая цель: ${ctx.languageFocus}. ` : '') +
    `Коды целей обучения: ${ctx.learningObjectives.join(', ')}.` +
    (valueName ? ` Ценность месяца: «${valueName}».` : ' Ценность месяца не задана: valueRationale верни пустой строкой.');
  return { system, user };
}

/**
 * Лист фактов урока (ТЗ 1.6, этап 3): даты, места, названия организаций и
 * трактовка изучаемого произведения — ОДИН раз до генерации контента.
 * Дальше все модули только читают, собственных фактов не придумывают.
 */
export function factSheetPrompt(ctx: LessonContext): { system: string; user: string } {
  const lang = ctx.language === 'ru' ? 'русском' : ctx.language === 'en' ? 'английском' : 'казахском';
  const system =
    `Ты — предметный эксперт и методист. Отвечай СТРОГО валидным JSON, тексты — на ${lang} языке.\n` +
    `Формат: {"facts":[{"entity":"кто/что","attribute":"какой признак","value":"краткое значение",` +
    `"claim":"полное предложение с фактом","confidence":"high|medium|low"}],` +
    `"workInterpretation":{"title":"","year":"","mainTheme":"","centralImage":"","keyDevices":[""]}}\n` +
    `ЧЕСТНОСТЬ ВАЖНЕЕ ПОЛНОТЫ. Если не уверен в значении — ставь confidence "low" и НЕ выдумывай ` +
    `правдоподобное. Лучше пустой список, чем вымышленный факт: по этим данным дети получают оценки.\n` +
    `Включай только факты, нужные для этого урока: даты жизни и ключевые события автора, места, ` +
    `названия организаций и произведений, год создания.\n` +
    `workInterpretation заполняй ТОЛЬКО для литературы и искусства (иначе null): mainTheme — одна ` +
    `формулировка главной темы произведения, centralImage — одна трактовка ключевого образа. ` +
    `Они станут единственной допустимой трактовкой во всех материалах урока.`;
  const user =
    `Предмет: ${ctx.subject}. Класс: ${ctx.grade}. Тема урока: «${ctx.lessonTitle}».` +
    (ctx.learningObjectives?.length ? ` Цели обучения: ${ctx.learningObjectives.join(', ')}.` : '');
  return { system, user };
}

/**
 * Схема листа фактов. Структурированный вывод, а не текстовый JSON: при
 * лимите токенов текстовый ответ обрывался на середине и парсер возвращал
 * null — лист фактов приходил пустым (та же причина, что у пустых раздаток).
 */
export const FACT_SHEET_TOOL = {
  name: 'emit_facts',
  description: 'Вернуть проверенные факты урока и трактовку изучаемого произведения.',
  input_schema: {
    type: 'object',
    properties: {
      facts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            entity: { type: 'string' },
            attribute: { type: 'string' },
            value: { type: 'string' },
            claim: { type: 'string' },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['entity', 'attribute', 'value', 'confidence'],
        },
      },
      workInterpretation: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          year: { type: 'string' },
          mainTheme: { type: 'string' },
          centralImage: { type: 'string' },
          keyDevices: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    required: ['facts'],
  },
};

/**
 * Схема уровневых дескрипторов (ТЗ 1.6, этап 4). Структурированный вывод:
 * четыре набора (A/B/C + обобщённый) не помещались в текстовый ответ при
 * лимите токенов, парсер возвращал null, и лист молча оставался со старыми
 * дескрипторами — включая совпадение уровней, ради которого правило и писалось.
 */
export const LEVELED_DESCRIPTORS_TOOL = {
  name: 'emit_leveled_descriptors',
  description: 'Вернуть дескрипторы по уровням A/B/C и обобщённый набор для КМЖ.',
  input_schema: {
    type: 'object',
    properties: {
      A: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, points: { type: 'number' } }, required: ['text', 'points'] } },
      B: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, points: { type: 'number' } }, required: ['text', 'points'] } },
      C: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, points: { type: 'number' } }, required: ['text', 'points'] } },
      general: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, points: { type: 'number' } }, required: ['text', 'points'] } },
    },
    required: ['A', 'B', 'C', 'general'],
  },
};
