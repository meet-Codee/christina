// visual.js: F7 "Show me" + Explain Board visualiser. Draws an animated 4K-ready SVG from a typed spec. Only whitelisted types; the model never sends markup.
import { esc } from './fx.js';

const C = {
  cyan: '#4CC9F0',
  violet: '#7B2FF7',
  magenta: '#FF2E93',
  saffron: '#FFC93C',
  mint: '#2EE59D',
  grid: 'rgba(255,201,60,.16)',
  axis: 'rgba(255,250,245,.75)',
};
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const fmtN = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1));
const drawAttr = (delay) => `pathLength="100" class="draw" style="--len:100;--d:${delay.toFixed(2)}s"`;

const DEFS = `<defs>
  <linearGradient id="vg-cyan" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#00B4D8" stop-opacity="0.58"/>
    <stop offset="55%" stop-color="#4CC9F0" stop-opacity="0.45"/>
    <stop offset="100%" stop-color="#7B2FF7" stop-opacity="0.38"/>
  </linearGradient>
  <linearGradient id="vg-gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#FF2E93" stop-opacity="0.52"/>
    <stop offset="52%" stop-color="#FF9933" stop-opacity="0.52"/>
    <stop offset="100%" stop-color="#FFC93C" stop-opacity="0.44"/>
  </linearGradient>
  <linearGradient id="vg-mint" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#2EE59D" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="#00B4D8" stop-opacity="0.35"/>
  </linearGradient>
  <radialGradient id="vg-glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#FFC93C" stop-opacity="0.72"/>
    <stop offset="60%" stop-color="#FF2E93" stop-opacity="0.32"/>
    <stop offset="100%" stop-color="#FF9933" stop-opacity="0"/>
  </radialGradient>
  <pattern id="vg-dots" width="24" height="24" patternUnits="userSpaceOnUse">
    <circle cx="12" cy="12" r="1.3" fill="rgba(255,201,60,.22)"/>
  </pattern>
</defs>`;

const isUnknown = (text) => /\?/.test(String(text || ''));

