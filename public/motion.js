// motion.js: Christina's one motion language, as reusable helpers (docs/DESIGN_SYSTEM.md).
// Everything here respects prefers-reduced-motion and the quality tier on <html data-tier>.

const rmq = matchMedia('(prefers-reduced-motion: reduce)');
const fineq = matchMedia('(hover: hover) and (pointer: fine)');
const root = document.documentElement;

export const reduced = () => rmq.matches;
export const tier = () => root.dataset.tier || 'full';
export const lite = () => tier() === 'lite';
export const finePointer = () => fineq.matches;
export const rich3d = () => !reduced() && !lite();

export const DUR = { micro: 120, s: 240, m: 420, l: 700, xl: 1000 };
export const STAGGER = 55;
export const EASE = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  spring: 'linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1)',
};

const done = { finished: Promise.resolve(), cancel() {}, finish() {} };

// ── Indian-script splitting (DESIGN_SYSTEM §1). Never split per character or plain grapheme. ──
const VIRAMA = /[्্੍્୍்్್്‍]$/;
const graphemes = new Map();
export function splitAksharas(text, lang) {
  let seg = graphemes.get(lang);
  if (!seg) { seg = new Intl.Segmenter(lang, { granularity: 'grapheme' }); graphemes.set(lang, seg); }
  const out = [];
  for (const { segment } of seg.segment(text)) {
    if (out.length && VIRAMA.test(out[out.length - 1])) out[out.length - 1] += segment;
    else out.push(segment);
  }
  return out;
}

// ── Core animate wrapper ──
// kind: 'enter' fades in under reduced motion, 'exit' fades out, 'fx' (decorative) is skipped.
export function animate(el, frames, opts = {}, kind = 'fx') {
  if (!el || !el.animate) return done;
  if (reduced() || (lite() && opts.liteFade !== false && kind !== 'fx' && opts.heavy)) {
    if (kind === 'enter') return el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, delay: Math.min(opts.delay || 0, 200), fill: 'backwards', easing: 'linear' });
    if (kind === 'exit') return el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' });
    return done;
  }
  return el.animate(frames, { duration: DUR.l, easing: EASE.out, fill: 'backwards', ...opts });
}

// Rise in with blur. Used for most entrances.
export function reveal(el, { y = 24, z = 0, rx = 0, scale = 1, blur = 10, delay = 0, dur = DUR.l, easing = EASE.out } = {}) {
  const from = `translate3d(0, ${y}px, ${z}px) rotateX(${rx}deg) scale(${scale})`;
  return animate(el, [
    { opacity: 0, transform: from, filter: blur ? `blur(${blur}px)` : 'none' },
    { opacity: 1, transform: 'none', filter: 'none' },
  ], { duration: dur, delay, easing }, 'enter');
}

// Mask reveal from the bottom (hero title and subtitle).
export function maskReveal(el, { delay = 0, dur = DUR.l } = {}) {
  return animate(el, [
    { clipPath: 'inset(100% 0 0 0)', transform: 'translateY(0.4em)' },
    { clipPath: 'inset(0 0 0 0)', transform: 'none' },
  ], { duration: dur, delay, easing: EASE.out }, 'enter');
}

// 3D flip entrance. axis 'x' flips up from below, 'y' turns in from the side.
export function flip(el, { axis = 'x', from = 70, delay = 0, dur = DUR.l, origin } = {}) {
  if (origin) el.style.transformOrigin = origin;
  const rot = axis === 'x' ? `rotateX(${from}deg)` : `rotateY(${from}deg)`;
  return animate(el, [
    { opacity: 0, transform: `perspective(1000px) ${rot} translateZ(-20px)` },
    { opacity: 1, transform: 'perspective(1000px) rotateX(0) rotateY(0)' },
  ], { duration: dur, delay, easing: EASE.spring, heavy: true }, 'enter');
}

// Pop in with the spring (chips, icon buttons, coins).
export function pop(el, { delay = 0, dur = DUR.l, from = 0.6 } = {}) {
  return animate(el, [
    { opacity: 0, transform: `scale(${from}) translateY(8px)` },
    { opacity: 1, transform: 'none' },
  ], { duration: dur, delay, easing: EASE.spring }, 'enter');
}

export function stagger(els, fn, step = STAGGER, start = 0) {
  return [...els].map((el, i) => fn(el, start + i * step, i));
}

