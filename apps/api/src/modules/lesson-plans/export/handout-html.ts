import { Handout, HandoutType } from '../entities/handout.entity';
import { fontFaceCss } from './handout-fonts';

/**
 * HTML-шаблон раздаточного листа под фирменный дизайн Aqyl (ТЗ 1.4, часть A).
 * Единый каркас (шапка с лого, поля ученика, заголовок с иконкой, тело, подвал),
 * акцентный цвет и иконка меняются по типу этапа. Версии student/teacher.
 */

export interface HandoutLessonMeta {
  lessonTitle?: string | null;
  subject?: string | null;
  grade?: number | null;
  language?: string | null;
}
type Mode = 'student' | 'teacher';

// ── Палитра из логотипа Aqyl ────────────────────────────────────────
const T = {
  indigo: '#2E2780', violet: '#8B84E8', green: '#4C9E81', orange: '#E8A33D',
  pink: '#D9568B', teal: '#3DB8B8', ink: '#1E1B3A', muted: '#6B6790',
  paper: '#FBFAFF', line: '#E6E3F5',
};

// Акцент + иконка по типу этапа (ТЗ A.3).
const ACCENT: Record<HandoutType, { color: string; icon: string }> = {
  warmup: { color: T.orange, icon: '🔥' },
  explanation: { color: T.indigo, icon: '📘' },
  individual: { color: T.green, icon: '✏️' },
  pair: { color: T.violet, icon: '👥' },
  group: { color: T.violet, icon: '👥' },
  text: { color: T.green, icon: '📖' },
  quiz: { color: T.pink, icon: '❓' },
  reflection: { color: T.teal, icon: '💭' },
};

// Локализованные подписи листа.
const L: Record<string, Record<string, string>> = {
  kz: { student: 'Оқушы', date: 'Күні', answers: 'Жауап кілті', criteria: 'Бағалау критерийі', descriptor: 'Дескриптор', points: 'ұпай', appendix: 'Қосымша', levelA: 'A деңгейі', levelB: 'B деңгейі', levelC: 'C деңгейі' },
  ru: { student: 'Ученик', date: 'Дата', answers: 'Ключи / ответы', criteria: 'Критерии оценивания', descriptor: 'Дескриптор', points: 'баллов', appendix: 'Приложение', levelA: 'Уровень A', levelB: 'Уровень B', levelC: 'Уровень C' },
  en: { student: 'Student', date: 'Date', answers: 'Answer key', criteria: 'Assessment criteria', descriptor: 'Descriptor', points: 'points', appendix: 'Appendix', levelA: 'Level A', levelB: 'Level B', levelC: 'Level C' },
};
const TYPE_NAME: Record<string, Record<HandoutType, string>> = {
  kz: { warmup: 'Қыздыру', explanation: 'Түсіндіру', individual: 'Жеке тапсырма', pair: 'Жұптық жұмыс', group: 'Топтық жұмыс', text: 'Мәтінмен жұмыс', quiz: 'Квиз', reflection: 'Рефлексия' },
  ru: { warmup: 'Разминка', explanation: 'Объяснение', individual: 'Индивидуальное задание', pair: 'Парная работа', group: 'Групповая работа', text: 'Работа с текстом', quiz: 'Квиз', reflection: 'Рефлексия' },
  en: { warmup: 'Warm-up', explanation: 'Explanation', individual: 'Individual task', pair: 'Pair work', group: 'Group work', text: 'Text work', quiz: 'Quiz', reflection: 'Reflection' },
};
const lang = (m?: string | null) => (m && L[m] ? m : 'kz');

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// Буквы вариантов ответа по языку урока. Казахский ряд — А, Ә, Б, В (порядок
// казахского алфавита): именно на него ссылается ключ учителя («1-Ә»).
const OPTION_LETTERS: Record<string, string[]> = {
  kz: ['А', 'Ә', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж'],
  ru: ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З'],
  en: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
};
function optionLetter(lg: string, i: number): string {
  const row = OPTION_LETTERS[lg] ?? OPTION_LETTERS.kz;
  return row[i] ?? String(i + 1);
}

/**
 * Убирает букву-метку, если модель уже вписала её в текст варианта («А) FeO»).
 * Без этого на листе выходило бы «А) А) FeO»: модель проставляет метку
 * непоследовательно — иногда есть, иногда нет.
 */
function stripOptionLabel(opt: unknown): string {
  return String(opt ?? '').replace(/^\s*[A-Za-zА-ЯӘҒҚҢӨҰҮҺІа-яәғқңөұүһі0-9]\s*[).:]\s+/, '').trim();
}

