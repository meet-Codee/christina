// scratchpad.js: F4 "Show your working". The student writes by finger, pen or mouse; Christina checks the latest step.
import { animate, DUR, EASE, flyTo, reduced } from './motion.js';
import { esc } from './fx.js';

let open = false;
let closer = null;
export const padOpen = () => open;
export const closePad = () => closer?.();

const INK = { a: '#f6f4ff', b: '#ffb547' };

export function openPad(ctx, trigger) {
  const { S, api, toast, ui } = ctx;
  if (open) return;
  if (!S.lesson) { toast('Start a problem first, then show your working.', { kind: 'info' }); return; }
  const $ = (id) => document.getElementById(id);
  const pad = $('pad');
  const wrap = $('padWrap');
  const canvas = $('padCanvas');
  const g = canvas.getContext('2d');
  const empty = $('padEmpty');
  const checkBtn = $('checkStep');
  const lesson = S.lesson;
  lesson.pad ||= { strokes: [] };
  const strokes = lesson.pad.strokes;
  let tool = 'a';
  let current = null;
  let penSeen = false;
  let dpr = 1;

  open = true;
  pad.hidden = false;
  $('app').setAttribute('inert', '');
  animate(pad, [{ transform: 'translate(-50%, 100%)' }, { transform: 'translate(-50%, 0)' }], { duration: DUR.l, easing: EASE.spring }, 'enter');
  setTimeout(() => $('penA').focus({ preventScroll: true }), 60);

  const resize = () => {
    const r = wrap.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    redraw();
  };

  const width = (p, base) => base * (0.55 + (p ?? 0.5) * 0.9);

  function drawStroke(c, s, scale = dpr, colorOverride) {
    const pts = s.points;
    if (!pts.length) return;
    c.save();
    c.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    c.strokeStyle = colorOverride || s.color;
    c.fillStyle = colorOverride || s.color;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (!s.erase && !colorOverride) { c.shadowColor = s.color; c.shadowBlur = 6 * scale; }
    if (pts.length === 1) {
      c.beginPath(); c.arc(pts[0].x * scale, pts[0].y * scale, width(pts[0].p, s.size) * scale / 2, 0, Math.PI * 2); c.fill();
    } else {
      // Quadratic curves through the midpoints, with width following pressure.
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1]; const p1 = pts[i];
        const m0 = i > 1 ? { x: (pts[i - 2].x + p0.x) / 2, y: (pts[i - 2].y + p0.y) / 2 } : p0;
        const m1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        c.lineWidth = width((p0.p + p1.p) / 2, s.size) * scale;
        c.beginPath();
        c.moveTo(m0.x * scale, m0.y * scale);
        c.quadraticCurveTo(p0.x * scale, p0.y * scale, m1.x * scale, m1.y * scale);
        c.stroke();
      }
      const a = pts[pts.length - 2]; const b = pts[pts.length - 1];
      c.beginPath(); c.moveTo((a.x + b.x) / 2 * scale, (a.y + b.y) / 2 * scale); c.lineTo(b.x * scale, b.y * scale); c.stroke();
    }
    c.restore();
  }

  function redraw() {
    g.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokes) drawStroke(g, s);
    const has = strokes.some((s) => !s.erase);
    empty.hidden = has;
    checkBtn.disabled = !has;
  }

  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pointerType === 'mouse' ? 0.5 : (e.pressure || 0.5) }; };

  const down = (e) => {
    if (e.pointerType === 'pen') penSeen = true;
    if (penSeen && e.pointerType === 'touch') return; // palm rejection while a pen is in use
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    current = { color: INK[tool] || INK.a, size: tool === 'erase' ? 26 : 3.6, erase: tool === 'erase', points: [pos(e)], id: e.pointerId };
    strokes.push(current);
    empty.hidden = true;
    redraw();
  };
  const move = (e) => {
    if (!current || e.pointerId !== current.id) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ce of evs) current.points.push(pos(ce));
    redraw();
  };
  const up = (e) => {
    if (!current || e.pointerId !== current.id) return;
    current = null;
    redraw();
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  const setTool = (t) => {
    tool = t;
    $('penA').setAttribute('aria-pressed', String(t === 'a'));
    $('penB').setAttribute('aria-pressed', String(t === 'b'));
    $('eraser').setAttribute('aria-pressed', String(t === 'erase'));
  };
  $('penA').onclick = () => setTool('a');
  $('penB').onclick = () => setTool('b');
  $('eraser').onclick = () => setTool('erase');
  $('undo').onclick = () => { strokes.pop(); redraw(); };
  $('clearPad').onclick = () => { strokes.length = 0; redraw(); };

  // Export: dark ink on white, cropped to the writing, at most 1200 px.
  function exportPNG() {
    const ink = strokes.filter((s) => !s.erase);
    if (!ink.length) return null;
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const s of ink) for (const p of s.points) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    const padPx = 28;
    x0 -= padPx; y0 -= padPx; x1 += padPx; y1 += padPx;
    const w = x1 - x0; const h = y1 - y0;
    const scale = Math.min(1200 / Math.max(w, h), 3);
    const layer = document.createElement('canvas');
    layer.width = Math.max(1, Math.round(w * scale)); layer.height = Math.max(1, Math.round(h * scale));
    const lc = layer.getContext('2d');
    lc.translate(-x0 * scale, -y0 * scale);
    for (const s of strokes) drawStroke(lc, { ...s, size: s.erase ? s.size : s.size * 1.25 }, scale, s.erase ? '#000' : '#111122');
    const out = document.createElement('canvas');
    out.width = layer.width; out.height = layer.height;
    const oc = out.getContext('2d');
    oc.fillStyle = '#ffffff';
    oc.fillRect(0, 0, out.width, out.height);
    oc.drawImage(layer, 0, 0);
    return out.toDataURL('image/png');
  }

  checkBtn.onclick = async () => {
    const dataUrl = exportPNG();
    if (!dataUrl) return;
    checkBtn.disabled = true;
    // A light pulse travels from the pad to Christina.
    flyTo(checkBtn, document.getElementById('orb'), { className: 'pulse-dot', dur: 700, arc: -80, scaleTo: 1.6 });
    close();
    const img = document.createElement('img');
    img.src = dataUrl; img.alt = 'My working'; img.style.cssText = 'max-width:min(18rem,70vw);max-height:9rem;border-radius:.7rem;background:#fff;display:block;margin-top:.4rem';
    const stu = ctx.addStudent('✍️');
    stu.querySelector('.msg-text').appendChild(img);
    ctx.showThinking();
    try {
      const r = await api('check-work', { language: S.prefs.lang, grade: S.prefs.grade, mix: S.prefs.mix, problem: lesson.problem, history: lesson.history, image: dataUrl.split(',')[1], mime: 'image/png', hint_level: lesson.hint });
      if (S.lesson !== lesson) return;
      lesson.history.push({ role: 'user', content: `[I wrote on the scratchpad: ${r.read || 'something unclear'}]` });
      const screen = r.verdict === 'unreadable' && !r.screen ? ui('writeBigger') : r.screen;
      ctx.handleReply({ screen, speak: r.speak || screen, hint_level: lesson.hint, solved: !!r.solved, mistake: r.mistake, board: r.board, terms: [], mood: r.verdict === 'wrong' ? 'confused' : r.verdict === 'correct' ? 'confident' : 'calm' }, { source: 'pad' });
    } catch (e) {
      ctx.addError(e, () => { openPad(ctx, trigger); });
    }
  };

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); strokes.pop(); redraw(); }
  };
  addEventListener('keydown', onKey, true);

  // Drag the grip down to close (phones).
  const grip = pad.querySelector('.pad-head');
  let dragY = null;
  const gd = (e) => { if (e.target.closest('button')) return; dragY = e.clientY; grip.setPointerCapture(e.pointerId); };
  const gm = (e) => { if (dragY == null) return; const dy = Math.max(0, e.clientY - dragY); pad.style.transform = `translate(-50%, ${dy}px)`; };
  const gu = (e) => { if (dragY == null) return; const dy = e.clientY - dragY; dragY = null; pad.style.transform = ''; if (dy > pad.offsetHeight * 0.25) close(); };
  grip.addEventListener('pointerdown', gd);
  grip.addEventListener('pointermove', gm);
  grip.addEventListener('pointerup', gu);

  const ro = new ResizeObserver(resize);
  ro.observe(wrap);
  resize();

  $('closePad').onclick = () => close();

  function close() {
    if (!open) return;
    open = false;
    closer = null;
    removeEventListener('keydown', onKey, true);
    ro.disconnect();
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    grip.removeEventListener('pointerdown', gd);
    grip.removeEventListener('pointermove', gm);
    grip.removeEventListener('pointerup', gu);
    $('app').removeAttribute('inert');
    const a = animate(pad, [{ transform: 'translate(-50%, 0)' }, { transform: 'translate(-50%, 105%)' }], { duration: DUR.m, easing: EASE.inOut, fill: 'forwards' }, 'exit');
    a.finished.then(() => { pad.hidden = true; pad.getAnimations().forEach((x) => x.cancel()); }, () => { pad.hidden = true; });
    trigger?.focus?.({ preventScroll: true });
  }
  closer = close;
}