// Akshara-by-akshara rise (greeting). Restores plain text afterwards so shaping and screen readers are perfect.
export function riseText(el, text, lang, { delay = 0, step = 45, y = 30, blur = 12, dur = DUR.l } = {}) {
  el.textContent = text;
  if (reduced()) return animate(el, [], { delay }, 'enter').finished;
  const parts = splitAksharas(text, lang);
  el.textContent = '';
  const spans = parts.map((p) => {
    const s = document.createElement('span');
    s.className = 'ak';
    s.textContent = p;
    if (p.trim() === '') s.style.whiteSpace = 'pre';
    el.appendChild(s);
    return s;
  });
  const anims = spans.map((s, i) => s.animate([
    { opacity: 0, transform: `translateY(${y}px)`, filter: `blur(${blur}px)` },
    { opacity: 1, transform: 'none', filter: 'blur(0)' },
  ], { duration: dur, delay: delay + i * step, easing: EASE.out, fill: 'backwards' }));
  const all = Promise.all(anims.map((a) => a.finished)).catch(() => {});
  all.then(() => { if (el.querySelector('.ak')) el.textContent = text; });
  return all;
}

// Old text dissolves into drifting particles (spans), then the new one rises.
export async function swapText(el, text, lang) {
  if (!reduced() && el.textContent) {
    const parts = splitAksharas(el.textContent, lang);
    el.textContent = '';
    const spans = parts.map((p) => { const s = document.createElement('span'); s.className = 'ak'; s.textContent = p; el.appendChild(s); return s; });
    await Promise.all(spans.map((s, i) => s.animate([
      { opacity: 1, transform: 'none', filter: 'blur(0)' },
      { opacity: 0, transform: `translate(${(Math.random() - 0.5) * 40}px, ${-20 - Math.random() * 30}px) scale(${0.4 + Math.random() * 0.4})`, filter: 'blur(6px)' },
    ], { duration: 380, delay: i * 18, easing: EASE.inOut, fill: 'forwards' }).finished)).catch(() => {});
  }
  return riseText(el, text, lang, { step: 40 });
}

// ── View Transitions with a clean fallback ──
export function viewTransition(update) {
  if (!document.startViewTransition || reduced()) {
    update();
    return Promise.resolve();
  }
  try {
    const vt = document.startViewTransition(update);
    return vt.finished.catch(() => {});
  } catch {
    update();
    return Promise.resolve();
  }
}

// ── Dialogs grow out of the button that opened them, and shrink back into it ──
function originFor(dlg, trigger) {
  const r = dlg.getBoundingClientRect();
  const t = trigger?.getBoundingClientRect?.();
  if (!t || !t.width) return 'center 30%';
  return `${t.left + t.width / 2 - r.left}px ${t.top + t.height / 2 - r.top}px`;
}

export function growFrom(dlg, trigger) {
  dlg.style.transformOrigin = originFor(dlg, trigger);
  return animate(dlg, [
    { opacity: 0, transform: 'perspective(1400px) scale(0.85) rotateX(8deg)', filter: 'blur(12px)' },
    { opacity: 1, transform: 'perspective(1400px) scale(1) rotateX(0)', filter: 'blur(0)' },
  ], { duration: DUR.m, easing: EASE.out }, 'enter');
}

export function shrinkTo(dlg, trigger) {
  dlg.style.transformOrigin = originFor(dlg, trigger);
  const a = animate(dlg, [
    { opacity: 1, transform: 'perspective(1400px) scale(1)', filter: 'blur(0)' },
    { opacity: 0, transform: 'perspective(1400px) scale(0.85) rotateX(8deg)', filter: 'blur(10px)' },
  ], { duration: DUR.s, easing: EASE.inOut, fill: 'forwards' }, 'exit');
  return a.finished.catch(() => {});
}

// ── Light ripple from the press point ──
export function ripple(el, e) {
  if (reduced() || !el) return;
  const r = el.getBoundingClientRect();
  const s = document.createElement('span');
  s.className = 'ripple';
  const size = Math.max(r.width, r.height) * 2.2;
  s.style.width = s.style.height = `${size}px`;
  s.style.left = `${(e?.clientX ?? r.left + r.width / 2) - r.left - size / 2}px`;
  s.style.top = `${(e?.clientY ?? r.top + r.height / 2) - r.top - size / 2}px`;
  el.appendChild(s);
  s.animate([{ transform: 'scale(0)', opacity: 0.55 }, { transform: 'scale(1)', opacity: 0 }], { duration: 650, easing: EASE.out }).finished.then(() => s.remove(), () => s.remove());
}

// ── Split-flap stats ──
export function splitFlap(el, value) {
  const next = String(value);
  const prev = el.dataset.v ?? el.textContent.trim();
  el.dataset.v = next;
  el.setAttribute('aria-label', next);
  if (prev === next && el.children.length) return;
  el.textContent = '';
  const pad = Math.max(0, next.length - prev.length);
  const old = ' '.repeat(pad) + prev;
  [...next].forEach((ch, i) => {
    const d = document.createElement('span');
    d.className = 'flap';
    d.textContent = ch;
    d.setAttribute('aria-hidden', 'true');
    el.appendChild(d);
    if (old[i] !== ch) animate(d, [
      { transform: 'perspective(300px) rotateX(-90deg)', opacity: 0.2 },
      { transform: 'perspective(300px) rotateX(0)', opacity: 1 },
    ], { duration: 520, delay: i * 70, easing: EASE.spring }, 'enter');
  });
}

