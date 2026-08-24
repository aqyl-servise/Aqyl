import {
  Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, PageBreak, AlignmentType,
} from 'docx';
import { Lesson } from '../entities/lesson.entity';
import { Handout } from '../entities/handout.entity';
import { DocLabels } from './doc-labels';

// Общие примитивы вёрстки .docx для плана и раздаточных материалов.
// Ширины таблиц — в твипах, а не в процентах: docx 9.6.x сериализует PERCENTAGE
// как w:w="100%", что нарушает схему OOXML, и Word отказывается открыть файл.
// TEXT_W — полоса набора: Letter 12240 минус поля по умолчанию 1440×2.
const TEXT_W = 9360;
const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };

type Child = Paragraph | Table;

export function para(text: string, bold = false, size = 20): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: text ?? '', bold, size })] });
}

function heading(text: string, size = 22): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true, size })] });
}

function cell(children: Paragraph[], widthDxa?: number): TableCell {
  return new TableCell({ borders, ...(widthDxa ? { width: { size: widthDxa, type: WidthType.DXA } } : {}), children });
}

/** Разрыв страницы между приложениями. */
export function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

/**
 * План урока (формат №130): заголовок + шапка + таблица хода урока.
 * `appendixByStageId` — карта «этап → номер приложения» для кросс-ссылки в
 * графе «Ресурсы» (срез 2, §3.4).
 */
export function planChildren(lesson: Lesson, lbl: DocLabels, appendixByStageId?: Map<string, number>): Child[] {
  const hRow = (label: string, value: string) =>
    new TableRow({ children: [cell([para(label, true)], 3000), cell([para(value)], 6360)] });
  // Ячейка с несколькими строками (ТЗ 1.5.1, A.2/A.3): каждая цель отдельным
  // абзацем — в docx \n внутри одного run не переносит, нужны разные Paragraph.
  const hRowLines = (label: string, paras: Paragraph[]) =>
    new TableRow({ children: [cell([para(label, true)], 3000), cell(paras.length ? paras : [para('')], 6360)] });

  // Цели обучения — из LessonCore (ТЗ 1.6): «код — полная формулировка»,
  // не голый код. Для уроков без паспорта (старые) — как раньше.
  const curriculum = lesson.core?.objectives?.curriculum;
  const learnObjLines = curriculum?.length
    ? curriculum.map((c) => para(c.text && c.text !== c.code ? `${c.code} — ${c.text}` : c.code))
    : (lesson.learningObjectives ?? []).map((o) => para(o));
  const lessonObjLines = (lesson.lessonObjectives ?? []).map((o, i) => para(`${i + 1}. ${o}`));

  const headerTable = new Table({
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: [3000, 6360],
    rows: [
      hRow(lbl.shortTermPlan, lesson.unit ? `${lbl.unit}: ${lesson.unit}` : ''),
      hRow(lbl.lessonNo, lesson.lessonNumber ?? ''),
      hRow(lbl.teacherName, lesson.teacherName ?? ''),
      hRow(lbl.date, lesson.date ?? ''),
      hRow(lbl.grade, String(lesson.grade ?? '')),
      hRow(lbl.presentAbsent, `${lesson.presentCount ?? ''} / ${lesson.absentCount ?? ''}`),
      hRow(lbl.lessonTitle, lesson.lessonTitle ?? ''),
      hRow(lbl.languageFocus, lesson.languageFocus ?? ''),
      hRowLines(lbl.learningObjectives, learnObjLines),
      hRowLines(lbl.lessonObjectives, lessonObjLines),
      hRow(lbl.valueLinks, lesson.valueLink ?? ''),
    ],
  });

  const th = (t: string) => cell([para(t, true)]);
  const planHeader = new TableRow({
    children: [th(lbl.stagesTime), th(lbl.teacherActions), th(lbl.studentActions), th(lbl.assessmentCriteria), th(lbl.resources)],
  });
  const planRows = (lesson.stages ?? []).map((s) => {
    const studentChildren: Paragraph[] = [para(s.studentActions ?? '')];
    if (s.descriptors?.length) {
      studentChildren.push(para(`${lbl.descriptor}:`, true));
      s.descriptors.forEach((d, i) => studentChildren.push(para(`${i + 1}. ${d.text}`)));
      studentChildren.push(para(`${lbl.total}: ${s.points ?? 0} ${lbl.points}`, true));
    }
    const critChildren: Paragraph[] = [para(s.assessmentCriteria ?? '')];
    if (s.method) critChildren.push(para(`${lbl.method}: ${s.method}`));

    // Ресурсы + ссылка на приложение с материалом этого этапа.
    const resChildren: Paragraph[] = [para(s.resources ?? '')];
    const appendixNo = appendixByStageId?.get(s.id);
    if (appendixNo) resChildren.push(para(`(${lbl.seeAppendix} ${appendixNo})`, true));

    return new TableRow({
      children: [
        cell([para(`${s.stageName || s.stageType}`, true), para(`(${s.timeMinutes} ${lbl.min})`)]),
        cell([para(s.teacherActions ?? '')]),
        cell(studentChildren),
        cell(critChildren),
        cell(resChildren),
      ],
    });
  });
  const planTable = new Table({
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: [1500, 2100, 2400, 2000, 1360],
    rows: [planHeader, ...planRows],
  });

  return [
    // Заголовок ҚМЖ — по центру, один отступ до таблицы (ТЗ 1.5.1, A.1).
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: lbl.docTitle, bold: true })],
    }),
    para(''),
    headerTable,
    para(''),
    new Paragraph({ children: [new TextRun({ text: lbl.plan, bold: true, size: 22 })] }),
    planTable,
  ];
}

