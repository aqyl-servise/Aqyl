import { fontFaceCss } from '../../lesson-plans/export/handout-fonts';
import { LiteracySet, LiteracyType } from '../entities/literacy-set.entity';
import { LiteracyQuestion, QuestionType } from '../entities/literacy-question.entity';

/**
 * PDF функциональной грамотности в фирменном стиле Aqyl (ТЗ 2.2, часть A).
 * Переиспользует дизайн-систему раздаток (ТЗ 1.4): встроенные шрифты с
 * казахскими глифами, палитру логотипа, каркас (шапка/поля/подвал).
 * Акцент — по типу грамотности. Версии student/teacher (как у раздаток).
 */

type Mode = 'student' | 'teacher';

// ── Палитра из логотипа Aqyl (та же, что в раздатках) ───────────────
const T = {
  indigo: '#2E2780', violet: '#8B84E8', green: '#4C9E81', orange: '#E8A33D',
  ink: '#1E1B3A', muted: '#6B6790', paper: '#FBFAFF', line: '#E6E3F5',
};

// Акцент по типу грамотности (ТЗ A.2): reading→индиго, math→зелёный, science→оранжевый.
const ACCENT: Record<LiteracyType, string> = {
  reading: T.indigo, math: T.green, science: T.orange,
};

const lang = (m?: string | null) => (m && L[m] ? m : 'kz');
const L: Record<string, Record<string, string>> = {
  kz: {
    title: 'Функционалдық сауаттылық', stimulus: 'Стимулдық материал', questions: 'Сұрақтар',
    student: 'Оқушы', date: 'Күні', points: 'ұпай', total: 'Барлығы', level: 'деңгей',
    answer: 'Жауап', key: 'Кілт', criteria: 'Бағалау критерийі', forTeacher: 'Мұғалімге',
  },
  ru: {
    title: 'Функциональная грамотность', stimulus: 'Стимульный материал', questions: 'Вопросы',
    student: 'Ученик', date: 'Дата', points: 'баллов', total: 'Всего', level: 'уровень',
    answer: 'Ответ', key: 'Ключ', criteria: 'Критерии оценивания', forTeacher: 'Для учителя',
  },
  en: {
    title: 'Functional literacy', stimulus: 'Stimulus material', questions: 'Questions',
    student: 'Student', date: 'Date', points: 'points', total: 'Total', level: 'level',
    answer: 'Answer', key: 'Key', criteria: 'Assessment criteria', forTeacher: 'For teacher',
  },
};
const TYPE_NAME: Record<string, Record<LiteracyType, string>> = {
  kz: { reading: 'Оқырмандық', math: 'Математикалық', science: 'Жаратылыстану-ғылыми' },
  ru: { reading: 'Читательская', math: 'Математическая', science: 'Естественно-научная' },
  en: { reading: 'Reading', math: 'Mathematical', science: 'Scientific' },
};
const QTYPE_NAME: Record<string, Record<QuestionType, string>> = {
  kz: { single: 'Бір жауап', multiple: 'Бірнеше жауап', truefalse: 'Ақиқат/жалған', short: 'Қысқа жауап', open: 'Ашық сұрақ', matching: 'Сәйкестендіру' },
  ru: { single: 'Один ответ', multiple: 'Несколько ответов', truefalse: 'Верно/неверно', short: 'Краткий ответ', open: 'Открытый вопрос', matching: 'Соответствие' },
  en: { single: 'Single choice', multiple: 'Multiple choice', truefalse: 'True/False', short: 'Short answer', open: 'Open question', matching: 'Matching' },
};

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
function fmt(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(fmt).join(', ');
  if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, val]) => `${k} — ${fmt(val)}`).join('; ');
  return String(v);
}

