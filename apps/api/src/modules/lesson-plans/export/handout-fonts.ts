import * as fs from 'fs';
import { dirname, join } from 'path';

/**
 * Встроенные шрифты для PDF-раздаток (ТЗ 1.4). Читаем woff2-подмножества из
 * @fontsource и вшиваем base64 прямо в CSS — без CDN (сервер в РК, и шрифтов в
 * системе нет). Казахские глифы (ә, ғ, қ, ң, ө, ұ, ү, һ, і) живут в
 * подмножествах cyrillic и cyrillic-ext, поэтому включаем оба.
 */

// Диапазоны как у Google Fonts — Chromium сам подбирает подмножество под глиф.
const RANGES: Record<string, string> = {
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,' +
    'U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
  'cyrillic-ext': 'U+0460-052F,U+1C80-1C88,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F',
};

// Что вшиваем: семейство → пакет → нужные веса.
const FACES: { family: string; pkg: string; prefix: string; weights: number[] }[] = [
  { family: 'Nunito', pkg: '@fontsource/nunito', prefix: 'nunito', weights: [700, 800] },
  { family: 'Inter', pkg: '@fontsource/inter', prefix: 'inter', weights: [400, 600, 700] },
];

function filesDir(pkg: string): string {
  // require.resolve находит package.json пакета; шрифты рядом в files/.
  return join(dirname(require.resolve(`${pkg}/package.json`)), 'files');
}

function b64(path: string): string {
  return fs.readFileSync(path).toString('base64');
}

function buildCss(): string {
  const rules: string[] = [];
  for (const f of FACES) {
    const dir = filesDir(f.pkg);
    for (const w of f.weights) {
      for (const subset of Object.keys(RANGES)) {
        const file = join(dir, `${f.prefix}-${subset}-${w}-normal.woff2`);
        if (!fs.existsSync(file)) continue;
        rules.push(
          `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${w};` +
          `font-display:swap;src:url(data:font/woff2;base64,${b64(file)}) format('woff2');` +
          `unicode-range:${RANGES[subset]};}`,
        );
      }
    }
  }
  return rules.join('\n');
}

// Считаем один раз при старте — файлы не меняются в рантайме.
let cached: string | null = null;
export function fontFaceCss(): string {
  if (cached === null) cached = buildCss();
  return cached;
}
