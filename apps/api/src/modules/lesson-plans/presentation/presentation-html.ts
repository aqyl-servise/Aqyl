import { fontFaceCss } from '../export/handout-fonts';

/**
 * Слайды презентации в фирменном стиле Aqyl (ТЗ 2.0). 16:9, крупные шрифты,
 * высокий контраст (читаемо с задних парт). Титул/финал — тёмный индиго со
 * светлым текстом; остальные — светлый фон с индиго-акцентом по типу этапа.
 * Шрифты вшиты (казахские глифы), без CDN.
 */

const C = {
  indigo: '#2E2780', indigoDeep: '#241E63', violet: '#8B84E8', green: '#4C9E81',
  orange: '#E8A33D', pink: '#D9568B', teal: '#3DB8B8', ink: '#1E1B3A', muted: '#6B6790', paper: '#FBFAFF',
};

// Акцент по типу этапа (как в раздатках).
const ACCENT: Record<string, string> = {
  warmup: C.orange, explanation: C.indigo, task: C.green, quiz: C.pink, reflection: C.teal, content: C.indigo,
};

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// Мини-логотип Aqyl (fill управляется через currentColor у фона-подложки).
function logo(size = 40, onDark = false): string {
  const bg = onDark ? '#FFFFFF22' : C.indigo;
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="40" height="40" rx="9" fill="${bg}"/>` +
    `<path d="M20 8 L11 32 L15.5 32 L20 19 Z" fill="${C.violet}"/>` +
    `<path d="M20 8 L29 32 L24.5 32 L20 19 Z" fill="${C.green}"/>` +
    `<rect x="14" y="23.5" width="12" height="3.2" rx="1.6" fill="${C.orange}"/>` +
    `<circle cx="20" cy="8.5" r="2.5" fill="#fff"/>` +
    `</svg>`
  );
}

interface Meta { topic: string; slideNo: number; total: number }

function footer(meta: Meta, onDark: boolean): string {
  const col = onDark ? '#FFFFFFAA' : C.muted;
  return `<div class="foot" style="color:${col}"><span>${logo(20, onDark)} Aqyl</span><span>${esc(meta.topic)}</span><span>${meta.slideNo} / ${meta.total}</span></div>`;
}

function slideTitle(s: any, meta: Meta): string {
  return (
    `<section class="slide title">` +
    `<div class="brand-lg">${logo(64, true)}<span>Aqyl</span></div>` +
    `<h1>${esc(s.title)}</h1>` +
    `<div class="meta">${[esc(s.subject), s.grade != null ? esc(s.grade) + '-сынып' : '', s.lessonNumber ? '№ ' + esc(s.lessonNumber) : ''].filter(Boolean).join('  ·  ')}</div>` +
    footer(meta, true) +
    `</section>`
  );
}

function slideFinal(s: any, meta: Meta): string {
  return (
    `<section class="slide final">` +
    `<div class="brand-lg">${logo(64, true)}<span>Aqyl</span></div>` +
    `<h1>${esc(s.title)}</h1>` +
    footer(meta, true) +
    `</section>`
  );
}

function bulletsHtml(bullets: unknown): string {
  const arr = Array.isArray(bullets) ? bullets : [];
  return `<ul>${arr.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
}

function slideContent(s: any, meta: Meta): string {
  const acc = ACCENT[String(s.stageType ?? 'content')] ?? C.indigo;
  return (
    `<section class="slide content" style="--acc:${acc}">` +
    `<div class="accent"></div>` +
    `<h2>${esc(s.title)}</h2>` +
    bulletsHtml(s.bullets) +
    footer(meta, false) +
    `</section>`
  );
}

function slideObjectives(s: any, meta: Meta): string {
  return (
    `<section class="slide content" style="--acc:${C.indigo}">` +
    `<div class="accent"></div>` +
    `<h2>${esc(s.title)}</h2>` +
    `<ol class="obj">${(Array.isArray(s.bullets) ? s.bullets : []).map((b: unknown) => `<li>${esc(b)}</li>`).join('')}</ol>` +
    footer(meta, false) +
    `</section>`
  );
}

function slideQuiz(s: any, meta: Meta): string {
  const opts = Array.isArray(s.options) ? s.options : [];
  return (
    `<section class="slide content quiz" style="--acc:${C.pink}">` +
    `<div class="accent"></div>` +
    `<h2>${esc(s.title)}</h2>` +
    `<div class="question">${esc(s.question)}</div>` +
    `<div class="opts">${opts.map((o: unknown) => `<div class="opt"><span class="b"></span>${esc(o)}</div>`).join('')}</div>` +
    footer(meta, false) +
    `</section>`
  );
}

function renderSlide(s: any, meta: Meta): string {
  switch (s.kind) {
    case 'title': return slideTitle(s, meta);
    case 'objectives': return slideObjectives(s, meta);
    case 'quiz': return slideQuiz(s, meta);
    case 'final': return slideFinal(s, meta);
    default: return slideContent(s, meta);
  }
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Inter',sans-serif;color:${C.ink}}
.slide{width:1280px;height:720px;position:relative;overflow:hidden;page-break-after:always;padding:64px 72px 56px;display:flex;flex-direction:column;background:${C.paper}}
.slide:last-child{page-break-after:auto}
.foot{position:absolute;left:72px;right:72px;bottom:26px;display:flex;justify-content:space-between;align-items:center;font-size:18px;font-family:'Inter'}
.foot span{display:flex;align-items:center;gap:8px}
/* Титул и финал — тёмный индиго */
.title,.final{background:linear-gradient(135deg,${C.indigo} 0%,${C.indigoDeep} 100%);color:#fff;align-items:flex-start;justify-content:center}
.final{align-items:center;text-align:center}
.brand-lg{display:flex;align-items:center;gap:16px;font-family:'Nunito';font-weight:800;font-size:34px;margin-bottom:26px}
.title h1{font-family:'Nunito';font-weight:800;font-size:60px;line-height:1.12;max-width:1000px;text-wrap:balance}
.final h1{font-family:'Nunito';font-weight:800;font-size:88px}
.title .meta{margin-top:28px;font-size:30px;color:#FFFFFFCC;font-weight:600}
/* Контентные слайды — светлый фон, индиго-акцент */
.content .accent{position:absolute;top:0;left:0;width:14px;height:100%;background:var(--acc)}
.content h2{font-family:'Nunito';font-weight:800;font-size:46px;color:var(--acc);line-height:1.15;margin-bottom:30px;text-wrap:balance}
.content ul{list-style:none}
.content ul li{position:relative;font-size:31px;line-height:1.4;padding-left:44px;margin-bottom:20px}
.content ul li::before{content:'';position:absolute;left:6px;top:14px;width:16px;height:16px;border-radius:50%;background:var(--acc)}
.content ol.obj{list-style:none;counter-reset:o}
.content ol.obj li{counter-increment:o;position:relative;font-size:31px;line-height:1.4;padding-left:64px;margin-bottom:22px}
.content ol.obj li::before{content:counter(o);position:absolute;left:0;top:2px;width:40px;height:40px;background:var(--acc);color:#fff;border-radius:50%;font-family:'Nunito';font-weight:800;font-size:22px;display:flex;align-items:center;justify-content:center}
/* Квиз */
.quiz .question{font-size:36px;font-weight:600;margin-bottom:30px;line-height:1.3}
.quiz .opts{display:flex;flex-direction:column;gap:18px}
.quiz .opt{display:flex;align-items:center;gap:16px;font-size:30px}
.quiz .opt .b{width:26px;height:26px;border:3px solid var(--acc);border-radius:50%;flex:none}
`;

export function presentationHtml(slides: Record<string, unknown>[], topic: string): string {
  const total = slides.length;
  const inner = slides.map((s, i) => renderSlide(s, { topic, slideNo: i + 1, total })).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaceCss()}\n${CSS}</style></head><body>${inner}</body></html>`;
}
