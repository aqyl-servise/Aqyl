/**
 * Адрес страницы примера латиницей: «ksp-himiya-8-klass-kislorod»,
 * «kmzh-himiya-8-synyp-ottek». Кириллицу и казахские буквы переводим в
 * латиницу по упрощённой таблице — адрес должен читаться и в поиске, и в
 * мессенджере, где кириллица превращается в %D0%BA%D1%81%D0%BF.
 */
const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  // казахские
  ә: 'a', ғ: 'g', қ: 'k', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i',
};

export function translit(s: string): string {
  return s
    .toLowerCase()
    .split('')
    .map((ch) => (MAP[ch] !== undefined ? MAP[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function exampleSlug(p: { lang: 'ru' | 'kz'; subject: string; grade: number; topic: string }): string {
  const head = p.lang === 'kz' ? `kmzh-${translit(p.subject)}-${p.grade}-synyp` : `ksp-${translit(p.subject)}-${p.grade}-klass`;
  const topic = translit(p.topic).split('-').slice(0, 8).join('-');
  return `${head}-${topic}`.slice(0, 140).replace(/-+$/, '');
}

/** Название документа и слово «класс» на языке примера — по утверждённой таблице терминов. */
export function exampleLabels(lang: 'ru' | 'kz') {
  return lang === 'kz'
    ? { kind: 'ҚМЖ', docTitle: 'Қысқа мерзімді сабақ жоспары', grade: 'сынып' }
    : { kind: 'КСП', docTitle: 'Краткосрочный план урока', grade: 'класс' };
}
