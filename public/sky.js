// sky.js: F6 "My Sky". Every solved problem becomes a star on a slowly turning 3D sphere (canvas-2D projection).
// Size shows independence, colour shows subject, and stars from the same day are joined into a constellation.
import { animate, DUR, EASE, reduced } from './motion.js';
import { esc, rich } from './fx.js';
import { byCode } from './i18n.js';

const KEY = 'christina.sky';
const SUBJECT = {
  maths: ['#3be8ff', 'Maths'], physics: ['#8b6cff', 'Physics'], chemistry: ['#ff4fd8', 'Chemistry'],
  biology: ['#3dffb5', 'Biology'], science: ['#7dffb0', 'Science'], other: ['#ffb547', 'Other'],
};

export function loadSky() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function saveSky(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-500))); } catch { /* full */ } }

export function addStar(rec, { update = false } = {}) {
  const list = loadSky();
  const i = list.findIndex((s) => s.id === rec.id);
  if (update) { if (i >= 0) { list[i] = { ...list[i], ...rec }; saveSky(list); return list[i]; } return rec; }
  const star = { id: rec.id, problem: rec.problem, subject: SUBJECT[rec.subject] ? rec.subject : 'maths', stars: rec.stars || 1, hints: rec.hints || 0, teachScore: rec.teachScore ?? null, lang: rec.lang, date: rec.date || new Date().toISOString() };
  if (i >= 0) list[i] = star; else list.push(star);
  saveSky(list);
  return star;
}

const dayKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

