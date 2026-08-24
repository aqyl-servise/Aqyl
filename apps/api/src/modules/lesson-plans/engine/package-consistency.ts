/**
 * Правила согласованности пакета (ТЗ 1.6, этап 4): C4, C6, C11.
 * Чистые функции без ввода-вывода — вызываются из handouts.service.
 */

export interface PackageProblem {
  rule: 'C4' | 'C6' | 'C11';
  detail: string;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * C4 — дескрипторы уровней A, B, C попарно различны (баг 1.4: один и тот же
 * набор на три разных задания). Сравниваем набор целиком: совпадение всех
 * строк = копия, отличие хотя бы одной — уже разные требования.
 */
export function checkLevelDescriptorsDiffer(
  levels: { A?: { text: string }[]; B?: { text: string }[]; C?: { text: string }[] },
): PackageProblem[] {
  const key = (arr?: { text: string }[]) =>
    (arr ?? []).map((d) => norm(d?.text ?? '')).filter(Boolean).join(' | ');
  const a = key(levels.A);
  const b = key(levels.B);
  const c = key(levels.C);
  const out: PackageProblem[] = [];
  const pairs: Array<[string, string, string, string]> = [
    ['A', 'B', a, b], ['B', 'C', b, c], ['A', 'C', a, c],
  ];
  for (const [n1, n2, v1, v2] of pairs) {
    if (v1 && v2 && v1 === v2) {
      out.push({ rule: 'C4', detail: `дескрипторы уровней ${n1} и ${n2} совпадают дословно` });
    }
  }
  return out;
}

/**
 * C6 — формат задания соответствует типу активности.
 *
 * Проверяются только те типы, где подмена реально случалась и различима
 * детерминированно (баг 1.6: КМЖ обещал ролевой диалог, лист выдал викторину).
 * Для остальных типов проверки нет — ложное срабатывание хуже пропуска.
 */
export type ActivityType = 'role_play' | 'pair_interview' | 'group_case' | 'other';

/** Тип активности по инструменту этапа: строковые id каталога говорят сами за себя. */
export function activityTypeOf(toolId?: string | null, stageType?: string | null): ActivityType {
  const t = (toolId ?? '').toLowerCase();
  if (/role|рол|dialog|диалог/.test(t)) return 'role_play';
  if (/interview|опрос|интервью/.test(t)) return 'pair_interview';
  if (/case|кейс/.test(t) || (stageType === 'task' && /group|групп/.test(t))) return 'group_case';
  return 'other';
}

const ROLE_MARKERS = /рөл|role|кейіпкер|character|диалог|dialogue|сұхбат|situation|жағдаят|сценар/i;
const INTERVIEW_MARKERS = /сұра|вопрос|question|интервью|interview|жұпта|партнёр|partner|бір-бір/i;
const CASE_MARKERS = /кейс|case|жағдай|ситуац|топ|group|рөлдер|роли/i;

export function checkActivityFormat(
  activity: ActivityType,
  taskText: string,
): PackageProblem[] {
  if (activity === 'other' || !taskText) return [];
  const map: Record<Exclude<ActivityType, 'other'>, { re: RegExp; label: string }> = {
    role_play: { re: ROLE_MARKERS, label: 'ролевая ситуация (роли, сценарий, реплики персонажей)' },
    pair_interview: { re: INTERVIEW_MARKERS, label: 'взаимный опрос в паре (вопросы друг другу)' },
    group_case: { re: CASE_MARKERS, label: 'кейс и распределение ролей в группе' },
  };
  const rule = map[activity];
  return rule.re.test(taskText)
    ? []
    : [{ rule: 'C6', detail: `этап заявлен как «${activity}», но в задании нет признаков: ${rule.label}` }];
}

/**
 * C11 — этап со ссылкой на приложение обязан назвать его в ресурсах
 * («Қосымша 3», «Приложение 3», «Appendix 3»).
 */
export function checkResourceLink(
  resources: string | null | undefined,
  appendixIndex: number,
): PackageProblem[] {
  const r = resources ?? '';
  // \w в JS не покрывает кириллицу даже с флагом u — окончания перечисляем явно.
  const re = new RegExp(`(қосымша|приложени[а-яё]*|appendix)\\s*№?\\s*${appendixIndex}(?!\\d)`, 'iu');
  return re.test(r)
    ? []
    : [{ rule: 'C11', detail: `в ресурсах этапа нет ссылки «Қосымша ${appendixIndex}»` }];
}

/** Дописать ссылку на приложение в ресурсы этапа на языке урока. */
export function appendResourceLink(
  resources: string | null | undefined,
  appendixIndex: number,
  language: string,
): string {
  const word = language === 'ru' ? 'Приложение' : language === 'en' ? 'Appendix' : 'Қосымша';
  const base = (resources ?? '').trim();
  const link = `${word} ${appendixIndex}`;
  return base ? `${base}, ${link}` : link;
}
