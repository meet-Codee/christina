// share.js: F8 "I solved it myself". A 1080×1350 card drawn on a canvas, shared as a PNG or downloaded.

function wrap(c, text, maxW, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    if (lines.length === maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, '')}…`;
  return lines;
}

function starPath(c, cx, cy, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  c.closePath();
}

export async function drawCard({ greet, solvedSelf, problem, stars = 3, font = 'Manrope' }) {
  const W = 1080; const H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`700 96px "${font}"`, `${greet}${solvedSelf}`),
      document.fonts.load('700 40px "Unbounded"', 'Christina'),
      document.fonts.load(`600 44px "${font}"`, problem),
    ]);
  } catch { /* draw with whatever is loaded */ }
  const fam = `"${font}", "Manrope", "Noto Sans Devanagari", "Noto Sans Kannada", "Noto Sans Tamil", sans-serif`;

  // Deep space with the orb's gradient light.
  c.fillStyle = '#05050c';
  c.fillRect(0, 0, W, H);
  const glow = (x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(5,5,12,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); };
  glow(260, 220, 700, 'rgba(139,108,255,.38)');
  glow(900, 1150, 650, 'rgba(59,232,255,.22)');
  glow(880, 300, 420, 'rgba(255,79,216,.18)');

  // Kolam: dot grid with interlaced loops around the orb.
  const ox = W / 2; const oy = 330; const R = 150;
  c.fillStyle = 'rgba(255,255,255,.10)';
  for (let x = 30; x < W; x += 54) for (let y = 30; y < H; y += 54) { c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill(); }
  for (let k = 0; k < 2; k++) {
    c.strokeStyle = k ? 'rgba(59,232,255,.5)' : 'rgba(139,108,255,.55)';
    c.lineWidth = 3;
    c.beginPath();
    for (let i = 0; i <= 360; i++) { const th = (i / 360) * Math.PI * 2; const rr = R * 1.32 + R * 0.12 * Math.sin(8 * th + k * Math.PI); const x = ox + Math.cos(th) * rr; const y = oy + Math.sin(th) * rr; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    c.stroke();
  }
  for (let i = 0; i < 16; i++) { const th = (i / 16) * Math.PI * 2 + Math.PI / 16; c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(ox + Math.cos(th) * R * 1.32, oy + Math.sin(th) * R * 1.32, 4, 0, Math.PI * 2); c.fill(); }

  // The orb
  const og = c.createRadialGradient(ox - 50, oy - 60, 10, ox, oy, R);
  og.addColorStop(0, '#ffffff'); og.addColorStop(0.18, '#9ff4ff'); og.addColorStop(0.5, '#3be8ff'); og.addColorStop(0.8, '#8b6cff'); og.addColorStop(1, '#ff4fd8');
  c.shadowColor = 'rgba(59,232,255,.8)'; c.shadowBlur = 80;
  c.fillStyle = og; c.beginPath(); c.arc(ox, oy, R, 0, Math.PI * 2); c.fill();
  c.shadowBlur = 0;

  // Words
  c.textAlign = 'center';
  const brand = c.createLinearGradient(160, 0, W - 160, 0);
  brand.addColorStop(0, '#3be8ff'); brand.addColorStop(0.5, '#8b6cff'); brand.addColorStop(1, '#ff4fd8');
  c.fillStyle = brand;
  c.font = `700 92px ${fam}`;
  c.fillText(greet, W / 2, 640);
  c.fillStyle = '#f6f4ff';
  c.font = `800 74px ${fam}`;
  wrap(c, solvedSelf, W - 160, 2).forEach((l, i) => c.fillText(l, W / 2, 750 + i * 90));

  // Stars
  for (let i = 0; i < 3; i++) {
    const on = i < stars;
    c.fillStyle = on ? '#ffd166' : 'rgba(255,255,255,.15)';
    c.shadowColor = on ? 'rgba(255,209,102,.9)' : 'transparent'; c.shadowBlur = on ? 30 : 0;
    starPath(c, W / 2 + (i - 1) * 110, 880, 44); c.fill();
  }
  c.shadowBlur = 0;

  // Problem in a glass card
  const cx0 = 110; const cy0 = 960; const cw = W - 220; const ch = 220;
  c.fillStyle = 'rgba(255,255,255,.06)';
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2;
  c.beginPath(); c.roundRect(cx0, cy0, cw, ch, 36); c.fill(); c.stroke();
  c.fillStyle = '#b9b5d9';
  c.font = `600 44px ${fam}`;
  const lines = wrap(c, problem, cw - 80, 3);
  const top = cy0 + ch / 2 - ((lines.length - 1) * 58) / 2 + 14;
  lines.forEach((l, i) => c.fillText(l, W / 2, top + i * 58));

  // Logo
  const ly = 1265;
  const lg = c.createRadialGradient(W / 2 - 150, ly - 8, 2, W / 2 - 140, ly, 22);
  lg.addColorStop(0, '#fff'); lg.addColorStop(0.4, '#3be8ff'); lg.addColorStop(1, '#8b6cff');
  c.fillStyle = lg; c.beginPath(); c.arc(W / 2 - 140, ly - 12, 22, 0, Math.PI * 2); c.fill();
  c.textAlign = 'left';
  c.fillStyle = brand;
  c.font = '700 44px "Unbounded", "Manrope", sans-serif';
  c.fillText('Christina', W / 2 - 104, ly);
  c.textAlign = 'center';
  c.fillStyle = '#8a86a8';
  c.font = '500 26px "Manrope", sans-serif';
  c.fillText(new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }), W / 2, ly + 46);
  return cv;
}

export async function shareSolved(opts) {
  const cv = await drawCard(opts);
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const file = new File([blob], 'christina-i-solved-it.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: opts.solvedSelf, text: `${opts.solvedSelf} ✨ #Christina` });
    return 'shared';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