const label = (x, y, text, delay, { anchor = 'middle', color, size, weight } = {}) => {
  const unk = isUnknown(text);
  const col = color || (unk ? C.saffron : '#f6f4ff');
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="lbl${unk ? ' unknown-pulse' : ''}" style="--d:${delay.toFixed(2)}s;fill:${col}${size ? `;font-size:${size}px` : ''}${weight ? `;font-weight:${weight}` : ''}">${esc(text)}</text>`;
};

const pill = (cx, cy, w, h, text, delay, { stroke = C.cyan, fill = 'url(#vg-cyan)', textColor = '#f6f4ff', size = 16 } = {}) => {
  const unk = isUnknown(text);
  const st = unk ? C.saffron : stroke;
  const fl = unk ? 'url(#vg-gold)' : fill;
  const tc = unk ? '#ffe3a3' : textColor;
  return `<g class="lbl${unk ? ' unknown-pulse' : ''}" style="--d:${delay.toFixed(2)}s">
    <rect x="${(cx - w / 2).toFixed(1)}" y="${(cy - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(h / 2).toFixed(1)}" fill="${fl}" stroke="${st}" stroke-width="1.8"/>
    <text x="${cx.toFixed(1)}" y="${(cy + size * 0.35).toFixed(1)}" text-anchor="middle" style="fill:${tc};font-size:${size}px;font-weight:700">${esc(text)}</text>
  </g>`;
};

function numberLine(s) {
  const W = 640; const H = 186; const x0 = 42; const x1 = W - 42; const y = 126;
  const min = num(s.min, 0); const max = num(s.max, 10);
  const X = (v) => x0 + ((v - min) / (max - min || 1)) * (x1 - x0);
  const range = max - min;
  const step = range <= 20 ? 1 : range <= 40 ? 2 : 5;
  let out = DEFS + `<rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="18" fill="url(#vg-dots)" opacity=".65"/>`;
  out += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${C.axis}" stroke-width="2.5" stroke-linecap="round" ${drawAttr(0)}/>`;
  out += `<path d="M${x0 + 8} ${y - 6} L${x0 - 2} ${y} L${x0 + 8} ${y + 6}" fill="none" stroke="${C.axis}" stroke-width="2" ${drawAttr(0.4)}/>`;
  out += `<path d="M${x1 - 8} ${y - 6} L${x1 + 2} ${y} L${x1 - 8} ${y + 6}" fill="none" stroke="${C.axis}" stroke-width="2" ${drawAttr(0.5)}/>`;
  let i = 0;
  for (let v = Math.ceil(min / step) * step; v <= max; v += step, i++) {
    const x = X(v);
    out += `<line x1="${x}" y1="${y - 7}" x2="${x}" y2="${y + 7}" stroke="${C.axis}" stroke-width="1.6" ${drawAttr(0.2 + i * 0.015)}/>`;
    out += label(x, y + 26, fmtN(v), 0.35 + i * 0.015, { color: 'rgba(246,244,255,.78)', size: 12 });
  }
  (s.marks || []).forEach((m, k) => {
    const x = X(num(m.value));
    out += `<circle cx="${x}" cy="${y}" r="7" fill="${C.saffron}" stroke="#121633" stroke-width="2" class="lbl" style="--d:${(0.6 + k * 0.14).toFixed(2)}s"/>`;
    if (m.label) out += pill(x, y - 24, Math.max(40, String(m.label).length * 10 + 18), 24, m.label, 0.7 + k * 0.14, { stroke: C.saffron, fill: 'url(#vg-gold)', size: 13 });
  });
  (s.jumps || []).forEach((j, k) => {
    const a = X(num(j.from)); const b = X(num(j.to));
    const h = Math.min(72, 28 + Math.abs(b - a) * 0.25);
    const d0 = 0.8 + k * 0.45;
    out += `<path d="M${a} ${y - 5} Q${(a + b) / 2} ${y - h * 2} ${b} ${y - 5}" fill="none" stroke="${C.cyan}" stroke-width="2.8" stroke-linecap="round" ${drawAttr(d0)}/>`;
    const dir = b > a ? -1 : 1;
    out += `<path d="M${b + dir * 8} ${y - 15} L${b} ${y - 5} L${b + dir * 10} ${y - 4}" fill="none" stroke="${C.cyan}" stroke-width="2.6" stroke-linecap="round" ${drawAttr(d0 + 0.45)}/>`;
    if (j.label) out += pill((a + b) / 2, y - h - 10, Math.max(48, String(j.label).length * 9 + 20), 24, j.label, d0 + 0.4, { size: 13 });
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}

function barModel(s) {
  const bars = (s.bars || []).slice(0, 4);
  const W = 640; const rowH = 54; const x0 = 116; const x1 = W - 26; const H = bars.length * (rowH + 16) + 24;
  let out = DEFS;
  bars.forEach((b, r) => {
    const y = 14 + r * (rowH + 16);
    const parts = Math.max(1, Math.min(12, num(b.parts, 1)));
    const w = (x1 - x0) / parts;
    const color = r % 2 ? C.saffron : C.cyan;
    const fill = r % 2 ? 'url(#vg-gold)' : 'url(#vg-cyan)';
    out += label(x0 - 16, y + rowH / 2 + 6, b.label || '', 0.15 + r * 0.18, { anchor: 'end', color, size: 16, weight: 700 });
    for (let p = 0; p < parts; p++) {
      const x = x0 + p * w;
      const d = 0.15 + r * 0.28 + p * 0.06;
      out += `<rect x="${(x + 2.5).toFixed(1)}" y="${y}" width="${(w - 5).toFixed(1)}" height="${rowH}" rx="10" fill="${fill}" stroke="${color}" stroke-width="2" ${drawAttr(d)}/>`;
      if (b.partLabel) out += label(x + w / 2, y + rowH / 2 + 6, b.partLabel, d + 0.35, { size: 16, weight: 700 });
    }
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}

function fraction(s) {
  const n = Math.max(1, Math.min(16, num(s.denominator, 4)));
  const k = Math.max(0, Math.min(n, num(s.numerator, 1)));
  let out = DEFS;
  if (s.shape === 'bar') {
    const W = 640; const H = 140; const x0 = 34; const x1 = W - 34; const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) out += `<rect x="${(x0 + i * w + 2.5).toFixed(1)}" y="22" width="${(w - 5).toFixed(1)}" height="62" rx="8" fill="${i < k ? 'url(#vg-cyan)' : 'rgba(255,255,255,.03)'}" stroke="${i < k ? C.cyan : 'rgba(255,255,255,.28)'}" stroke-width="2" ${drawAttr(0.1 + i * 0.05)}/>`;
    out += pill(W / 2, 112, 76, 30, `${k}/${n}`, 0.7, { size: 16 });
    return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
  }
  const W = 640; const H = 240; const cx = W / 2; const cy = 108; const R = 88;
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + (i / n) * Math.PI * 2; const a1 = -Math.PI / 2 + ((i + 1) / n) * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R]; const p1 = [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R];
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = n === 1 ? `M${cx - R} ${cy} A${R} ${R} 0 1 1 ${cx + R} ${cy} A${R} ${R} 0 1 1 ${cx - R} ${cy}Z` : `M${cx} ${cy} L${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${R} ${R} 0 ${large} 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Z`;
    out += `<path d="${d}" fill="${i < k ? 'url(#vg-cyan)' : 'rgba(255,255,255,.03)'}" stroke="${i < k ? C.cyan : 'rgba(255,255,255,.3)'}" stroke-width="2" ${drawAttr(0.1 + i * 0.06)}/>`;
  }
  out += pill(cx, H - 18, 76, 30, `${k}/${n}`, 0.85, { size: 16 });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}

function graph(s) {
  const W = 640; const H = 300; const pad = 38;
  const xMin = num(s.xMin, -5); const xMax = num(s.xMax, 5);
  const a = num(s.a, 1); const b = num(s.b, 0); const cc = num(s.c, 0);
  const f = (x) => (s.kind === 'quadratic' ? a * x * x + b * x + cc : a * x + b);
  const pts = Array.from({ length: 121 }, (_, i) => { const x = xMin + (i / 120) * (xMax - xMin); return [x, f(x)]; });
  let yMin = Math.min(0, ...pts.map((p) => p[1])); let yMax = Math.max(0, ...pts.map((p) => p[1]));
  if (yMax - yMin < 1) { yMax += 1; yMin -= 1; }
  const span = yMax - yMin; yMin -= span * 0.08; yMax += span * 0.08;
  const X = (x) => pad + ((x - xMin) / (xMax - xMin)) * (W - pad * 2);
  const Y = (y) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - pad * 2);
  let out = DEFS;
  const xs = Math.max(1, Math.round((xMax - xMin) / 10));
  for (let x = Math.ceil(xMin); x <= xMax; x += xs) {
    out += `<line x1="${X(x)}" y1="${pad - 10}" x2="${X(x)}" y2="${H - pad + 10}" stroke="${C.grid}" stroke-width="1"/>`;
    out += label(X(x), Math.min(H - 8, Math.max(14, Y(0) + 18)), String(x), 0.3, { size: 11, color: 'rgba(246,244,255,.62)' });
  }
  out += `<line x1="${pad - 10}" y1="${Y(0)}" x2="${W - pad + 10}" y2="${Y(0)}" stroke="${C.axis}" stroke-width="1.8" ${drawAttr(0)}/>`;
  if (xMin <= 0 && xMax >= 0) out += `<line x1="${X(0)}" y1="${H - pad + 10}" x2="${X(0)}" y2="${pad - 10}" stroke="${C.axis}" stroke-width="1.8" ${drawAttr(0.15)}/>`;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(' ');
  out += `<path d="${d}" fill="none" stroke="${C.cyan}" stroke-width="3.2" stroke-linecap="round" ${drawAttr(0.4)}/>`;
  (s.points || []).forEach((p, i) => {
    const x = num(p.x); const y = f(x);
    out += `<circle cx="${X(x)}" cy="${Y(y)}" r="6.5" fill="${C.saffron}" stroke="#121633" stroke-width="2" class="lbl" style="--d:${(1.1 + i * 0.18).toFixed(2)}s"/>`;
    if (p.label) out += label(X(x), Y(y) - 14, p.label, 1.2 + i * 0.18, { color: C.saffron, weight: 700 });
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}

function triangle(s) {
  const W = 640; const H = 280;
  const sides = s.sides || {}; const angles = s.angles || {};
  const rightL = ['A', 'B', 'C'].find((k) => /90/.test(String(angles[k] || ''))) || 'C';
  const others = ['A', 'B', 'C'].filter((k) => k !== rightL);
  const P = { [others[0]]: [180, 42], [rightL]: [180, 232], [others[1]]: [470, 232] };
  const mid = (a, b) => [(P[a][0] + P[b][0]) / 2, (P[a][1] + P[b][1]) / 2];
  let out = DEFS + `<path d="M${P.A[0]} ${P.A[1]} L${P.B[0]} ${P.B[1]} L${P.C[0]} ${P.C[1]} Z" fill="url(#vg-cyan)" stroke="${C.cyan}" stroke-width="2.8" stroke-linejoin="round" ${drawAttr(0.1)}/>`;
  if (/90/.test(String(angles[rightL] || ''))) {
    const [x, y] = P[rightL];
    out += `<path d="M${x} ${y - 22} L${x + 22} ${y - 22} L${x + 22} ${y}" fill="none" stroke="${C.saffron}" stroke-width="2.2" ${drawAttr(0.7)}/>`;
  }
  const opp = { a: ['B', 'C'], b: ['A', 'C'], c: ['A', 'B'] };
  let k = 0;
  for (const [sideName, [u, v]] of Object.entries(opp)) {
    if (!sides[sideName]) continue;
    const [mx, my] = mid(u, v);
    const vertical = Math.abs(P[u][0] - P[v][0]) < 1;
    const horizontal = Math.abs(P[u][1] - P[v][1]) < 1;
    out += label(vertical ? mx - 16 : horizontal ? mx : mx + 20, horizontal ? my + 30 : my, sides[sideName], 0.8 + k++ * 0.1, { color: isUnknown(sides[sideName]) ? C.saffron : C.cyan, anchor: vertical ? 'end' : horizontal ? 'middle' : 'start', size: 16, weight: 700 });
  }
  const place = { [others[0]]: [0, -14, 'middle'], [rightL]: [-16, 18, 'end'], [others[1]]: [16, 18, 'start'] };
  for (const L of ['A', 'B', 'C']) {
    const [dx, dy, anchor] = place[L];
    out += label(P[L][0] + dx, P[L][1] + dy, `${L}${angles[L] ? ` ${angles[L]}` : ''}`, 0.65, { color: C.saffron, anchor, weight: 700 });
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}

// Render visual weight blocks sitting on a balance pan for an expression like "3x + 7", "22", or "?"
function panWeights(cx, panY, expr, delay) {
  const raw = String(expr || '?').trim();
  const tokens = raw.split(/\s*(?=[+-])\s*/).map((t) => t.replace(/^\+\s*/, '').trim()).filter(Boolean).slice(0, 3);
  const items = tokens.length ? tokens : [raw || '?'];
  const gap = 8;
  const widths = items.map((t) => Math.max(54, Math.min(104, t.length * 12 + 28)));
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let x = cx - totalW / 2;
  let out = '';
  items.forEach((tok, i) => {
    const w = widths[i];
    const h = 42;
    const bx = x + w / 2;
    const by = panY - h / 2 - 4;
    const unk = isUnknown(tok);
    const hasVar = /[a-zA-Z]/.test(tok);
    const fill = unk ? 'url(#vg-gold)' : hasVar ? 'url(#vg-cyan)' : 'url(#vg-mint)';
    const stroke = unk ? C.saffron : hasVar ? C.cyan : C.mint;
    if (unk) out += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="34" fill="url(#vg-glow)" class="lbl unknown-pulse" style="--d:${(delay + i * 0.1).toFixed(2)}s"/>`;
    out += pill(bx, by, w, h, tok, delay + i * 0.1, { stroke, fill, size: unk ? 20 : 17 });
    x += w + gap;
  });
  return out;
}

// Fixed schematic templates with 4K styling and animations. All model-provided labels are escaped.
function schematic(s) {
  const texts = Array.isArray(s.labels) ? s.labels : [];
  let shape = DEFS + `<rect x="10" y="10" width="620" height="290" rx="22" fill="url(#vg-dots)" opacity=".6"/>`;

  if (s.type === 'balance') {
    const op = s.operation || '=';
    const hasAction = op && op !== '=';
    // Fulcrum base + pillar
    shape += `<path d="M235 276H405" stroke="${C.axis}" stroke-width="4" stroke-linecap="round" ${drawAttr(0.05)}/>`;
    shape += `<path d="M294 276L320 112L346 276Z" fill="url(#vg-cyan)" stroke="${C.cyan}" stroke-width="2.2" stroke-linejoin="round" ${drawAttr(0.12)}/>`;
    // Cross-beam
    shape += `<line x1="125" y1="112" x2="515" y2="112" stroke="${C.saffron}" stroke-width="4.5" stroke-linecap="round" ${drawAttr(0.22)}/>`;
    shape += `<circle cx="320" cy="112" r="11" fill="${C.saffron}" stroke="#121633" stroke-width="2.5" class="lbl" style="--d:0.25s"/>`;
    // Left and right suspension chains + pans
    [155, 485].forEach((px, idx) => {
      const d = 0.3 + idx * 0.12;
      shape += `<path d="M${px} 112L${px - 56} 198M${px} 112L${px + 56} 198" stroke="rgba(246,244,255,.48)" stroke-width="1.8" stroke-dasharray="4 3" ${drawAttr(d)}/>`;
      shape += `<path d="M${px - 72} 198 Q${px} 216 ${px + 72} 198" fill="url(#vg-cyan)" stroke="${C.cyan}" stroke-width="3" stroke-linecap="round" ${drawAttr(d + 0.08)}/>`;
    });
    // Weight blocks sitting on left and right pans
    shape += panWeights(155, 198, s.left || '?', 0.48);
    shape += panWeights(485, 198, s.right || '?', 0.58);
    // Top operation badge (e.g. "=" or "− 7 | − 7")
    const opW = Math.max(68, Math.min(240, String(op).length * 11 + 36));
    shape += pill(320, 52, opW, 38, op, 0.65, {
      stroke: hasAction ? C.saffron : C.cyan,
      fill: hasAction ? 'url(#vg-gold)' : 'url(#vg-cyan)',
      textColor: hasAction ? '#ffe6a8' : '#f6f4ff',
      size: 17,
    });
    if (hasAction) {
      shape += `<path d="M250 52 Q185 52 165 128" fill="none" stroke="${C.saffron}" stroke-width="1.8" stroke-dasharray="5 4" ${drawAttr(0.72)}/>`;
      shape += `<path d="M390 52 Q455 52 475 128" fill="none" stroke="${C.saffron}" stroke-width="1.8" stroke-dasharray="5 4" ${drawAttr(0.72)}/>`;
    }
  } else if (s.type === 'circuit') {
    // Wire loop
    shape += `<path d="M175 136V64H455V136M455 196V242H175V182" fill="none" stroke="${C.cyan}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" ${drawAttr(0.1)}/>`;
    // Current flow arrows
    shape += `<path d="M305 56L320 64L305 72M325 234L310 242L325 250" fill="none" stroke="${C.mint}" stroke-width="2.4" stroke-linecap="round" ${drawAttr(0.55)}/>`;
    // Battery plates (+ and -)
    shape += `<line x1="142" y1="144" x2="208" y2="144" stroke="${C.saffron}" stroke-width="3.6" stroke-linecap="round" ${drawAttr(0.3)}/>`;
    shape += `<line x1="156" y1="168" x2="194" y2="168" stroke="${C.cyan}" stroke-width="3.6" stroke-linecap="round" ${drawAttr(0.36)}/>`;
    shape += label(126, 148, '+', 0.4, { color: C.saffron, size: 16, weight: 700 });
    shape += label(126, 173, '−', 0.4, { color: C.cyan, size: 16, weight: 700 });
    // Glowing bulb
    shape += `<circle cx="455" cy="166" r="44" fill="url(#vg-glow)" class="lbl" style="--d:0.45s"/>`;
    shape += `<circle cx="455" cy="166" r="28" fill="url(#vg-gold)" stroke="${C.saffron}" stroke-width="2.6" ${drawAttr(0.4)}/>`;
    shape += `<path d="M443 176 Q455 146 467 176" fill="none" stroke="#ffe5a3" stroke-width="2.4" ${drawAttr(0.55)}/>`;
    shape += pill(175, 276, 150, 32, texts[0] || 'Battery', 0.65, { size: 14 });
    shape += pill(455, 276, 150, 32, texts[1] || 'Bulb', 0.72, { stroke: C.saffron, fill: 'url(#vg-gold)', size: 14 });
  } else if (s.type === 'light_ray') {
    // Mirror surface + hatching
    shape += `<line x1="120" y1="226" x2="520" y2="226" stroke="${C.cyan}" stroke-width="3.5" stroke-linecap="round" ${drawAttr(0.1)}/>`;
    for (let x = 140; x <= 500; x += 24) {
      shape += `<line x1="${x}" y1="226" x2="${x - 10}" y2="240" stroke="rgba(59,232,255,.45)" stroke-width="1.5"/>`;
    }
    // Normal line
    shape += `<line x1="320" y1="46" x2="320" y2="226" stroke="rgba(246,244,255,.5)" stroke-width="2" stroke-dasharray="6 6" ${drawAttr(0.25)}/>`;
    // Incident ray + arrow
    shape += `<line x1="150" y1="68" x2="320" y2="226" stroke="${C.saffron}" stroke-width="3.2" stroke-linecap="round" ${drawAttr(0.38)}/>`;
    shape += `<path d="M236 135L250 161L222 152" fill="none" stroke="${C.saffron}" stroke-width="2.6" stroke-linecap="round" ${drawAttr(0.5)}/>`;
    // Reflected ray + arrow
    shape += `<line x1="320" y1="226" x2="490" y2="68" stroke="${C.mint}" stroke-width="3.2" stroke-linecap="round" ${drawAttr(0.55)}/>`;
    shape += `<path d="M402 135L418 122L414 148" fill="none" stroke="${C.mint}" stroke-width="2.6" stroke-linecap="round" ${drawAttr(0.68)}/>`;
    // Angle arcs θi and θr
    shape += `<path d="M286 194 A46 46 0 0 1 320 180" fill="none" stroke="${C.saffron}" stroke-width="2" ${drawAttr(0.75)}/>`;
    shape += `<path d="M320 180 A46 46 0 0 1 354 194" fill="none" stroke="${C.mint}" stroke-width="2" ${drawAttr(0.75)}/>`;
    shape += pill(155, 42, 160, 32, texts[0] || 'Incident ray', 0.78, { stroke: C.saffron, fill: 'url(#vg-gold)', size: 14 });
    shape += pill(485, 42, 160, 32, texts[1] || 'Reflected ray', 0.84, { stroke: C.mint, fill: 'url(#vg-mint)', size: 14 });
    shape += pill(320, 274, 160, 32, texts[2] || 'Mirror', 0.9, { size: 14 });
  } else if (s.type === 'food_chain') {
    const cols = [C.mint, C.cyan, C.saffron, C.magenta];
    const fills = ['url(#vg-mint)', 'url(#vg-cyan)', 'url(#vg-gold)', 'url(#vg-cyan)'];
    [88, 242, 398, 552].forEach((x, i) => {
      const d = 0.15 + i * 0.16;
      shape += `<rect x="${x - 62}" y="88" width="124" height="118" rx="22" fill="${fills[i]}" stroke="${cols[i]}" stroke-width="2.4" ${drawAttr(d)}/>`;
      shape += `<circle cx="${x}" cy="116" r="14" fill="rgba(10,12,28,.55)" stroke="${cols[i]}" stroke-width="1.6" class="lbl" style="--d:${(d + 0.1).toFixed(2)}s"/>`;
      shape += label(x, 121, String(i + 1), d + 0.12, { color: cols[i], size: 13, weight: 700 });
      shape += label(x, 164, texts[i] || '?', d + 0.18, { size: 15, weight: 700 });
      if (i < 3) {
        shape += `<path d="M${x + 66} 147H${x + 88}M${x + 80} 139L${x + 88} 147L${x + 80} 155" fill="none" stroke="${C.saffron}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" ${drawAttr(d + 0.22)}/>`;
      }
    });
  } else if (s.type === 'cell') {
    // Outer cell membrane + inner cytoplasm
    shape += `<ellipse cx="320" cy="154" rx="184" ry="104" fill="url(#vg-cyan)" stroke="${C.cyan}" stroke-width="3" ${drawAttr(0.1)}/>`;
    shape += `<ellipse cx="320" cy="154" rx="164" ry="86" fill="rgba(59,232,255,.06)" stroke="${C.mint}" stroke-width="1.8" stroke-dasharray="6 4" ${drawAttr(0.22)}/>`;
    // Organelles (mitochondria / vacuoles)
    shape += `<ellipse cx="225" cy="128" rx="22" ry="11" transform="rotate(-18 225 128)" fill="url(#vg-gold)" stroke="${C.saffron}" stroke-width="1.8" ${drawAttr(0.35)}/>`;
    shape += `<ellipse cx="408" cy="182" rx="22" ry="11" transform="rotate(22 408 182)" fill="url(#vg-gold)" stroke="${C.saffron}" stroke-width="1.8" ${drawAttr(0.4)}/>`;
    // Nucleus + nucleolus
    shape += `<circle cx="320" cy="154" r="46" fill="url(#vg-glow)" class="lbl" style="--d:0.42s"/>`;
    shape += `<circle cx="320" cy="154" r="34" fill="url(#vg-gold)" stroke="${C.saffron}" stroke-width="2.6" ${drawAttr(0.45)}/>`;
    shape += `<circle cx="328" cy="148" r="10" fill="${C.saffron}" opacity=".65" class="lbl" style="--d:0.55s"/>`;
    // Callout leader lines + pills
    shape += `<path d="M344 130L442 46" fill="none" stroke="${C.saffron}" stroke-width="2" ${drawAttr(0.6)}/>`;
    shape += `<path d="M168 102L116 46" fill="none" stroke="${C.cyan}" stroke-width="2" ${drawAttr(0.66)}/>`;
    shape += `<path d="M254 202L168 268" fill="none" stroke="${C.mint}" stroke-width="2" ${drawAttr(0.72)}/>`;
    shape += pill(508, 42, 150, 32, texts[0] || 'Nucleus', 0.75, { stroke: C.saffron, fill: 'url(#vg-gold)', size: 14 });
    shape += pill(116, 42, 150, 32, texts[1] || 'Membrane', 0.8, { size: 14 });
    shape += pill(168, 274, 150, 32, texts[2] || 'Cytoplasm', 0.85, { stroke: C.mint, fill: 'url(#vg-mint)', size: 14 });
  }
  return `<svg viewBox="0 0 640 310" role="img">${shape}</svg>`;
}

const RENDER = { balance: schematic, circuit: schematic, light_ray: schematic, food_chain: schematic, cell: schematic, number_line: numberLine, bar_model: barModel, fraction, graph, triangle };

export function renderVisual(spec) {
  const fn = RENDER[spec?.type];
  if (!fn) return '';
  try { return fn(spec); } catch { return ''; }
}