// ── FLIP: animate siblings to their new positions after a DOM change ──
export function flipList(container, mutate) {
  const kids = [...container.children];
  const before = new Map(kids.map((k) => [k, k.getBoundingClientRect()]));
  mutate();
  if (reduced()) return;
  for (const k of container.children) {
    const b = before.get(k);
    if (!b) continue;
    const a = k.getBoundingClientRect();
    const dx = b.left - a.left;
    const dy = b.top - a.top;
    if (dx || dy) k.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: DUR.m, easing: EASE.out });
  }
}

// ── Something flies from one place to another along an arc (stars, paper plane, light pulse) ──
export function flyTo(from, to, { html = '', className = 'flyer', dur = 900, arc = -120, scaleTo = 0.4, spin = 0 } = {}) {
  const a = (from.getBoundingClientRect ? from.getBoundingClientRect() : from);
  const b = (to.getBoundingClientRect ? to.getBoundingClientRect() : to);
  if (reduced() || !a || !b) return Promise.resolve();
  const el = document.createElement('div');
  el.className = className;
  el.innerHTML = html;
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  const x0 = a.left + a.width / 2; const y0 = a.top + a.height / 2;
  const x1 = b.left + b.width / 2; const y1 = b.top + b.height / 2;
  const cx = (x0 + x1) / 2; const cy = Math.min(y0, y1) + arc;
  const frames = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    const s = 1 + (scaleTo - 1) * t;
    frames.push({ transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s}) rotate(${spin * t}deg)`, opacity: t > 0.85 ? (1 - t) / 0.15 : 1, offset: t });
  }
  return el.animate(frames, { duration: dur, easing: EASE.inOut, fill: 'forwards' }).finished.then(() => el.remove(), () => el.remove());
}

// ── Pointer effects by delegation: tilt + glare, magnetic pull, specular spot, cursor glow ──
let installed = false;
export function installPointerFX() {
  if (installed) return;
  installed = true;
  let ev = null;
  let raf = 0;
  let tiltEl = null;
  let magEl = null;
  const glow = document.querySelector('.cursor-glow');

  const resetTilt = (el) => { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); el.style.removeProperty('--tz'); el.classList.remove('tilting'); };
  const resetMag = (el) => { el.style.removeProperty('--magx'); el.style.removeProperty('--magy'); };

  const frame = () => {
    raf = 0;
    if (!ev) return;
    const e = ev;
    const target = e.target instanceof Element ? e.target : null;
    const allow = rich3d() && finePointer();
    // Tilt
    const t = allow ? target?.closest('[data-tilt]') : null;
    if (tiltEl && tiltEl !== t) resetTilt(tiltEl);
    tiltEl = t;
    if (t) {
      const r = t.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      const max = Number(t.dataset.tilt) || 8;
      t.style.setProperty('--rx', `${(-py * max).toFixed(2)}deg`);
      t.style.setProperty('--ry', `${(px * max).toFixed(2)}deg`);
      t.style.setProperty('--tz', '12px');
      t.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
      t.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
      t.classList.add('tilting');
    }
    // Magnetic (max 6px)
    const m = allow ? target?.closest('[data-magnetic]') : null;
    if (magEl && magEl !== m) resetMag(magEl);
    magEl = m;
    if (m) {
      const r = m.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const max = Number(m.dataset.magnetic) || 6;
      const k = Math.min(1, 40 / Math.max(r.width, r.height));
      m.style.setProperty('--magx', `${Math.max(-max, Math.min(max, dx * k * 0.35)).toFixed(1)}px`);
      m.style.setProperty('--magy', `${Math.max(-max, Math.min(max, dy * k * 0.35)).toFixed(1)}px`);
    }
    // Specular spot on glass-3 and .spot surfaces (works on any tier except reduced)
    const s = !reduced() ? target?.closest('.spot, .glass-3, .glass-2') : null;
    if (s) {
      const r = s.getBoundingClientRect();
      s.style.setProperty('--mx', `${e.clientX - r.left}px`);
      s.style.setProperty('--my', `${e.clientY - r.top}px`);
    }
    // Cursor glow: visible only over glass, desktop full tier
    if (glow) {
      const on = tier() === 'full' && finePointer() && !reduced() && !!target?.closest('.glass-1, .glass-2, .glass-3');
      glow.classList.toggle('on', on);
      if (on) glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }
  };

  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    ev = e;
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { if (tiltEl) resetTilt(tiltEl); if (magEl) resetMag(magEl); tiltEl = magEl = null; glow?.classList.remove('on'); });
  // Ripple on press for anything marked data-ripple
  document.addEventListener('pointerdown', (e) => {
    const r = e.target instanceof Element ? e.target.closest('[data-ripple]') : null;
    if (r) ripple(r, e);
  }, { passive: true });
}

// ── Animated focus ring: one element that hugs whatever has :focus-visible ──
export function installFocusRing() {
  const ring = document.createElement('div');
  ring.className = 'focus-ring';
  ring.setAttribute('aria-hidden', 'true');
  let target = null;
  const place = () => {
    // The dock has its own rotating border, so its input doesn't get a second ring.
    if (!target || !target.isConnected || !target.matches(':focus-visible') || target.closest('[data-noring]')) { ring.classList.remove('on'); return; }
    const host = target.closest('dialog[open]') || document.body;
    if (ring.parentNode !== host) host.appendChild(ring);
    const r = target.getBoundingClientRect();
    if (!r.width && !r.height) { ring.classList.remove('on'); return; }
    let x = r.left; let y = r.top;
    if (host !== document.body) { const h = host.getBoundingClientRect(); x -= h.left - host.scrollLeft; y -= h.top - host.scrollTop; ring.style.position = 'absolute'; } else ring.style.position = 'fixed';
    const rad = getComputedStyle(target).borderRadius || '12px';
    ring.style.cssText += `;left:${x - 4}px;top:${y - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;border-radius:calc(${rad} + 4px)`;
    ring.classList.add('on');
  };
  document.addEventListener('focusin', (e) => { target = e.target; requestAnimationFrame(place); });
  document.addEventListener('focusout', () => { target = null; requestAnimationFrame(place); });
  addEventListener('scroll', () => target && place(), { capture: true, passive: true });
  addEventListener('resize', () => target && place());
  return { refresh: () => requestAnimationFrame(place) };
}

// ── kbd hint presses down when its shortcut fires ──
export function pressKbd(key) {
  document.querySelectorAll(`kbd[data-k="${key}"]`).forEach((k) => {
    k.classList.remove('pressed');
    void k.offsetWidth;
    k.classList.add('pressed');
    setTimeout(() => k.classList.remove('pressed'), 220);
  });
}

// ── Placeholder that types itself, cycling example doubts. Stops on focus. ──
export function typePlaceholder(input, getPhrases) {
  let timer = 0;
  let alive = true;
  const stop = () => { clearTimeout(timer); timer = 0; };
  const run = async () => {
    stop();
    if (reduced()) { const p = getPhrases(); input.placeholder = p[0] || input.placeholder; return; }
    let idx = 0;
    const tick = (phrase, i, dir) => {
      if (!alive || document.activeElement === input || input.value) return;
      const parts = splitAksharas(phrase, input.lang || 'en');
      input.placeholder = parts.slice(0, i).join('') + (dir > 0 && i < parts.length ? '▌' : '');
      if (dir > 0 && i < parts.length) timer = setTimeout(() => tick(phrase, i + 1, 1), 55 + Math.random() * 50);
      else if (dir > 0) timer = setTimeout(() => tick(phrase, i, -1), 1900);
      else if (i > 0) timer = setTimeout(() => tick(phrase, i - 1, -1), 22);
      else { idx++; const ps = getPhrases(); timer = setTimeout(() => tick(ps[idx % ps.length], 0, 1), 380); }
    };
    const ps = getPhrases();
    tick(ps[0], 0, 1);
  };
  input.addEventListener('focus', () => { stop(); input.placeholder = input.dataset.base || input.placeholder.replace('▌', ''); });
  input.addEventListener('blur', () => { if (!input.value) timer = setTimeout(run, 1200); });
  return { restart: () => { stop(); timer = setTimeout(run, 400); }, stop: () => { alive = false; stop(); } };
}

// ── Quality tiers and the FPS watchdog ──
export function detectTier() {
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  if (mem <= 2 || navigator.connection?.saveData) return 'lite';
  const phone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
  if (phone) return mem >= 4 && cores >= 6 ? 'full' : 'medium';
  return 'full';
}

export function fpsWatchdog(onLow) {
  let last = performance.now();
  let frames = 0;
  let lowSeconds = 0;
  let windowStart = last;
  let raf = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (document.hidden) { windowStart = now; frames = 0; last = now; return; }
    frames++;
    if (now - last > 250) { windowStart = now; frames = 0; } // tab switch or a debugger pause: start again
    last = now;
    if (now - windowStart >= 1000) {
      const fps = (frames * 1000) / (now - windowStart);
      lowSeconds = fps < 45 ? lowSeconds + 1 : 0;
      frames = 0;
      windowStart = now;
      if (lowSeconds >= 3) { lowSeconds = 0; onLow(fps); }
    }
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}