// ── Мини-логотип Aqyl (буква «A»: индиго-фон, сиреневая/зелёная ноги,
//    оранжевая перекладина, белая точка) — inline SVG, без файла ассета.
function logo(size = 26): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle">` +
    `<rect width="40" height="40" rx="9" fill="${T.indigo}"/>` +
    `<path d="M20 8 L11 32 L15.5 32 L20 19 Z" fill="${T.violet}"/>` +
    `<path d="M20 8 L29 32 L24.5 32 L20 19 Z" fill="${T.green}"/>` +
    `<rect x="14" y="23.5" width="12" height="3.2" rx="1.6" fill="${T.orange}"/>` +
    `<circle cx="20" cy="8.5" r="2.5" fill="#fff"/>` +
    `</svg>`
  );
}

// ── Рендер блока задания (инструкция, секции, вопросы, поля ответа) ──
function answerLines(n: number): string {
  return `<div class="ans">${Array.from({ length: n }, () => '<div class="line"></div>').join('')}</div>`;
}

function blockBody(block: Record<string, any> | null | undefined, type: HandoutType, mode: Mode, lg: string): string {
  if (!block) return '';
  const parts: string[] = [];
  if (block.instructions) parts.push(`<p class="instr">${esc(block.instructions)}</p>`);

  for (const sec of Array.isArray(block.sections) ? block.sections : []) {
    parts.push('<div class="sec">');
    if (sec?.heading) parts.push(`<div class="sec-h">${esc(sec.heading)}</div>`);
    if (sec?.body) parts.push(`<p>${esc(sec.body)}</p>`);
    if (Array.isArray(sec?.items) && sec.items.length) {
      parts.push(`<ul>${sec.items.map((it: unknown) => `<li>${esc(it)}</li>`).join('')}</ul>`);
    }
    parts.push('</div>');
  }

  if (Array.isArray(block.questions) && block.questions.length) {
    parts.push('<ol class="quiz">');
    for (const q of block.questions) {
      parts.push(`<li><div class="q">${esc(q?.q)}</div>`);
      const opts = Array.isArray(q?.options) ? q.options : [];
      opts.forEach((opt: unknown, j: number) => {
        // Буква варианта: ключ учителя ссылается на неё («1-Ә»), а на листе
        // ученика её раньше не было — стояли только кружки, и учителю
        // приходилось отсчитывать позиции. Алфавит по языку урока.
        parts.push(
          `<div class="opt"><span class="bubble"></span>` +
          `<span class="ol">${esc(optionLetter(lg, j))})</span> ${esc(stripOptionLabel(opt))}</div>`,
        );
      });
      parts.push('</li>');
    }
    parts.push('</ol>');
  }

  if (typeof block.answerLines === 'number' && mode === 'student') parts.push(answerLines(block.answerLines));
  else if (mode === 'student' && (type === 'individual' || type === 'text' || type === 'group')) parts.push(answerLines(3));

  if (mode === 'teacher') parts.push(teacherExtras(block, lg));
  return parts.join('');
}

