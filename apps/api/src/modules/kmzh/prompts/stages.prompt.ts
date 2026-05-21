export function buildStagesPrompt(
  lang: string,
  lessonTitle: string,
  grade: string,
  unitTopic: string,
  learningObjectives: string,
  lessonObjectives: { all: string; most: string; some: string },
): string {
  return `Составь таблицу этапов урока.
Язык: ${lang}
Предмет: ${lessonTitle}, ${grade} класс
Тема раздела: ${unitTopic}
Цели обучения: ${learningObjectives}
Цели урока:
- Все: ${lessonObjectives.all}
- Большинство: ${lessonObjectives.most}
- Некоторые: ${lessonObjectives.some}

ТРЕБОВАНИЯ:
- Итого ровно 45 минут
- Начало (5-7 мин): org_moment + homework_check + lead_in
- Основная часть: individual_work + pair_work + group_work
- Конец (5 мин): reflection + homework
- ИТОГО БАЛЛОВ = ровно 10 (распредели между этапами оценивания)
- Для каждого этапа заполни: id, label, duration (минуты), order, teacherActions, studentActions, assessmentCriteria (массив 2-3 строки), totalPoints (0 если нет оценивания), method, resources

Ответь ТОЛЬКО валидным JSON массивом без markdown:
[{"id":"...","label":"...","duration":...,"order":...,"teacherActions":"...","studentActions":"...","assessmentCriteria":["...","..."],"totalPoints":...,"method":"...","resources":"..."}]`;
}