// ── Раздаточные материалы (срез 2) ──────────────────────────────────
type Mode = 'student' | 'teacher';

/** Один блок задания (инструкция, секции, вопросы, поля ответа, ключи). */
function blockChildren(block: Record<string, any> | null | undefined, lbl: DocLabels, mode: Mode): Paragraph[] {
  const out: Paragraph[] = [];
  if (!block) return out;
  if (block.instructions) out.push(para(String(block.instructions)));

  for (const sec of Array.isArray(block.sections) ? block.sections : []) {
    if (sec?.heading) out.push(para(String(sec.heading), true));
    if (sec?.body) out.push(para(String(sec.body)));
    for (const it of Array.isArray(sec?.items) ? sec.items : []) out.push(para(`• ${String(it)}`));
  }

  (Array.isArray(block.questions) ? block.questions : []).forEach((q: any, i: number) => {
    out.push(para(`${i + 1}. ${String(q?.q ?? '')}`));
    for (const opt of Array.isArray(q?.options) ? q.options : []) out.push(para(`    ${String(opt)}`));
  });

  if (typeof block.answerLines === 'number' && mode === 'student') {
    for (let i = 0; i < block.answerLines; i++) out.push(para('_'.repeat(48)));
  }

  if (mode === 'teacher') {
    if (block.answers) { out.push(para(`${lbl.answersLabel}:`, true)); out.push(para(String(block.answers))); }
    if (block.criteria) { out.push(para(`${lbl.assessmentCriteria}:`, true)); out.push(para(String(block.criteria))); }
    if (Array.isArray(block.descriptors) && block.descriptors.length) {
      out.push(para(`${lbl.descriptor}:`, true));
      block.descriptors.forEach((d: any, i: number) => out.push(para(`${i + 1}. ${String(d?.text ?? '')} (${d?.points ?? 0})`)));
      if (block.points != null) out.push(para(`${lbl.total}: ${block.points} ${lbl.points}`, true));
    }
    if (block.notes) out.push(para(String(block.notes)));
  }
  return out;
}

/** Один раздаточный лист = одно приложение. */
export function handoutChildren(handout: Handout, lbl: DocLabels, mode: Mode): Paragraph[] {
  const content = (mode === 'teacher' ? handout.teacherContent : handout.studentContent) as Record<string, any> | null;
  const title = content?.title ? String(content.title) : '';
  const out: Paragraph[] = [heading(`${lbl.appendix} ${handout.order}. ${title}`)];

  const levels = handout.levels as Record<string, any> | null;
  if (levels) {
    const levelLabel: Record<string, string> = { A: lbl.levelA, B: lbl.levelB, C: lbl.levelC };
    for (const k of ['A', 'B', 'C']) {
      const lvl = levels[k];
      if (!lvl) continue;
      out.push(para(levelLabel[k], true, 22));
      out.push(...blockChildren(mode === 'teacher' ? lvl.teacher : lvl.student, lbl, mode));
    }
  } else {
    out.push(...blockChildren(content, lbl, mode));
  }
  return out;
}

export { TEXT_W };