function teacherExtras(block: Record<string, any>, lg: string): string {
  const t = L[lg];
  const out: string[] = [];
  if (block.answers) out.push(`<div class="key"><b>${t.answers}:</b> ${esc(block.answers)}</div>`);
  if (block.criteria) out.push(`<div class="crit"><b>${t.criteria}:</b> ${esc(block.criteria)}</div>`);
  if (Array.isArray(block.descriptors) && block.descriptors.length) {
    out.push(`<div class="desc"><b>${t.descriptor}:</b><ol>` +
      block.descriptors.map((d: any) => `<li>${esc(d?.text)} <span class="pts">(${esc(d?.points)})</span></li>`).join('') +
      `</ol>${block.points != null ? `<b>${esc(block.points)} ${t.points}</b>` : ''}</div>`);
  }
  if (block.notes) out.push(`<div class="note">${esc(block.notes)}</div>`);
  return out.join('');
}

// Тело листа: индивидуальное — три уровня A/B/C; остальное — один блок.
// Каркас одного листа (шапка/акцент/поля/иконка/заголовок/тело/подвал).
function frame(meta: HandoutLessonMeta, type: HandoutType, order: number, sheetTitle: string, contentHtml: string): string {
  const lg = lang(meta.language);
  const t = L[lg];
  const acc = ACCENT[type];
  const gradeStr = meta.grade != null ? `${meta.grade}-${lg === 'kz' ? 'сынып' : lg === 'en' ? 'grade' : 'класс'}` : '';
  return (
    `<section class="sheet" style="--acc:${acc.color}">` +
    `<header class="head">` +
      `<div class="brand">${logo(28)}<span class="brand-name">Aqyl</span></div>` +
      `<div class="head-meta"><div class="topic">${esc(meta.lessonTitle)}</div>` +
      `<div class="sub">${esc(meta.subject)}${gradeStr ? ' · ' + esc(gradeStr) : ''}</div></div>` +
    `</header>` +
    `<div class="accent-bar"></div>` +
    `<div class="fields"><span>${t.student}: <span class="fl"></span></span><span>${t.date}: <span class="fl short"></span></span></div>` +
    `<div class="block-h"><span class="ti">${acc.icon}</span><span class="tn">${esc(TYPE_NAME[lg][type])}</span>` +
      `<span class="app">${t.appendix} ${order}</span></div>` +
    `<h1 class="sheet-title">${esc(sheetTitle)}</h1>` +
    `<div class="content">${contentHtml}</div>` +
    `<footer class="foot"><span>Aqyl · aqyl-service.kz</span><span>${t.appendix} ${order} · ${esc(TYPE_NAME[lg][type])}</span></footer>` +
    `</section>`
  );
}

/**
 * Раздаточный лист → одна или несколько страниц (.sheet). Уровневое задание
 * A/B/C — ТРИ отдельные страницы (ТЗ 1.5.1, часть E): каждый уровень с чистой
 * страницы, каркас (шапка/поля/подвал) повторяется на каждой.
 */
