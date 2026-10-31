// fx.js: text rendering (maths + words), streaming, count-ups, confetti and particles.
import { reduced, tier } from './motion.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// LaTeX → readable plain text (share card, placeholders, fallbacks when KaTeX is unavailable).
export function latexToText(s) {
  return String(s || '')
    .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
    .replace(/\\times/g, '×').replace(/\\cdot/g, '·').replace(/\\div/g, '÷').replace(/\\pm/g, '±')
    .replace(/\\le(q)?/g, '≤').replace(/\\ge(q)?/g, '≥').replace(/\\neq/g, '≠').replace(/\\pi/g, 'π').replace(/\\theta/g, 'θ')
    .replace(/\\degree|\^\\circ|\^\{\\circ\}/g, '°').replace(/\\%/g, '%')
    .replace(/\^\{?2\}?/g, '²').replace(/\^\{?3\}?/g, '³')
    .replace(/\\(left|right|,|;|!|quad|qquad)/g, ' ')
    .replace(/\\text\{([^{}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

export const plain = (text) => String(text || '').replace(/\$\$?([^$]+)\$\$?/g, (_, m) => latexToText(m)).replace(/\*\*/g, '');

export function renderMath(tex, display = false) {
  const k = globalThis.katex;
  if (k?.renderToString) {
    try { return k.renderToString(tex, { throwOnError: false, displayMode: display, output: 'html', strict: 'ignore' }); } catch { /* fall through */ }
  }
  return `<span class="math-fallback">${esc(latexToText(tex))}</span>`;
}

// Text with $maths$, **bold** and newlines → HTML where every word is a <span class="w"> (for streaming and karaoke).
export function rich(text, { words = true } = {}) {
  const src = String(text ?? '');
  const parts = src.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$|\*\*)/g);
  // Bold markers can wrap maths, so they toggle across segments. An unpaired marker stays literal.
  const markers = parts.filter((p) => p === '**').length;
  let pairsLeft = Math.floor(markers / 2) * 2;
  let bold = false;
  let html = '';
  for (const part of parts) {
    if (!part) continue;
    if (part === '**') {
      if (pairsLeft > 0) { html += bold ? '</strong>' : '<strong>'; bold = !bold; pairsLeft--; } else html += words ? '<span class="w">**</span>' : '**';
      continue;
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const display = part.startsWith('$$');
      const tex = part.slice(display ? 2 : 1, display ? -2 : -1);
      html += `<span class="${words ? 'w ' : ''}m">${renderMath(tex, display)}</span>`;
      continue;
    }
    for (const tok of part.split(/(\s+)/)) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) html += tok.includes('\n') ? '<br>'.repeat(Math.min(2, (tok.match(/\n/g) || []).length)) : ' ';
      else html += words ? `<span class="w">${esc(tok)}</span>` : esc(tok);
    }
  }
  if (bold) html += '</strong>';
  return html;
}

// Show words one by one. The words take their space from the start, so nothing shifts.
export function stream(el, html, { perWord = 26 } = {}) {
  el.innerHTML = html;
  const ws = [...el.querySelectorAll('.w')];
  if (reduced() || !ws.length) return Promise.resolve();
  el.classList.add('streaming');
  ws.forEach((w) => w.classList.add('pending'));
  return new Promise((resolve) => {
    let i = 0;
    const step = () => {
      const n = Math.max(1, Math.round(ws.length / 60)); // long replies stream a little faster
      for (let k = 0; k < n && i < ws.length; k++) ws[i++].classList.remove('pending');
      if (i < ws.length) setTimeout(step, perWord);
      else { el.classList.remove('streaming'); resolve(); }
    };
    step();
  });
}

export function countUp(el, to, { dur = 900, from = 0, suffix = '' } = {}) {
  if (reduced()) { el.textContent = `${to}${suffix}`; return Promise.resolve(); }
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - (1 - t) ** 3;
      el.textContent = `${Math.round(from + (to - from) * e)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
}

// ── One shared particle canvas: 3D paper confetti, sparkles and dust ──
let cvs = null;
let ctx = null;
let parts = [];
let raf = 0;

function ensureCanvas() {
  if (cvs) return;
  cvs = document.createElement('canvas');
  cvs.className = 'fx-canvas';
  cvs.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cvs);
  ctx = cvs.getContext('2d');
  const size = () => { const d = Math.min(2, devicePixelRatio || 1); cvs.width = innerWidth * d; cvs.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  size();
  addEventListener('resize', size);
}

function loop() {
  raf = 0;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  const now = performance.now();
  parts = parts.filter((p) => now - p.born < p.life);
  for (const p of parts) {
    const age = (now - p.born) / p.life;
    p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag;
    p.x += p.vx; p.y += p.vy;
    p.rx += p.vrx; p.rz += p.vrz;
    const alpha = age > 0.75 ? (1 - age) / 0.25 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    if (p.kind === 'paper') {
      ctx.rotate(p.rz);
      const flipY = Math.cos(p.rx); // the paper turns over in 3D
      ctx.scale(1, flipY);
      const shade = 0.55 + 0.45 * Math.abs(flipY);
      ctx.fillStyle = p.color;
      ctx.filter = 'none';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = `rgba(0,0,0,${(1 - shade).toFixed(2)})`;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      const r = p.size * (p.kind === 'spark' ? 1 - age * 0.6 : 1);
      ctx.fillStyle = p.color;
      if (p.kind === 'spark') {
        ctx.rotate(p.rz);
        ctx.beginPath();
        for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.18, r * 0.18, 0, r); ctx.quadraticCurveTo(-r * 0.18, r * 0.18, 0, 0); }
        ctx.fill();
      } else { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
  if (parts.length) raf = requestAnimationFrame(loop);
}

function add(list) {
  if (reduced()) return;
  ensureCanvas();
  parts.push(...list);
  if (!raf) raf = requestAnimationFrame(loop);
}

const PALETTE = ['#FFC93C', '#FF2E93', '#00B4D8', '#2EE59D', '#FF9933', '#7B2FF7', '#4CC9F0'];

export function confetti({ x = innerWidth / 2, y = innerHeight * 0.35, count, colors = PALETTE } = {}) {
  const n = count ?? (tier() === 'full' ? 160 : tier() === 'medium' ? 75 : 32);
  const now = performance.now();
  add(Array.from({ length: n }, () => {
    const a = Math.random() * Math.PI * 2;
    const v = 4 + Math.random() * 9.5;
    return {
      kind: 'paper', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, g: 0.22, drag: 0.985,
      w: 6 + Math.random() * 7.5, h: 9 + Math.random() * 9.5, rx: Math.random() * 6, vrx: 0.08 + Math.random() * 0.25,
      rz: Math.random() * 6, vrz: (Math.random() - 0.5) * 0.25, color: colors[(Math.random() * colors.length) | 0],
      born: now, life: 2600 + Math.random() * 1400,
    };
  }));
}

export function sparkle(x, y, { count = 16, color, spread = 4.4 } = {}) {
  const now = performance.now();
  const cols = color ? [color, '#FFC93C', '#FF2E93', '#2EE59D'] : ['#FFC93C', '#FF2E93', '#00B4D8', '#2EE59D'];
  add(Array.from({ length: tier() === 'lite' ? Math.ceil(count / 3) : count }, (_, i) => {
    const a = Math.random() * Math.PI * 2;
    const v = 0.6 + Math.random() * spread;
    return { kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, g: 0.03, drag: 0.95, size: 4.5 + Math.random() * 6.5, rx: 0, vrx: 0, rz: Math.random() * 3, vrz: (Math.random() - 0.5) * 0.2, color: cols[i % cols.length], born: now, life: 720 + Math.random() * 520 };
  }));
}

export function dust(x, y, { count = 18, color = 'rgba(255,201,60,.92)' } = {}) {
  const now = performance.now();
  const cols = [color, 'rgba(255,46,147,.88)', 'rgba(0,180,216,.88)', 'rgba(46,229,157,.9)'];
  add(Array.from({ length: tier() === 'lite' ? 6 : count }, (_, i) => ({
    kind: 'dot', x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 1.6, vy: -0.4 - Math.random() * 1.6, g: -0.005, drag: 0.97,
    size: 0.9 + Math.random() * 1.9, rx: 0, vrx: 0, rz: 0, vrz: 0, color: cols[i % cols.length], born: now, life: 800 + Math.random() * 700,
  })));
}

// Centre of an element, for particle origins.
export const centerOf = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