// Мини-логотип Aqyl (тот же, что в раздатках) — inline SVG, без ассета.
function logo(size = 28): string {
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

// ── Стимульный блок: текст + опциональные таблицы данных (math/science) ──
function stimulusHtml(set: LiteracySet, t: Record<string, string>): string {
  const parts: string[] = [`<div class="stim"><div class="stim-h">${esc(t.stimulus)}</div>`];
  for (const line of String(set.stimulusText ?? '').split('\n')) {
    if (line.trim()) parts.push(`<p>${esc(line)}</p>`);
  }
  const tables = (set.stimulusData as { tables?: { title?: string; columns?: string[]; rows?: string[][] }[] } | null)?.tables;
  for (const tbl of Array.isArray(tables) ? tables : []) {
    if (tbl?.title) parts.push(`<div class="tbl-t">${esc(tbl.title)}</div>`);
    const head = `<tr>${(tbl?.columns ?? []).map((c) => `<th>${esc(c)}</th>`).join('')}</tr>`;
    const body = (tbl?.rows ?? []).map((r) => `<tr>${(Array.isArray(r) ? r : []).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
    parts.push(`<table class="data">${head}${body}</table>`);
  }
  parts.push('</div>');
  return parts.join('');
}

// ── Один вопрос: номер, текст, бейджи (тип; учитель: PISA, баллы), варианты/поля ──
function questionHtml(q: LiteracyQuestion, idx: number, mode: Mode, lg: string): string {
  const t = L[lg];
  const teacher = mode === 'teacher';
  const badges = [`<span class="badge type">${esc(QTYPE_NAME[lg][q.questionType] ?? q.questionType)}</span>`];
  if (teacher) {
    badges.push(`<span class="badge pisa">PISA ${esc(q.pisaLevel)}</span>`);
    badges.push(`<span class="badge pts">${esc(q.points)} ${esc(t.points)}</span>`);
  }
  const parts: string[] = [`<li class="q">`,
    `<div class="q-head"><div class="q-text">${esc(q.questionText)}</div><div class="badges">${badges.join('')}</div></div>`];

  const options = Array.isArray(q.options) ? (q.options as unknown[]) : [];
  if (options.length) {
    parts.push(`<div class="opts">${options.map((o, j) =>
      `<div class="opt"><span class="bubble"></span><span class="ol">${String.fromCharCode(65 + j)})</span> ${esc(fmt(o))}</div>`).join('')}</div>`);
  } else if (!teacher) {
    // Открытый/краткий вопрос без вариантов — линованное место для ответа.
    const n = q.questionType === 'open' ? 4 : 2;
    parts.push(`<div class="ans">${Array.from({ length: n }, () => '<div class="line"></div>').join('')}</div>`);
  }

  if (teacher) {
    parts.push(`<div class="key"><b>${esc(t.key)}:</b> ${esc(fmt(q.correctAnswer))}</div>`);
    if (q.answerCriteria) parts.push(`<div class="crit"><b>${esc(t.criteria)}:</b> ${esc(q.answerCriteria)}</div>`);
  }
  parts.push('</li>');
  return parts.join('');
}

/** Набор функграмотности → PDF-страница (.sheet) в стиле раздаток. */
export function literacyHtml(set: LiteracySet, mode: Mode): string {
  const lg = lang(set.language);
  const t = L[lg];
  const acc = ACCENT[set.literacyType] ?? T.indigo;
  const teacher = mode === 'teacher';
  const gradeStr = set.grade != null ? `${set.grade}-${lg === 'kz' ? 'сынып' : lg === 'en' ? 'grade' : 'класс'}` : '';
  const questions = Array.isArray(set.questions) ? set.questions : [];

  const inner =
    `<section class="sheet" style="--acc:${acc}">` +
    `<header class="head">` +
      `<div class="brand">${logo(28)}<span class="brand-name">Aqyl</span></div>` +
      `<div class="head-meta"><div class="topic">${esc(t.title)} — ${esc(TYPE_NAME[lg][set.literacyType])}</div>` +
      `<div class="sub">${esc(set.subject ?? '')}${gradeStr ? ' · ' + esc(gradeStr) : ''}${teacher ? ` · ${esc(t.total)}: ${esc(set.totalPoints)} ${esc(t.points)}` : ''}</div></div>` +
    `</header>` +
    `<div class="accent-bar"></div>` +
    `<div class="fields"><span>${esc(t.student)}: <span class="fl"></span></span><span>${esc(t.date)}: <span class="fl short"></span></span></div>` +
    stimulusHtml(set, t) +
    `<div class="q-h">${esc(t.questions)}</div>` +
    `<ol class="qlist">${questions.map((q, i) => questionHtml(q, i, mode, lg)).join('')}</ol>` +
    `<footer class="foot"><span>Aqyl · aqyl-service.kz</span><span>${esc(TYPE_NAME[lg][set.literacyType])}${teacher ? ' · ' + esc(t.forTeacher) : ''}</span></footer>` +
    `</section>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaceCss()}\n${CSS}</style></head><body>${inner}</body></html>`;
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Inter',sans-serif;color:${T.ink};background:#fff;font-size:12.5px;line-height:1.5}
.sheet{background:${T.paper};min-height:262mm;padding:0 2mm 14mm;position:relative;display:flex;flex-direction:column}
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
.stim{border:1.4px solid ${T.line};border-left:5px solid var(--acc);border-radius:10px;padding:10px 13px;margin-bottom:12px;background:#fff}
.stim-h{font-family:'Nunito';font-weight:800;font-size:13px;color:var(--acc);margin-bottom:5px}
.stim p{margin-bottom:5px}
.tbl-t{font-family:'Nunito';font-weight:700;margin:8px 0 4px}
table.data{border-collapse:collapse;width:100%;margin-bottom:6px;font-size:11.5px}
table.data th,table.data td{border:1px solid ${T.line};padding:4px 7px;text-align:left}
table.data th{background:var(--acc);color:#fff;font-family:'Nunito';font-weight:700}
table.data tr:nth-child(even) td{background:#fff}
.q-h{font-family:'Nunito';font-weight:800;font-size:14px;color:${T.ink};margin-bottom:7px}
.qlist{list-style:none;counter-reset:q}
.q{counter-increment:q;position:relative;padding:9px 12px 9px 34px;margin-bottom:9px;border:1.3px solid ${T.line};border-radius:10px;background:#fff;page-break-inside:avoid}
.q::before{content:counter(q);position:absolute;left:9px;top:9px;width:20px;height:20px;background:var(--acc);color:#fff;border-radius:50%;font-family:'Nunito';font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center}
.q-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.q-text{font-weight:600;flex:1}
.badges{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;flex:none;max-width:44%}
.badge{font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap}
.badge.type{background:${T.line};color:${T.indigo}}
.badge.pisa{background:var(--acc);color:#fff}
.badge.pts{background:${T.ink};color:#fff}
.opts{margin-top:6px}
.opt{display:flex;align-items:center;gap:7px;padding:2px 0}
.opt .bubble{width:13px;height:13px;border:1.6px solid var(--acc);border-radius:50%;flex:none}
.opt .ol{font-weight:700;color:var(--acc)}
.ans{margin-top:7px}
.ans .line{height:0;border-bottom:1.3px solid #D5D1EC;margin:11px 0}
.key,.crit{border-left:3px solid var(--acc);background:${T.paper};padding:5px 9px;border-radius:6px;margin-top:6px;font-size:11.5px}
.foot{display:flex;justify-content:space-between;border-top:1.4px solid ${T.line};padding-top:6px;margin-top:auto;font-size:9.5px;color:${T.muted}}
`;
