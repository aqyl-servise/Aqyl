import React from "react";

/**
 * Рендер текста юридического документа. Формат — markdown-подмножество, которое
 * реально встречается в наших документах: заголовки ##/###, таблицы |a|b|,
 * маркированные и нумерованные списки, жирный **текст** и ссылки [текст](url).
 *
 * Собственный мини-парсер, а не библиотека: документов немного, набор конструкций
 * фиксирован, лишняя зависимость в публичной странице ни к чему.
 */

// ── Инлайн: **жирный** и [текст](url) ──────────────────────────────
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Разбиваем по ссылкам и жирному, сохраняя порядок.
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{m[1]}</strong>);
    } else {
      const href = m[3];
      const external = /^https?:/.test(href);
      nodes.push(
        <a key={`${keyPrefix}-a${i}`} href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{m[2]}</a>,
      );
    }
    last = re.lastIndex;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = (l: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && l.includes("-");
const isBullet = (l: string) => /^\s*-\s+/.test(l);
const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function LegalBody({ body }: { body: string }) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (!para.length) return;
    blocks.push(<p key={`p${key++}`} style={{ lineHeight: 1.75 }}>{renderInline(para.join(" "), `p${key}`)}</p>);
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();

    if (!t) { flushPara(); continue; }

    // Якорь <a name="X"></a> — цель ссылок вида /consent#cross-border.
    // Пустой span с id: браузер прокручивает к нему по хэшу.
    const anchor = t.match(/^<a\s+name="([^"]+)"\s*><\/a>$/i);
    if (anchor) {
      flushPara();
      blocks.push(<span key={`anc${key++}`} id={anchor[1]} style={{ display: "block", scrollMarginTop: 80 }} />);
      continue;
    }

    if (t.startsWith("### ")) {
      flushPara();
      blocks.push(<h3 key={`h${key++}`} style={{ marginTop: 18, fontSize: "1.05rem" }}>{renderInline(t.slice(4), `h${key}`)}</h3>);
      continue;
    }
    if (t.startsWith("## ")) {
      flushPara();
      blocks.push(<h2 key={`h${key++}`} style={{ marginTop: 24 }}>{renderInline(t.slice(3), `h${key}`)}</h2>);
      continue;
    }
    if (t.startsWith("# ")) {
      flushPara();
      blocks.push(<h2 key={`h${key++}`} style={{ marginTop: 28 }}>{renderInline(t.slice(2), `h${key}`)}</h2>);
      continue;
    }

    // Таблица: строка-заголовок, строка-разделитель, дальше тело.
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushPara();
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) { rows.push(cells(lines[i])); i++; }
      i--;
      blocks.push(
        <div key={`t${key++}`} style={{ overflowX: "auto", margin: "6px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem", minWidth: 480 }}>
            <thead>
              <tr>{head.map((h, j) => (
                <th key={j} style={{ textAlign: "left", padding: "9px 12px", borderBottom: "2px solid var(--pub-line)", fontWeight: 700 }}>{renderInline(h, `th${key}-${j}`)}</th>
              ))}</tr>
            </thead>
            <tbody>{rows.map((r, ri) => (
              <tr key={ri}>{r.map((cVal, ci) => (
                <td key={ci} style={{ padding: "9px 12px", borderBottom: "1px solid var(--pub-line)", verticalAlign: "top" }}>{renderInline(cVal, `td${key}-${ri}-${ci}`)}</td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Маркированный список — собираем подряд идущие пункты.
    if (isBullet(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && isBullet(lines[i])) { items.push(lines[i].trim().replace(/^-\s+/, "")); i++; }
      i--;
      blocks.push(
        <ul key={`u${key++}`} style={{ margin: "4px 0", paddingLeft: 22, lineHeight: 1.7 }}>
          {items.map((it, j) => <li key={j}>{renderInline(it, `li${key}-${j}`)}</li>)}
        </ul>,
      );
      continue;
    }

    para.push(t);
  }
  flushPara();

  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{blocks}</div>;
}
