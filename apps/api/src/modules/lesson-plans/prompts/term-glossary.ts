/**
 * Чистка казахского языка в предметной генерации (ТЗ 1.5.1, часть B).
 *
 * B.1 — правило терминологии в промпт; B.2 — предметные глоссари (пары
 * «неправильно → правильно»); B.3 — детектор конкретных русских терминов из
 * глоссария в казахском тексте. Главная защита — правило B.1; глоссарий и
 * детектор — рабочая основа, дополняется по мере обнаружения калек.
 */

export interface TermPair {
  wrong: string; // «щёлочь / щелочь» — несколько вариантов через «/»
  correct: string;
}

// Глоссари по предметам (B.2). Ключ — техническое имя; сопоставление с
// Lesson.subject идёт по ключевому слову (glossaryFor).
const GLOSSARY: Record<string, TermPair[]> = {
  chemistry: [
    { wrong: 'железо', correct: 'темір' }, { wrong: 'медь', correct: 'мыс' }, { wrong: 'золото', correct: 'алтын' },
    { wrong: 'серебро', correct: 'күміс' }, { wrong: 'свинец', correct: 'қорғасын' }, { wrong: 'цинк', correct: 'мырыш' },
    { wrong: 'сера', correct: 'күкірт' }, { wrong: 'окисление / окисіну', correct: 'тотығу' },
    { wrong: 'восстановление', correct: 'тотықсыздану' }, { wrong: 'щёлочь / щелочь', correct: 'сілті' },
    { wrong: 'кислота', correct: 'қышқыл' }, { wrong: 'соль', correct: 'тұз' }, { wrong: 'раствор', correct: 'ерітінді' },
    { wrong: 'смесь', correct: 'қоспа' }, { wrong: 'реакция замещения', correct: 'алмасу реакциясы' },
    { wrong: 'реакция соединения', correct: 'қосылу реакциясы' }, { wrong: 'реакция разложения', correct: 'ыдырау реакциясы' },
    { wrong: 'основание', correct: 'негіз' }, { wrong: 'ржавчина', correct: 'тот' },
    { wrong: 'рыжий / бурый', correct: 'қоңыр түс' }, { wrong: 'коррозия', correct: 'коррозия (жемірілу)' },
    { wrong: 'водород', correct: 'сутек' }, { wrong: 'кислород', correct: 'оттек' },
    { wrong: 'углерод', correct: 'көміртек' }, { wrong: 'валентность', correct: 'валенттілік' },
    { wrong: 'вещество', correct: 'зат' },
  ],
  physics: [
    { wrong: 'скорость', correct: 'жылдамдық' }, { wrong: 'сила', correct: 'күш' }, { wrong: 'вес', correct: 'салмақ' },
    { wrong: 'ускорение', correct: 'үдеу' }, { wrong: 'работа', correct: 'жұмыс' }, { wrong: 'мощность', correct: 'қуат' },
    { wrong: 'давление', correct: 'қысым' }, { wrong: 'сопротивление', correct: 'кедергі' }, { wrong: 'напряжение', correct: 'кернеу' },
    { wrong: 'сила тока', correct: 'ток күші' }, { wrong: 'трение', correct: 'үйкеліс' }, { wrong: 'плотность', correct: 'тығыздық' },
    { wrong: 'объём', correct: 'көлем' }, { wrong: 'длина', correct: 'ұзындық' }, { wrong: 'время', correct: 'уақыт' },
    { wrong: 'расстояние', correct: 'қашықтық' }, { wrong: 'волна', correct: 'толқын' }, { wrong: 'звук', correct: 'дыбыс' },
    { wrong: 'свет', correct: 'жарық' },
  ],
  biology: [
    { wrong: 'клетка', correct: 'жасуша' }, { wrong: 'ткань', correct: 'ұлпа' }, { wrong: 'орган', correct: 'мүше' },
    { wrong: 'организм', correct: 'ағза' }, { wrong: 'кровь', correct: 'қан' }, { wrong: 'сердце', correct: 'жүрек' },
    { wrong: 'лёгкие', correct: 'өкпе' }, { wrong: 'печень', correct: 'бауыр' }, { wrong: 'почки', correct: 'бүйрек' },
    { wrong: 'мозг', correct: 'ми' }, { wrong: 'нерв', correct: 'жүйке' }, { wrong: 'мышца', correct: 'бұлшықет' },
    { wrong: 'кость', correct: 'сүйек' }, { wrong: 'дыхание', correct: 'тыныс алу' }, { wrong: 'питание', correct: 'қоректену' },
    { wrong: 'пищеварение', correct: 'ас қорыту' }, { wrong: 'размножение', correct: 'көбею' }, { wrong: 'рост', correct: 'өсу' },
    { wrong: 'наследственность', correct: 'тұқым қуалаушылық' }, { wrong: 'растение', correct: 'өсімдік' },
    { wrong: 'животное', correct: 'жануар' }, { wrong: 'корень', correct: 'тамыр' }, { wrong: 'лист', correct: 'жапырақ' },
    { wrong: 'стебель', correct: 'сабақ' },
  ],
  math: [
    { wrong: 'дробь', correct: 'бөлшек' }, { wrong: 'десятичная дробь', correct: 'ондық бөлшек' },
    { wrong: 'обыкновенная дробь', correct: 'жай бөлшек' }, { wrong: 'сложение', correct: 'қосу' },
    { wrong: 'вычитание', correct: 'азайту' }, { wrong: 'умножение', correct: 'көбейту' }, { wrong: 'деление', correct: 'бөлу' },
    { wrong: 'уравнение', correct: 'теңдеу' }, { wrong: 'неравенство', correct: 'теңсіздік' }, { wrong: 'число', correct: 'сан' },
    { wrong: 'знаменатель', correct: 'бөлім' }, { wrong: 'числитель', correct: 'алым' }, { wrong: 'остаток', correct: 'қалдық' },
    { wrong: 'сумма', correct: 'қосынды' }, { wrong: 'разность', correct: 'айырма' }, { wrong: 'произведение', correct: 'көбейтінді' },
    { wrong: 'частное', correct: 'бөлінді' }, { wrong: 'угол', correct: 'бұрыш' }, { wrong: 'треугольник', correct: 'үшбұрыш' },
    { wrong: 'квадрат', correct: 'шаршы' }, { wrong: 'прямоугольник', correct: 'тіктөртбұрыш' },
    { wrong: 'окружность', correct: 'шеңбер' }, { wrong: 'площадь', correct: 'аудан' }, { wrong: 'процент', correct: 'пайыз' },
    { wrong: 'степень', correct: 'дәреже' }, { wrong: 'корень', correct: 'түбір' },
  ],
  geography: [
    { wrong: 'река', correct: 'өзен' }, { wrong: 'озеро', correct: 'көл' }, { wrong: 'море', correct: 'теңіз' },
    { wrong: 'океан', correct: 'мұхит' }, { wrong: 'гора', correct: 'тау' }, { wrong: 'равнина', correct: 'жазық' },
    { wrong: 'пустыня', correct: 'шөл' }, { wrong: 'степь', correct: 'дала' }, { wrong: 'лес', correct: 'орман' },
    { wrong: 'погода', correct: 'ауа райы' }, { wrong: 'население', correct: 'халық' }, { wrong: 'материк', correct: 'құрлық' },
    { wrong: 'остров', correct: 'арал' }, { wrong: 'полуостров', correct: 'түбек' }, { wrong: 'почва', correct: 'топырақ' },
    { wrong: 'полезные ископаемые', correct: 'пайдалы қазбалар' }, { wrong: 'столица', correct: 'астана' },
    { wrong: 'граница', correct: 'шекара' },
  ],
  history: [
    { wrong: 'государство', correct: 'мемлекет' }, { wrong: 'война', correct: 'соғыс' },
    { wrong: 'независимость', correct: 'тәуелсіздік' }, { wrong: 'народ', correct: 'халық' }, { wrong: 'племя', correct: 'тайпа' },
    { wrong: 'восстание', correct: 'көтеріліс' }, { wrong: 'договор', correct: 'келісім' }, { wrong: 'закон', correct: 'заң' },
    { wrong: 'власть', correct: 'билік' }, { wrong: 'правитель', correct: 'билеуші' }, { wrong: 'войско / армия', correct: 'әскер' },
    { wrong: 'крепость', correct: 'бекініс' }, { wrong: 'торговля', correct: 'сауда' }, { wrong: 'кочевник', correct: 'көшпелі' },
  ],
  kazakh: [
    { wrong: 'существительное', correct: 'зат есім' }, { wrong: 'глагол', correct: 'етістік' },
    { wrong: 'прилагательное', correct: 'сын есім' }, { wrong: 'местоимение', correct: 'есімдік' },
    { wrong: 'предложение', correct: 'сөйлем' }, { wrong: 'подлежащее', correct: 'бастауыш' },
    { wrong: 'сказуемое', correct: 'баяндауыш' }, { wrong: 'слог', correct: 'буын' }, { wrong: 'звук', correct: 'дыбыс' },
    { wrong: 'буква', correct: 'әріп' }, { wrong: 'стихотворение', correct: 'өлең' }, { wrong: 'рассказ', correct: 'әңгіме' },
    { wrong: 'сказка', correct: 'ертегі' }, { wrong: 'пословица', correct: 'мақал' },
  ],
  cs: [
    { wrong: 'программа', correct: 'бағдарлама' }, { wrong: 'папка', correct: 'қалта' }, { wrong: 'память', correct: 'жад' },
    { wrong: 'данные', correct: 'деректер' }, { wrong: 'переменная', correct: 'айнымалы' }, { wrong: 'условие', correct: 'шарт' },
  ],
};

