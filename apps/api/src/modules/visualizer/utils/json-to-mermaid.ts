/**
 * Pure converter from the Visualizer JSON contract to Mermaid source text.
 *
 * Contract shape:
 * {
 *   type: 'process' | 'cycle' | 'hierarchy' | 'comparison' | 'mindmap' | 'timeline',
 *   title: string,
 *   language: 'kz' | 'ru',
 *   nodes: [{ id, label }],
 *   edges: [{ from, to, label? }],
 *   theme: string
 * }
 */

interface Node {
  id: string;
  label: string;
}

interface Edge {
  from: string;
  to: string;
  label?: string;
}

interface Contract {
  type?: string;
  title?: string;
  language?: string;
  nodes?: Node[];
  edges?: Edge[];
  theme?: string;
}

/**
 * Escape a label for use inside a quoted Mermaid node text.
 * - Mermaid lets us wrap text in double quotes to allow special characters.
 * - Internal double quotes are encoded as the HTML entity #quot; so the quote
 *   wrapper isn't broken.
 * - Structural Mermaid characters ([], (), {}) are HTML-escaped so they are not
 *   interpreted as shape syntax.
 */
function escapeLabel(raw: unknown): string {
  const text = String(raw ?? '');
  return text
    .replace(/"/g, '#quot;')
    .replace(/\[/g, '#91;')
    .replace(/\]/g, '#93;')
    .replace(/\(/g, '#40;')
    .replace(/\)/g, '#41;')
    .replace(/\{/g, '#123;')
    .replace(/\}/g, '#125;')
    .replace(/\r?\n/g, ' ')
    .trim();
}

/** Sanitize a node id so it is a safe Mermaid identifier. */
function safeId(raw: unknown, index: number): string {
  const id = String(raw ?? '').trim().replace(/[^A-Za-z0-9_]/g, '_');
  return id || `n${index}`;
}

function buildIdMap(nodes: Node[]): Map<string, string> {
  const map = new Map<string, string>();
  nodes.forEach((node, index) => {
    map.set(String(node.id), safeId(node.id, index));
  });
  return map;
}

function renderFlowchart(direction: 'TD' | 'LR', contract: Contract): string {
  const nodes = contract.nodes ?? [];
  const edges = contract.edges ?? [];
  const idMap = buildIdMap(nodes);

  const lines: string[] = [`flowchart ${direction}`];

  // Node declarations
  nodes.forEach((node, index) => {
    const id = idMap.get(String(node.id)) ?? safeId(node.id, index);
    lines.push(`  ${id}["${escapeLabel(node.label)}"]`);
  });

  // Edge declarations
  edges.forEach(edge => {
    const from = idMap.get(String(edge.from));
    const to = idMap.get(String(edge.to));
    if (!from || !to) return;
    if (edge.label) {
      lines.push(`  ${from} -->|"${escapeLabel(edge.label)}"| ${to}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
    }
  });

  return lines.join('\n');
}

/** process: flowchart TD, sequential nodes connected by edges. */
function renderProcess(contract: Contract): string {
  return renderFlowchart('TD', contract);
}

/** cycle: flowchart LR, last node loops back to first. */
function renderCycle(contract: Contract): string {
  const nodes = contract.nodes ?? [];
  const idMap = buildIdMap(nodes);
  const lines: string[] = ['flowchart LR'];

  nodes.forEach((node, index) => {
    const id = idMap.get(String(node.id)) ?? safeId(node.id, index);
    lines.push(`  ${id}["${escapeLabel(node.label)}"]`);
  });

  const edges = contract.edges ?? [];
  if (edges.length > 0) {
    edges.forEach(edge => {
      const from = idMap.get(String(edge.from));
      const to = idMap.get(String(edge.to));
      if (!from || !to) return;
      lines.push(`  ${from} --> ${to}`);
    });
  } else {
    // No explicit edges: connect nodes sequentially.
    for (let i = 0; i < nodes.length - 1; i++) {
      const from = idMap.get(String(nodes[i].id));
      const to = idMap.get(String(nodes[i + 1].id));
      if (from && to) lines.push(`  ${from} --> ${to}`);
    }
  }

  // Close the loop: last -> first.
  if (nodes.length > 1) {
    const last = idMap.get(String(nodes[nodes.length - 1].id));
    const first = idMap.get(String(nodes[0].id));
    if (last && first) lines.push(`  ${last} --> ${first}`);
  }

  return lines.join('\n');
}

/** hierarchy: flowchart TD, tree-like structure following edges. */
function renderHierarchy(contract: Contract): string {
  return renderFlowchart('TD', contract);
}

/** comparison: flowchart LR, common root branching into two sides. */
function renderComparison(contract: Contract): string {
  return renderFlowchart('LR', contract);
}

/** mindmap: native Mermaid mindmap syntax (root + branches + subnodes). */
function renderMindmap(contract: Contract): string {
  const nodes = contract.nodes ?? [];
  const edges = contract.edges ?? [];

  const labelById = new Map<string, string>();
  nodes.forEach(n => labelById.set(String(n.id), escapeLabel(n.label)));

  // Determine the root: a node that is never a target of an edge.
  const targets = new Set(edges.map(e => String(e.to)));
  const rootNode =
    nodes.find(n => !targets.has(String(n.id))) ?? nodes[0];

  const lines: string[] = ['mindmap'];

  if (!rootNode) return lines.join('\n');

  const rootLabel = labelById.get(String(rootNode.id)) ?? 'root';
  lines.push(`  root(("${rootLabel}"))`);

  // children-of map
  const childrenOf = new Map<string, string[]>();
  edges.forEach(e => {
    const arr = childrenOf.get(String(e.from)) ?? [];
    arr.push(String(e.to));
    childrenOf.set(String(e.from), arr);
  });

  const visited = new Set<string>([String(rootNode.id)]);

  const walk = (parentId: string, depth: number) => {
    const children = childrenOf.get(parentId) ?? [];
    for (const childId of children) {
      if (visited.has(childId)) continue;
      visited.add(childId);
      const label = labelById.get(childId) ?? childId;
      const indent = '  '.repeat(depth + 1);
      lines.push(`${indent}["${label}"]`);
      walk(childId, depth + 1);
    }
  };

  walk(String(rootNode.id), 1);

  return lines.join('\n');
}

/** timeline: native Mermaid timeline syntax (title + events). */
function renderTimeline(contract: Contract): string {
  const nodes = contract.nodes ?? [];
  const lines: string[] = ['timeline'];

  if (contract.title) {
    lines.push(`  title ${escapeLabel(contract.title)}`);
  }

  nodes.forEach(node => {
    // For timeline each node is a single event entry.
    lines.push(`  ${escapeLabel(node.label)}`);
  });

  return lines.join('\n');
}

export function jsonToMermaid(contract: any): string {
  const c: Contract = contract ?? {};
  switch (c.type) {
    case 'process':
      return renderProcess(c);
    case 'cycle':
      return renderCycle(c);
    case 'hierarchy':
      return renderHierarchy(c);
    case 'comparison':
      return renderComparison(c);
    case 'mindmap':
      return renderMindmap(c);
    case 'timeline':
      return renderTimeline(c);
    default:
      // Fallback to a generic top-down flowchart.
      return renderProcess(c);
  }
}
