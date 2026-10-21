import { hasHandoff } from './engine.js';

const NS = 'http://www.w3.org/2000/svg';

function svg(name, attrs, text) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value == null ? '' : String(value));
  if (text != null) node.textContent = text;
  return node;
}

function clipLines(text, max) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.slice(0, 2).map((line, index, arr) => (
    index === arr.length - 1 && words.join(' ').length > line.length + 2 && line.length >= max
      ? `${line.slice(0, max - 1)}…`
      : line
  ));
}

export function renderMap(host, steps, copy) {
  host.replaceChildren();
  const list = document.createElement('ol');
  list.className = 'visually-hidden';
  if (!steps.length) {
    host.append(emptyStaff(), list);
    const note = document.createElement('p');
    note.className = 'map-empty';
    note.textContent = copy.empty;
    host.append(note);
    return;
  }

  const width = host.clientWidth || 320;
  const cols = width < 640 ? 1 : Math.min(3, Math.max(1, steps.length));
  const cardW = 236;
  const cardH = 136;
  const gapX = 56;
  const gapY = 42;
  const rows = Math.ceil(steps.length / cols);
  const svgW = cols * cardW + (cols - 1) * gapX;
  const svgH = rows * cardH + (rows - 1) * gapY;
  const board = svg('svg', {
    viewBox: `0 0 ${svgW} ${svgH}`,
    class: 'flow',
    'aria-hidden': 'true'
  });
  const defs = svg('defs', {});
  const marker = svg('marker', {
    id: 'flow-arrow', viewBox: '0 0 10 10', refX: '8', refY: '5',
    markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse'
  });
  marker.append(svg('path', { d: 'M 0 1.2 L 8 5 L 0 8.8 Z', fill: 'var(--accent-text)' }));
  defs.append(marker);
  board.append(defs);

  const pos = steps.map((_, index) => ({
    x: (index % cols) * (cardW + gapX),
    y: Math.floor(index / cols) * (cardH + gapY)
  }));

  steps.forEach((step, index) => {
    if (index === 0) return;
    const from = pos[index - 1];
    const to = pos[index];
    const sameRow = from.y === to.y;
    const x1 = sameRow ? from.x + cardW : from.x + cardW / 2;
    const y1 = sameRow ? from.y + cardH / 2 : from.y + cardH;
    const x2 = sameRow ? to.x : to.x + cardW / 2;
    const y2 = sameRow ? to.y + cardH / 2 : to.y;
    const d = sameRow
      ? `M ${x1} ${y1} C ${x1 + 28} ${y1}, ${x2 - 28} ${y2}, ${x2} ${y2}`
      : `M ${x1} ${y1} C ${x1} ${y1 + 24}, ${x2} ${y2 - 24}, ${x2} ${y2}`;
    board.append(svg('path', {
      d, fill: 'none', stroke: 'var(--accent-text)', 'stroke-width': '1.4',
      'stroke-linecap': 'round', 'marker-end': 'url(#flow-arrow)', pathLength: '1', class: 'flow-edge'
    }));
  });

  steps.forEach((step, index) => {
    const { x, y } = pos[index];
    const clip = svg('clipPath', { id: `nodeclip${index}` });
    clip.append(svg('rect', { x, y, width: cardW, height: cardH, rx: '16' }));
    defs.append(clip);
    const group = svg('g', { class: step.pending ? 'node is-pending' : 'node', 'clip-path': `url(#nodeclip${index})` });
    group.append(svg('rect', {
      x, y, width: cardW, height: cardH, rx: '16',
      fill: 'var(--bg-elev)', stroke: step.pending ? 'var(--copper)' : 'var(--line-strong)',
      'stroke-width': '1.25', 'stroke-dasharray': step.pending ? '5 4' : '0'
    }));
    group.append(svg('text', {
      x: x + 16, y: y + 24, fill: 'var(--accent-text)', 'font-size': '11',
      'font-family': 'Schibsted Grotesk, sans-serif', 'font-weight': '600'
    }, String(index + 1).padStart(2, '0')));
    const name = svg('text', {
      x: x + 16, y: y + 48, fill: 'var(--ink)', 'font-size': '15',
      'font-family': 'Schibsted Grotesk, sans-serif', 'font-weight': '600'
    });
    clipLines(step.name, 26).forEach((line, lineIndex) => {
      const span = svg('tspan', { x: x + 16, dy: lineIndex === 0 ? 0 : 18 });
      span.textContent = line;
      name.append(span);
    });
    group.append(name);
    const tools = (step.tools || []).filter(Boolean);
    group.append(svg('text', {
      x: x + 16, y: y + 100, fill: 'var(--muted)', 'font-size': '12',
      'font-family': 'Schibsted Grotesk, sans-serif'
    }, tools.length ? tools.slice(0, 3).join(' · ') : copy.noTools));
    const meta = [];
    if (step.hoursPerYear) meta.push(`${step.hoursPerYear} ${copy.perYear}`);
    else if (step.pending) meta.push(copy.pending);
    if (hasHandoff(step.handoff)) meta.push(`→ ${String(step.handoff).split(/\s+/)[0]}`);
    group.append(svg('text', {
      x: x + 16, y: y + 118, fill: 'var(--ink-soft)', 'font-size': '12',
      'font-family': 'Schibsted Grotesk, sans-serif'
    }, meta.join(' · ')));
    board.append(group);

    const item = document.createElement('li');
    const bits = [step.name];
    if (tools.length) bits.push(tools.join(', '));
    if (hasHandoff(step.handoff)) bits.push(`${copy.handoff}: ${step.handoff}`);
    if (step.hoursPerYear) bits.push(`${step.hoursPerYear} ${copy.perYear}`);
    item.textContent = bits.join('. ');
    list.append(item);
  });

  host.append(board, list);
}

function emptyStaff() {
  const board = svg('svg', { viewBox: '0 0 420 150', class: 'staff', 'aria-hidden': 'true' });
  for (let i = 0; i < 5; i += 1) {
    board.append(svg('line', {
      x1: '16', x2: '404', y1: String(28 + i * 16), y2: String(28 + i * 16),
      stroke: 'var(--line-strong)', 'stroke-width': '1'
    }));
  }
  board.append(svg('line', {
    x1: '48', y1: '118', x2: '250', y2: '18', stroke: 'var(--accent-text)',
    'stroke-width': '1.6', 'stroke-linecap': 'round'
  }));
  board.append(svg('circle', { cx: '250', cy: '18', r: '4', fill: 'var(--accent-text)' }));
  return board;
}
