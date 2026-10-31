// visual.js: F7 "Show me". Draws an animated SVG from a typed spec. Only whitelisted types; the model never sends markup.
import { esc } from './fx.js';

const C = { cyan: '#3be8ff', violet: '#8b6cff', magenta: '#ff4fd8', saffron: '#ffb547', mint: '#3dffb5', grid: 'rgba(255,255,255,.12)', axis: 'rgba(255,255,255,.55)' };
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const fmtN = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1));
const drawAttr = (delay) => `pathLength="100" class="draw" style="--len:100;--d:${delay.toFixed(2)}s"`;
const label = (x, y, text, delay, { anchor = 'middle', color, size } = {}) =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="lbl" style="--d:${delay.toFixed(2)}s${color ? `;fill:${color}` : ''}${size ? `;font-size:${size}px` : ''}">${esc(text)}</text>`;

function numberLine(s) {
  const W = 640; const H = 170; const x0 = 36; const x1 = W - 36; const y = 120;
  const min = num(s.min, 0); const max = num(s.max, 10);
  const X = (v) => x0 + ((v - min) / (max - min || 1)) * (x1 - x0);
  const range = max - min;
  const step = range <= 20 ? 1 : range <= 40 ? 2 : 5;
  let out = `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${C.axis}" stroke-width="2" ${drawAttr(0)}/>`;
  out += `<path d="M${x1 - 8} ${y - 6} L${x1 + 2} ${y} L${x1 - 8} ${y + 6}" fill="none" stroke="${C.axis}" stroke-width="2" ${drawAttr(0.6)}/>`;
  let i = 0;
  for (let v = Math.ceil(min / step) * step; v <= max; v += step, i++) {
    const x = X(v);
    out += `<line x1="${x}" y1="${y - 6}" x2="${x}" y2="${y + 6}" stroke="${C.axis}" stroke-width="1.5" ${drawAttr(0.3 + i * 0.015)}/>`;
    out += label(x, y + 24, fmtN(v), 0.5 + i * 0.015, { color: 'rgba(246,244,255,.7)', size: 12 });
  }
  (s.marks || []).forEach((m, k) => {
    const x = X(num(m.value));
    out += `<circle cx="${x}" cy="${y}" r="6" fill="${C.saffron}" class="lbl" style="--d:${(0.8 + k * 0.15).toFixed(2)}s"/>`;
    if (m.label) out += label(x, y - 14, m.label, 0.9 + k * 0.15, { color: C.saffron });
  });
  (s.jumps || []).forEach((j, k) => {
    const a = X(num(j.from)); const b = X(num(j.to));
    const h = Math.min(70, 26 + Math.abs(b - a) * 0.25);
    const d0 = 1 + k * 0.5;
    out += `<path d="M${a} ${y - 4} Q${(a + b) / 2} ${y - h * 2} ${b} ${y - 4}" fill="none" stroke="${C.cyan}" stroke-width="2.5" stroke-linecap="round" ${drawAttr(d0)}/>`;
    const dir = b > a ? -1 : 1;
    out += `<path d="M${b + dir * 8} ${y - 14} L${b} ${y - 4} L${b + dir * 10} ${y - 4}" fill="none" stroke="${C.cyan}" stroke-width="2.5" stroke-linecap="round" ${drawAttr(d0 + 0.6)}/>`;
    if (j.label) out += label((a + b) / 2, y - h - 6, j.label, d0 + 0.5, { color: C.cyan });
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}

function barModel(s) {
  const bars = (s.bars || []).slice(0, 4);
  const W = 640; const rowH = 52; const x0 = 110; const x1 = W - 20; const H = bars.length * (rowH + 14) + 16;
  let out = '';
  bars.forEach((b, r) => {
    const y = 12 + r * (rowH + 14);
    const parts = Math.max(1, Math.min(12, num(b.parts, 1)));
    const w = (x1 - x0) / parts;
    const color = r % 2 ? C.saffron : C.cyan;
    out += label(x0 - 14, y + rowH / 2 + 5, b.label || '', 0.2 + r * 0.2, { anchor: 'end', color });
    for (let p = 0; p < parts; p++) {
      const x = x0 + p * w;
      const d = 0.2 + r * 0.35 + p * 0.08;
      out += `<rect x="${(x + 2).toFixed(1)}" y="${y}" width="${(w - 4).toFixed(1)}" height="${rowH}" rx="8" fill="${color}" fill-opacity=".1" stroke="${color}" stroke-width="2" ${drawAttr(d)}/>`;
      if (b.partLabel) out += label(x + w / 2, y + rowH / 2 + 5, b.partLabel, d + 0.5);
    }
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}

function fraction(s) {
  const n = Math.max(1, Math.min(16, num(s.denominator, 4)));
  const k = Math.max(0, Math.min(n, num(s.numerator, 1)));
  let out = '';
  if (s.shape === 'bar') {
    const W = 640; const H = 130; const x0 = 30; const x1 = W - 30; const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) out += `<rect x="${(x0 + i * w + 2).toFixed(1)}" y="20" width="${(w - 4).toFixed(1)}" height="60" rx="6" fill="${i < k ? C.cyan : 'none'}" fill-opacity="${i < k ? 0.35 : 0}" stroke="${C.cyan}" stroke-width="2" ${drawAttr(0.1 + i * 0.06)}/>`;
    out += label(W / 2, 112, `${k}/${n}`, 0.9, { size: 18, color: C.cyan });
    return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
  }
  const W = 640; const H = 230; const cx = W / 2; const cy = 110; const R = 92;
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + (i / n) * Math.PI * 2; const a1 = -Math.PI / 2 + ((i + 1) / n) * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R]; const p1 = [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R];
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = n === 1 ? `M${cx - R} ${cy} A${R} ${R} 0 1 1 ${cx + R} ${cy} A${R} ${R} 0 1 1 ${cx - R} ${cy}Z` : `M${cx} ${cy} L${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${R} ${R} 0 ${large} 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Z`;
    out += `<path d="${d}" fill="${i < k ? C.violet : 'none'}" fill-opacity="${i < k ? 0.45 : 0}" stroke="${C.cyan}" stroke-width="2" ${drawAttr(0.1 + i * 0.07)}/>`;
  }
  out += label(cx, H - 4, `${k}/${n}`, 1, { size: 18, color: C.cyan });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}