// Lesson.subject — свободная строка («Химия», «Казахский язык»…). Матчим по слову.
function glossaryKey(subject?: string | null): string | null {
  const s = (subject ?? '').toLowerCase();
  if (/хим/.test(s)) return 'chemistry';
  if (/физ/.test(s)) return 'physics';
  if (/биолог/.test(s)) return 'biology';
  if (/матем/.test(s)) return 'math';
  if (/географ/.test(s)) return 'geography';
  if (/истор|тарих/.test(s)) return 'history';
  if (/казах|қазақ|литератур|әдебиет/.test(s)) return 'kazakh';
  if (/информат/.test(s)) return 'cs';
  return null;
}

export function glossaryFor(subject?: string | null): TermPair[] {
  const key = glossaryKey(subject);
  return key ? GLOSSARY[key] : [];
}

// ── B.1 — правило терминологии в промпт ─────────────────────────────
const KZ_RULE =
  'Учебный контент на казахском для казахстанской школы. ОБЯЗАТЕЛЬНО: ' +
  'используй государственную казахскую предметную терминологию; НЕ используй русские ' +
  'названия, кальки и транслитерацию; НЕ выдумывай термины; названия веществ/понятий/объектов — ' +
  'на казахском (темір, жасуша, өзен, теңдеу), НЕ на русском (железо, клетка, река, уравнение); ' +
  'формулы и символы — стандартные (Fe, H₂O), состояние — (қ),(с),(бу); служебные слова ' +
  '(құндылық, дескриптор) НЕ вставляй в предметный текст, формулы, условия и ключи; ' +
  'весь текст — 100% на казахском, без русских/английских слов, кроме формул и международных обозначений.';