export function handoutSheets(h: Handout, meta: HandoutLessonMeta, mode: Mode): string {
  const lg = lang(meta.language);
  const t = L[lg];
  const title = (h.studentContent as { title?: string } | null)?.title ?? '';

  if (h.handoutType === 'individual' && h.levels) {
    const lv = h.levels as Record<string, any>;
    const names: Record<string, string> = { A: t.levelA, B: t.levelB, C: t.levelC };
    return ['A', 'B', 'C'].filter((k) => lv[k]).map((k) => {
      const block = mode === 'teacher' ? lv[k].teacher : lv[k].student;
      const inner = `<div class="level level-${k}"><div class="level-h">${names[k]}</div>${blockBody(block, 'individual', mode, lg)}</div>`;
      return frame(meta, 'individual', h.order, `${title} — ${names[k]}`, inner);
    }).join('');
  }
  const content = (mode === 'teacher' ? h.teacherContent : h.studentContent) as Record<string, any> | null;
  return frame(meta, h.handoutType, h.order, title, blockBody(content, h.handoutType, mode, lg));
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Inter',sans-serif;color:${T.ink};background:#fff;font-size:12.5px;line-height:1.5}
.sheet{background:${T.paper};min-height:262mm;padding:0 2mm 14mm;page-break-after:always;position:relative;display:flex;flex-direction:column}
.sheet:last-child{page-break-after:auto}
.head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:2mm}
.brand{display:flex;align-items:center;gap:7px}
.brand-name{font-family:'Nunito';font-weight:800;font-size:17px;color:${T.indigo}}
.head-meta{text-align:right}
.topic{font-family:'Nunito';font-weight:700;font-size:14px;color:${T.ink}}
.sub{font-size:11px;color:${T.muted}}
.accent-bar{height:5px;border-radius:3px;background:var(--acc);margin:6px 0 9px}
.fields{display:flex;gap:22px;font-size:11.5px;color:${T.muted};margin-bottom:11px}
.fields .fl{display:inline-block;width:150px;border-bottom:1.4px dotted ${T.muted};vertical-align:baseline}
.fields .fl.short{width:80px}
.block-h{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.ti{font-size:17px}
.tn{font-family:'Nunito';font-weight:800;font-size:14px;color:var(--acc)}
.app{margin-left:auto;font-size:10.5px;font-weight:700;color:#fff;background:var(--acc);padding:2px 9px;border-radius:20px}
.sheet-title{font-family:'Nunito';font-weight:700;font-size:16px;color:${T.ink};margin-bottom:9px;text-wrap:balance}
.content{flex:1}
.instr{margin-bottom:8px}
.sec{border:1.4px solid ${T.line};border-radius:10px;padding:9px 11px;margin-bottom:8px;background:#fff}
.sec-h{font-family:'Nunito';font-weight:700;color:var(--acc);margin-bottom:3px}
.sec ul{margin:4px 0 0 16px}
.sec li{margin-bottom:2px}
.sec li:nth-child(even){}
.quiz{margin-left:2px;list-style:none;counter-reset:q}
.quiz>li{counter-increment:q;margin-bottom:9px;padding-left:26px;position:relative}
.quiz>li::before{content:counter(q);position:absolute;left:0;top:-1px;width:19px;height:19px;background:var(--acc);color:#fff;border-radius:50%;font-family:'Nunito';font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center}
.q{font-weight:600;margin-bottom:4px}
.opt{display:flex;align-items:center;gap:7px;padding:2px 0}
.bubble{width:13px;height:13px;border:1.6px solid var(--acc);border-radius:50%;flex:none}
.opt .ol{font-weight:700;color:var(--acc);flex:none}
.ans{margin-top:8px}
.ans .line{height:0;border-bottom:1.3px solid #D5D1EC;margin:12px 0}
.level{border:1.6px solid var(--acc);border-radius:12px;padding:10px 12px;margin-bottom:10px}
.level-A{background:rgba(76,158,129,.06)}
.level-B{background:rgba(76,158,129,.11)}
.level-C{background:rgba(76,158,129,.17)}
.level-h{display:inline-block;font-family:'Nunito';font-weight:800;font-size:12px;color:#fff;background:var(--acc);padding:2px 12px;border-radius:20px;margin-bottom:7px}
.key,.crit,.note{border-left:3px solid var(--acc);background:#fff;padding:6px 10px;border-radius:6px;margin-top:7px;font-size:11.5px}
.desc{border:1.3px solid ${T.line};border-radius:8px;padding:7px 10px;margin-top:7px;font-size:11.5px}
.desc ol{margin:3px 0 3px 16px}
.pts{color:${T.muted}}
.foot{display:flex;justify-content:space-between;border-top:1.4px solid ${T.line};padding-top:6px;margin-top:12px;font-size:9.5px;color:${T.muted}}
`;

function docShell(inner: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaceCss()}\n${CSS}</style></head><body>${inner}</body></html>`;
}

/** Один лист как самостоятельный PDF. */
export function singleHandoutHtml(h: Handout, meta: HandoutLessonMeta, mode: Mode): string {
  return docShell(handoutSheets(h, meta, mode));
}

/** Пакет: все приложения, каждое с новой страницы (уровни A/B/C — по странице). */
export function packageHandoutsHtml(handouts: Handout[], meta: HandoutLessonMeta, mode: Mode): string {
  return docShell(handouts.map((h) => handoutSheets(h, meta, mode)).join('\n'));
}
