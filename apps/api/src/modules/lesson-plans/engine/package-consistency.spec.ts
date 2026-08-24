/** Тесты согласованности пакета (ТЗ 1.6, этап 4): C4, C6, C11. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkLevelDescriptorsDiffer, checkActivityFormat, checkResourceLink,
  appendResourceLink, activityTypeOf,
} from './package-consistency';

// ── C4 (баг 1.4: один дескриптор на три разных задания) ──────────────────
test('C4: дословно одинаковые наборы уровней — нарушение', () => {
  const same = [{ text: 'Шығарманың тақырыбын анықтайды' }, { text: 'Кейіпкерге сипаттама береді' }];
  const problems = checkLevelDescriptorsDiffer({ A: same, B: same, C: same });
  assert.equal(problems.length, 3, 'A=B, B=C, A=C');
  assert.ok(problems.every((p) => p.rule === 'C4'));
});

test('C4: разные наборы проходят; пустые уровни не сравниваются', () => {
  assert.equal(checkLevelDescriptorsDiffer({
    A: [{ text: 'Дұрыс жауапты таңдайды' }],
    B: [{ text: 'Сәйкестікті орнатады' }],
    C: [{ text: 'Өз ойын жазбаша дәлелдейді' }],
  }).length, 0);
  assert.equal(checkLevelDescriptorsDiffer({ A: [], B: [], C: [] }).length, 0);
});

// ── C6 (баг 1.6: КМЖ обещал ролевой диалог, лист выдал викторину) ────────
test('C6: тип активности определяется по инструменту', () => {
  assert.equal(activityTypeOf('pair_role_dialogue', 'task'), 'role_play');
  assert.equal(activityTypeOf('pair_interview', 'task'), 'pair_interview');
  assert.equal(activityTypeOf('group_case_study', 'task'), 'group_case');
  assert.equal(activityTypeOf('individual_quiz', 'quiz'), 'other');
});

test('C6: ролевое задание без ролей — нарушение, с ролями — норма', () => {
  const quiz = 'Сәкен Сейфуллин қай жылы туған? а) 1894 ә) 1900';
  const bad = checkActivityFormat('role_play', quiz);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].rule, 'C6');

  const rolePlay = 'Рөлдік жағдаят: бірінші оқушы — ақын, екінші — журналист. Кейіпкер атынан диалог құрыңдар.';
  assert.equal(checkActivityFormat('role_play', rolePlay).length, 0);
  // Тип other не проверяется — ложных срабатываний нет.
  assert.equal(checkActivityFormat('other', quiz).length, 0);
});

// ── C11 ──────────────────────────────────────────────────────────────────
test('C11: ссылка на приложение в ресурсах', () => {
  assert.equal(checkResourceLink('Оқулық, Қосымша 3', 3).length, 0);
  assert.equal(checkResourceLink('Учебник, Приложение 3', 3).length, 0);
  assert.equal(checkResourceLink('Оқулық, тақта', 3).length, 1);
  // Номер должен совпадать: ссылка на другое приложение не считается.
  assert.equal(checkResourceLink('Қосымша 2', 3).length, 1);
  assert.equal(checkResourceLink('Қосымша 30', 3).length, 1, 'не путать 30 с 3');
});

test('C11: ссылка дописывается на языке урока', () => {
  assert.equal(appendResourceLink('Оқулық', 3, 'kz'), 'Оқулық, Қосымша 3');
  assert.equal(appendResourceLink('', 1, 'ru'), 'Приложение 1');
  assert.equal(appendResourceLink(null, 2, 'en'), 'Appendix 2');
});
