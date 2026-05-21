export function buildObjectivesPrompt(
  learningObjectives: string,
  grade: string,
  lessonTitle: string,
  lang: string,
): string {
  return `На основе целей обучения '${learningObjectives}' для ${grade} класса, предмет '${lessonTitle}', сформулируй цели урока на трёх уровнях на языке ${lang}.
Ответь ТОЛЬКО JSON без markdown:
{"all":"...","most":"...","some":"..."}
Где:
- all: Барлық оқушылар үлгере алады / Все ученики смогут / All learners will be able to
- most: Оқушылардың көпшілігі / Большинство учеников / Most learners will be able to
- some: Кейбір оқушылар / Некоторые ученики / Some learners will be able to`;
}