/** Блок терминологии для системного промпта (пусто для не-kz). */
export function kazakhTermsBlock(language?: string, subject?: string | null): string {
  if (language !== 'kz') {
    // Для RU/EN — лёгкое правило чистоты языка.
    if (language === 'ru') return 'Пиши на литературном русском, без англицизмов-калек.';
    if (language === 'en') return 'Write in plain English, no Russian/Kazakh intrusions.';
    return '';
  }
  const pairs = glossaryFor(subject);
  const gloss = pairs.length
    ? ' Термины предмета — правильные формы: ' +
      pairs.map((p) => `${p.wrong.split('/')[0].trim()}→${p.correct}`).join('; ') + '.'
    : '';
  return KZ_RULE + gloss;
}

// ── B.3 — детектор русских терминов из глоссария в KZ-тексте ─────────
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Находит русские термины из глоссария предмета в казахском тексте (по границам
 * слов, регистронезависимо). Возвращает найденные «неправильные» варианты.
 * Работает по КОНКРЕТНЫМ парам — без фаззи-детекции (казахский и русский на
 * одной кириллице, общий детектор давал бы ложные срабатывания).
 */
export function findWrongTerms(text: string, subject?: string | null): string[] {
  const pairs = glossaryFor(subject);
  if (!pairs.length || !text) return [];
  const variants = pairs
    // Интернациональные термины (коррозия→коррозия (жемірілу), алюминий→алюминий):
    // «неправильное» входит в «правильное» — это не русизм, детектором не ловим.
    .flatMap((p) =>
      p.wrong.split('/').map((w) => w.trim())
        .filter((w) => w && !p.correct.toLowerCase().includes(w.toLowerCase())),
    )
    .map(escapeRe);
  if (!variants.length) return [];
  const re = new RegExp(`(^|[^\\p{L}])(${variants.join('|')})(?=[^\\p{L}]|$)`, 'giu');
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) found.add(m[2].toLowerCase());
  return [...found];
}

/** Собирает все строковые значения из объекта/массива в один текст — для B.3. */
export function flattenStrings(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(flattenStrings).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(flattenStrings).join(' ');
  return '';
}