function graph(s) {
  const W = 640; const H = 300; const pad = 36;
  const xMin = num(s.xMin, -5); const xMax = num(s.xMax, 5);
  const a = num(s.a, 1); const b = num(s.b, 0); const cc = num(s.c, 0);
  const f = (x) => (s.kind === 'quadratic' ? a * x * x + b * x + cc : a * x + b); // computed here, never by the model
  const pts = Array.from({ length: 121 }, (_, i) => { const x = xMin + (i / 120) * (xMax - xMin); return [x, f(x)]; });
  let yMin = Math.min(0, ...pts.map((p) => p[1])); let yMax = Math.max(0, ...pts.map((p) => p[1]));
  if (yMax - yMin < 1) { yMax += 1; yMin -= 1; }
  const span = yMax - yMin; yMin -= span * 0.08; yMax += span * 0.08;
  const X = (x) => pad + ((x - xMin) / (xMax - xMin)) * (W - pad * 2);
  const Y = (y) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - pad * 2);
  let out = '';
  const xs = Math.max(1, Math.round((xMax - xMin) / 10));
  for (let x = Math.ceil(xMin); x <= xMax; x += xs) { out += `<line x1="${X(x)}" y1="${pad - 10}" x2="${X(x)}" y2="${H - pad + 10}" stroke="${C.grid}" stroke-width="1"/>`; out += label(X(x), Math.min(H - 8, Math.max(14, Y(0) + 18)), String(x), 0.4, { size: 11, color: 'rgba(246,244,255,.6)' }); }
  out += `<line x1="${pad - 10}" y1="${Y(0)}" x2="${W - pad + 10}" y2="${Y(0)}" stroke="${C.axis}" stroke-width="1.6" ${drawAttr(0)}/>`;
  if (xMin <= 0 && xMax >= 0) out += `<line x1="${X(0)}" y1="${H - pad + 10}" x2="${X(0)}" y2="${pad - 10}" stroke="${C.axis}" stroke-width="1.6" ${drawAttr(0.2)}/>`;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(' ');
  out += `<path d="${d}" fill="none" stroke="${C.cyan}" stroke-width="3" stroke-linecap="round" ${drawAttr(0.5)}/>`;
  (s.points || []).forEach((p, i) => {
    const x = num(p.x); const y = f(x);
    out += `<circle cx="${X(x)}" cy="${Y(y)}" r="6" fill="${C.saffron}" class="lbl" style="--d:${(1.3 + i * 0.2).toFixed(2)}s"/>`;
    if (p.label) out += label(X(x), Y(y) - 12, p.label, 1.4 + i * 0.2, { color: C.saffron });
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}

function triangle(s) {
  const W = 640; const H = 280;
  const sides = s.sides || {}; const angles = s.angles || {};
  // The right-angled vertex (if any) sits at the bottom left; the letters and the sides follow the spec.
  const rightL = ['A', 'B', 'C'].find((k) => /90/.test(String(angles[k] || ''))) || 'C';
  const others = ['A', 'B', 'C'].filter((k) => k !== rightL);
  const P = { [others[0]]: [180, 40], [rightL]: [180, 230], [others[1]]: [470, 230] };
  const mid = (a, b) => [(P[a][0] + P[b][0]) / 2, (P[a][1] + P[b][1]) / 2];
  let out = `<path d="M${P.A[0]} ${P.A[1]} L${P.B[0]} ${P.B[1]} L${P.C[0]} ${P.C[1]} Z" fill="${C.violet}" fill-opacity=".08" stroke="${C.cyan}" stroke-width="2.5" stroke-linejoin="round" ${drawAttr(0.1)}/>`;
  if (/90/.test(String(angles[rightL] || ''))) { const [x, y] = P[rightL]; out += `<path d="M${x} ${y - 22} L${x + 22} ${y - 22} L${x + 22} ${y}" fill="none" stroke="${C.saffron}" stroke-width="2" ${drawAttr(0.9)}/>`; }
  // side a is opposite A (between B and C), and so on
  const opp = { a: ['B', 'C'], b: ['A', 'C'], c: ['A', 'B'] };
  let k = 0;
  for (const [sideName, [u, v]] of Object.entries(opp)) {
    if (!sides[sideName]) continue;
    const [mx, my] = mid(u, v);
    const vertical = Math.abs(P[u][0] - P[v][0]) < 1;
    const horizontal = Math.abs(P[u][1] - P[v][1]) < 1;
    out += label(vertical ? mx - 14 : horizontal ? mx : mx + 18, horizontal ? my + 28 : my, sides[sideName], 1 + k++ * 0.1, { color: C.cyan, anchor: vertical ? 'end' : horizontal ? 'middle' : 'start' });
  }
  const place = { [others[0]]: [0, -12, 'middle'], [rightL]: [-16, 18, 'end'], [others[1]]: [14, 18, 'start'] };
  for (const L of ['A', 'B', 'C']) {
    const [dx, dy, anchor] = place[L];
    out += label(P[L][0] + dx, P[L][1] + dy, `${L}${angles[L] ? ` ${angles[L]}` : ''}`, 0.8, { color: C.saffron, anchor });
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}

// Fixed schematic templates. All model-provided labels are escaped.
function schematic(s) {
  const texts = Array.isArray(s.labels) ? s.labels : [];
  const text = (x, y, value) => label(x, y, value || '?', .1, { size: 18 });
  let shape = '';
  if (s.type === 'balance') {
    shape = `<path d="M320 95V245M250 245H390M140 95H500M140 95L85 180H195ZM500 95L445 180H555Z"/><circle cx="320" cy="95" r="10" fill="${C.violet}"/>`;
    shape += text(140, 220, s.left) + text(500, 220, s.right) + text(320, 50, s.operation || '=');
  } else if (s.type === 'circuit') {
    shape = `<path d="M175 150V65H450V150M450 190V245H175V185M145 150H205M155 185H195"/><circle cx="450" cy="170" r="25"/><path d="M433 153L467 187M467 153L433 187"/>`;
    shape += text(175, 285, texts[0]) + text(450, 285, texts[1]);
  } else if (s.type === 'light_ray') {
    shape = `<path d="M160 70L320 220L480 70M120 225H520"/><path d="M320 40V220" stroke-dasharray="8 8"/><path d="M280 160L290 192L258 180M439 110L466 85L458 119"/>`;
    shape += text(145, 40, texts[0]) + text(490, 40, texts[1]) + text(320, 275, texts[2]);
  } else if (s.type === 'food_chain') {
    [80,240,400,560].forEach((x,i) => { shape += `<rect x="${x-60}" y="90" width="120" height="90" rx="22" fill="${C.violet}" fill-opacity=".15"/>`; shape += text(x, 140, texts[i]); if(i<3) shape += `<path d="M${x+65} 135H${x+90}L${x+82} 127M${x+90} 135L${x+82} 143"/>`; });
  } else if (s.type === 'cell') {
    shape = `<ellipse cx="320" cy="150" rx="180" ry="105" fill="${C.violet}" fill-opacity=".12"/><ellipse cx="320" cy="150" rx="165" ry="90"/><circle cx="320" cy="150" r="33" fill="${C.cyan}" fill-opacity=".15"/><path d="M320 150L450 35M165 115L70 55M250 190L130 270"/>`;
    shape += text(475, 28, texts[0]) + text(80, 38, texts[1]) + text(130, 292, texts[2]);
  }
  return `<svg viewBox="0 0 640 310" role="img"><g fill="none" stroke="${C.cyan}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>`;
}

const RENDER = { balance: schematic, circuit: schematic, light_ray: schematic, food_chain: schematic, cell: schematic, number_line: numberLine, bar_model: barModel, fraction, graph, triangle };

export function renderVisual(spec) {
  const fn = RENDER[spec?.type];
  if (!fn) return '';
  try { return fn(spec); } catch { return ''; }
}