export function streakDays(list = loadSky()) {
  const days = new Set(list.map((s) => dayKey(s.date)));
  let n = 0;
  const d = new Date();
  if (!days.has(dayKey(d.toISOString()))) d.setDate(d.getDate() - 1); // a streak survives until the end of today
  while (days.has(dayKey(d.toISOString()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

let open = false;
let closer = null;
export const skyOpen = () => open;
export const closeSky = () => closer?.();

export function openSky(ctx, trigger) {
  if (open) return;
  const $ = (id) => document.getElementById(id);
  const view = $('sky');
  const canvas = $('skyCanvas');
  const c = canvas.getContext('2d');
  const tip = $('skyTip');
  const list = loadSky().sort((a, b) => new Date(a.date) - new Date(b.date));
  const rm = reduced();
  open = true;
  view.hidden = false;
  $('app').setAttribute('inert', '');
  ctx.aurora.pausedState = true; // at most two WebGL contexts, and the sky needs the GPU time
  ctx.orb.paused = true;
  const under = [$('app'), document.querySelector('.bg')];
  setTimeout(() => { if (open) under.forEach((el) => { el.style.visibility = 'hidden'; }); }, 750); // the sky is opaque: skip painting what's underneath
  animate(view, [{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'none' }], { duration: DUR.l, easing: EASE.out }, 'enter');
  $('skyTotal').textContent = String(list.length);
  $('skyStreak').textContent = String(streakDays(list));
  $('skyEmpty').hidden = list.length > 0;
  $('skyShare').hidden = list.length === 0;
  $('skyLegend').innerHTML = Object.values(SUBJECT).filter(([, n]) => n !== 'Science').map(([col, n]) => `<span><i style="background:${col}"></i>${n}</span>`).join('') + '<span>· bigger star = fewer hints</span>';
  tip.hidden = true;
  setTimeout(() => $('skyClose').focus({ preventScroll: true }), 60);

  // Each day gets its own spot on the sphere (Fibonacci spread); that day's stars cluster around it as a constellation.
  const days = [...new Set(list.map((s) => dayKey(s.date)))];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const centre = (i, n) => {
    const y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
    const r = Math.sqrt(1 - y * y);
    return [Math.cos(golden * i) * r, y, Math.sin(golden * i) * r];
  };
  const spread = Math.min(0.42, 1.6 / Math.sqrt(Math.max(1, days.length)));
  const perDay = new Map();
  const stars = list.map((s) => {
    const di = days.indexOf(dayKey(s.date));
    const k = perDay.get(di) || 0;
    perDay.set(di, k + 1);
    const [cx, cy, cz] = centre(di, days.length);
    // a small spiral around the day's centre, in the tangent plane
    const ang = k * 2.4; const rad = k ? spread * (0.35 + 0.65 * Math.sqrt(k / 8)) : 0;
    const t1 = Math.abs(cy) < 0.9 ? [-cz, 0, cx] : [0, cz, -cy];
    const l1 = Math.hypot(...t1) || 1; const u = t1.map((v) => v / l1);
    const w = [cy * u[2] - cz * u[1], cz * u[0] - cx * u[2], cx * u[1] - cy * u[0]];
    let p = [cx + (u[0] * Math.cos(ang) + w[0] * Math.sin(ang)) * rad, cy + (u[1] * Math.cos(ang) + w[1] * Math.sin(ang)) * rad, cz + (u[2] * Math.cos(ang) + w[2] * Math.sin(ang)) * rad];
    const pl = Math.hypot(...p) || 1; p = p.map((v) => v / pl);
    return { ...s, x: p[0], y: p[1], z: p[2], day: di, size: 2.2 + (s.stars || 1) * 1.5, color: (SUBJECT[s.subject] || SUBJECT.maths)[0], tw: Math.random() * 6 };
  });
  const dust = Array.from({ length: 360 }, () => {
    const u = Math.random() * 2 - 1; const a = Math.random() * Math.PI * 2; const r = Math.sqrt(1 - u * u);
    return { x: Math.cos(a) * r * 2.6, y: u * 2.6, z: Math.sin(a) * r * 2.6, s: Math.random() * 1.1 + 0.2, tw: Math.random() * 6 };
  });
  // Lines join stars solved on the same day, in the order they were solved.
  const links = [];
  for (let i = 1; i < stars.length; i++) if (stars[i].day === stars[i - 1].day) links.push([i - 1, i]);
  // Pre-rendered glow sprites (one per colour) keep 200+ stars cheap to draw every frame.
  const sprites = new Map();
  const sprite = (col) => {
    if (sprites.has(col)) return sprites.get(col);
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g2 = cv.getContext('2d');
    const gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col); gr.addColorStop(0.25, `${col}66`); gr.addColorStop(1, `${col}00`);
    g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
    sprites.set(col, cv);
    return cv;
  };

  let yaw = 0.4; let pitch = -0.25; let vy = rm ? 0 : 0.0016; let vp = 0;
  let W = 0; let H = 0; let dpr = 1;
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize();
  addEventListener('resize', resize);

  const project = (p) => {
    const cy = Math.cos(yaw); const sy = Math.sin(yaw); const cp = Math.cos(pitch); const sp = Math.sin(pitch);
    const x1 = p.x * cy - p.z * sy; const z1 = p.x * sy + p.z * cy;
    const y1 = p.y * cp - z1 * sp; const z2 = p.y * sp + z1 * cp;
    const R = Math.min(W, H) * 0.33;
    const D = 3.2;
    const k = D / (D + z2);
    return { sx: W / 2 + x1 * R * k, sy: H / 2 + y1 * R * k, k, z: z2 };
  };

  let dragging = false; let lx = 0; let ly = 0; let moved = 0; let raf = 0; let selected = null;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    if (!dragging) { yaw += vy; pitch += vp; vp *= 0.95; if (!rm) vy += (0.0016 - vy) * 0.02; pitch = Math.max(-1.2, Math.min(1.2, pitch)); }
    const t = now / 1000;
    c.clearRect(0, 0, W, H);
    // Background dust
    for (const d of dust) {
      const p = project(d);
      if (p.z < -2.4) continue;
      c.globalAlpha = (0.25 + 0.35 * Math.sin(t * 1.3 + d.tw)) * Math.min(1, p.k);
      c.fillStyle = '#cfd6ff';
      c.fillRect(p.sx, p.sy, d.s, d.s);
    }
    const proj = stars.map((s) => ({ s, p: project(s) }));
    // Constellation lines
    c.lineWidth = 1;
    for (const [a, b] of links) {
      const pa = proj[a].p; const pb = proj[b].p;
      const depth = Math.min(1, Math.max(0.15, (pa.k + pb.k) / 2 - 0.35));
      c.globalAlpha = 0.5 * depth;
      c.strokeStyle = proj[a].s.color;
      c.beginPath(); c.moveTo(pa.sx, pa.sy); c.lineTo(pb.sx, pb.sy); c.stroke();
    }
    // Stars, back to front
    proj.sort((a, b) => b.p.z - a.p.z);
    for (const { s, p } of proj) {
      const tw = rm ? 1 : 0.8 + 0.2 * Math.sin(t * 2 + s.tw);
      const r = s.size * p.k * tw * (s === selected ? 1.5 : 1);
      const alpha = Math.min(1, Math.max(0.25, p.k - 0.2));
      c.globalAlpha = alpha * 0.9;
      c.drawImage(sprite(s.color), p.sx - r * 5, p.sy - r * 5, r * 10, r * 10);
      c.globalAlpha = alpha;
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(p.sx, p.sy, r * 0.6, 0, Math.PI * 2); c.fill();
      s._sx = p.sx; s._sy = p.sy; s._r = r;
    }
    c.globalAlpha = 1;
    if (selected) placeTip(selected);
  };
  raf = requestAnimationFrame(frame);

  const placeTip = (s) => {
    const x = Math.min(W - tip.offsetWidth - 12, Math.max(12, s._sx + 18));
    const y = Math.min(H - tip.offsetHeight - 12, Math.max(70, s._sy - tip.offsetHeight / 2));
    tip.style.left = `${x}px`; tip.style.top = `${y}px`;
  };

  const pick = (x, y) => {
    let best = null; let bd = 22;
    for (const s of stars) { const d = Math.hypot((s._sx ?? -99) - x, (s._sy ?? -99) - y); if (d < bd) { bd = d; best = s; } }
    return best;
  };

  const showTip = (s) => {
    selected = s;
    if (!s) { tip.hidden = true; return; }
    const l = byCode(s.lang);
    const d = new Date(s.date);
    tip.innerHTML = `<div class="st-date">${esc(d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }))} · ${esc((SUBJECT[s.subject] || SUBJECT.maths)[1])}</div>
      <div class="st-text" lang="${l.tag}">${rich(s.problem, { words: false })}</div>
      <div>${'★'.repeat(s.stars)}${'☆'.repeat(3 - s.stars)} <span class="hint-text">${s.hints ? `${s.hints} hint${s.hints > 1 ? 's' : ''}` : 'no hints'}${s.teachScore != null ? ` · explained ${s.teachScore}/100` : ''}</span></div>
      <button class="btn small" type="button" style="margin-top:.6rem"><svg class="ic"><use href="#i-share"/></svg>Share</button>`;
    tip.querySelector('button').onclick = () => ctx.shareLesson(s);
    tip.hidden = false;
    animate(tip, [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: DUR.s, easing: EASE.out }, 'enter');
    placeTip(s);
  };

  const pd = (e) => { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); vy = 0; vp = 0; };
  const pm = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx; const dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    yaw += dx * 0.006; pitch += dy * 0.006;
    if (!rm) { vy = dx * 0.0006; vp = dy * 0.0006; }
  };
  const pu = (e) => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6) { const r = canvas.getBoundingClientRect(); showTip(pick(e.clientX - r.left, e.clientY - r.top)); }
    if (rm) { vy = 0; vp = 0; }
  };
  canvas.addEventListener('pointerdown', pd);
  canvas.addEventListener('pointermove', pm);
  canvas.addEventListener('pointerup', pu);
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (selected) showTip(null); else close(); }
    else if (e.key === 'ArrowLeft') yaw -= 0.15;
    else if (e.key === 'ArrowRight') yaw += 0.15;
    else if (e.key === 'ArrowUp') pitch -= 0.15;
    else if (e.key === 'ArrowDown') pitch += 0.15;
  };
  addEventListener('keydown', onKey, true);
  $('skyClose').onclick = () => close();
  $('skyStart').onclick = () => { close(); setTimeout(() => document.getElementById('ask').focus(), 300); };
  $('skyShare').onclick = () => { const last = list[list.length - 1]; if (last) ctx.shareLesson(last); };

  function close() {
    if (!open) return;
    open = false;
    closer = null;
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    removeEventListener('keydown', onKey, true);
    canvas.removeEventListener('pointerdown', pd);
    canvas.removeEventListener('pointermove', pm);
    canvas.removeEventListener('pointerup', pu);
    $('app').removeAttribute('inert');
    under.forEach((el) => { el.style.visibility = ''; });
    ctx.aurora.pausedState = false;
    ctx.orb.paused = false;
    const a = animate(view, [{ opacity: 1 }, { opacity: 0, transform: 'scale(1.04)' }], { duration: DUR.m, fill: 'forwards' }, 'exit');
    a.finished.then(() => { view.hidden = true; view.getAnimations().forEach((x) => x.cancel()); }, () => { view.hidden = true; });
    trigger?.focus?.({ preventScroll: true });
  }
  closer = close;
}
