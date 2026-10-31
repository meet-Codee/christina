// app.js: Christina's brain in the browser. State S, the api() client, the lesson flow, panels, dialogs and shortcuts.
import { LANGS, byCode, EXAMPLES, MIXES, RUNGS, fmt } from './i18n.js';
import { esc, rich, plain, stream, countUp, confetti, sparkle, dust, centerOf } from './fx.js';
import {
  reduced, tier, rich3d, DUR, EASE, STAGGER, animate, reveal, maskReveal, flip, pop, stagger, riseText, swapText,
  viewTransition, growFrom, shrinkTo, splitFlap, flipList, flyTo, installPointerFX, installFocusRing, pressKbd,
  typePlaceholder, detectTier, fpsWatchdog, splitAksharas,
} from './motion.js';
import { Orb } from './orb.js';
import { Aurora } from './aurora.js';
import { Voice, buffersToWav, wordsOf } from './voice.js';
import { Mic, recognizer, blobToBase64 } from './mic.js';
import { openCall, callActive } from './call.js';
import { openPad, padOpen, closePad } from './scratchpad.js';
import { openSky, skyOpen, closeSky, addStar, streakDays, loadSky } from './sky.js';
import { renderVisual } from './visual.js';
import { shareSolved } from './share.js';

// ───────────────────────── Storage ─────────────────────────
const store = {
  get(k, d) { try { const v = localStorage.getItem(`christina.${k}`); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`christina.${k}`, JSON.stringify(v)); } catch { /* private mode or full */ } },
  del(k) { try { localStorage.removeItem(`christina.${k}`); } catch { /* ignore */ } },
};

const DEFAULT_PREFS = { lang: 'en-IN', grade: 8, mix: 'mixed', voice: 'female', pace: 1, muted: false, freeVoice: false, fx: 'auto', onboarded: false };

// ───────────────────────── State ─────────────────────────
export const S = {
  prefs: { ...DEFAULT_PREFS, ...store.get('prefs', {}) },
  config: null,
  lesson: null,
  mode: 'ask', // 'ask' | 'teach'
  busy: false,
  ctrl: null,
  listening: false,
  lastReply: null,
  stats: { practiceStreak: 0, ...store.get('stats', {}) },
  passcode: store.get('pass', ''),
};
S.prefs.encourage = false;
S.prefs.confident = false;

const L = () => byCode(S.prefs.lang);
const ui = (k) => L().ui[k] ?? byCode('en-IN').ui[k];
const savePrefs = () => { const { encourage, confident, ...p } = S.prefs; store.set('prefs', p); };
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isPhone = () => matchMedia('(max-width: 820px)').matches;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ───────────────────────── Quality tiers ─────────────────────────
function applyTier() {
  const t = S.prefs.fx === 'auto' ? (S.autoTier || detectTier()) : S.prefs.fx;
  document.documentElement.dataset.tier = t;
  orb?.setQuality(t);
  aurora?.setQuality(t);
  const label = $('fxNow');
  if (label) label.textContent = S.prefs.fx === 'auto' ? `Auto is using ${t === 'full' ? 'Full' : t === 'medium' ? 'Medium' : 'Lite'} on this device. It drops to Lite if things get slow.` : `Using ${t === 'full' ? 'Full' : 'Lite'} effects.`;
}

// ───────────────────────── API client ─────────────────────────
let passPrompt = null;
export async function api(action, body, { method, retried = false, quiet = false, signal, passTries = 0 } = {}) {
  if (!navigator.onLine) throw Object.assign(new Error(ui('offline')), { code: 'offline' });
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 35_000);
  signal?.addEventListener('abort', () => ac.abort());
  let res;
  try {
    res = await fetch(`/api/${action}`, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(S.passcode ? { 'x-passcode': S.passcode } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ac.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (signal?.aborted) throw Object.assign(new Error('cancelled'), { code: 'aborted' });
    if (!navigator.onLine) throw Object.assign(new Error(ui('offline')), { code: 'offline' });
    if (e?.name === 'AbortError') throw Object.assign(new Error('That took too long. Try again.'), { code: 'timeout' });
    throw Object.assign(new Error("Can't reach Christina's server. Is it still running? Try again in a moment."), { code: 'network' });
  }
  clearTimeout(timer);
  let data = {};
  try { data = await res.json(); } catch { /* not JSON */ }
  if (res.ok) return data;
  const err = Object.assign(new Error(data.error || `Something went wrong (${res.status}). Try again.`), { code: data.code || 'server', status: res.status, detail: data.detail });
  if (err.code === 'passcode' && passTries < 3) {
    // Ask (again) for the passcode; a code that was already tried and refused gets "not accepted".
    passPrompt ||= askPasscode(!!S.passcode).finally(() => { passPrompt = null; });
    await passPrompt;
    return api(action, body, { method, retried, quiet, signal, passTries: passTries + 1 });
  }
  if (err.code === 'busy' && !retried) {
    if (!quiet) toast('Christina is busy, trying again…', { kind: 'warn', ms: 2600 });
    await sleep(2500);
    return api(action, body, { method, retried: true, quiet, signal, passTries });
  }
  throw err;
}

// ───────────────────────── Toasts ─────────────────────────
export function toast(text, { kind = 'info', ms = 4200, action, onAction } = {}) {
  const wrap = $('toasts');
  const el = document.createElement('div');
  el.className = `toast glass-3 ${kind}`;
  el.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  const icon = { info: 'i-info', warn: 'i-alert', err: 'i-alert', ok: 'i-check' }[kind] || 'i-info';
  el.innerHTML = `<svg class="ic"><use href="#${icon}"/></svg><span class="tt"></span>${action ? '<button class="t-act" type="button"></button>' : ''}<span class="t-bar" style="--t:${ms}ms"></span>`;
  el.querySelector('.tt').textContent = text;
  if (action) { const b = el.querySelector('.t-act'); b.textContent = action; b.onclick = () => { onAction?.(); close(); }; }
  wrap.appendChild(el);
  while (wrap.children.length > 3) wrap.firstElementChild.remove();
  animate(el, [{ opacity: 0, transform: 'rotateX(-30deg) translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: DUR.m, easing: EASE.spring }, 'enter');
  let left = ms; let t0 = performance.now(); let timer = setTimeout(close, left);
  el.addEventListener('mouseenter', () => { clearTimeout(timer); left -= performance.now() - t0; });
  el.addEventListener('mouseleave', () => { t0 = performance.now(); timer = setTimeout(close, Math.max(800, left)); });
  function close() {
    clearTimeout(timer);
    if (!el.isConnected) return;
    animate(el, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(8px) scale(.97)' }], { duration: DUR.s, fill: 'forwards' }, 'exit').finished.then(() => el.remove(), () => el.remove());
  }
  return close;
}

// ───────────────────────── Orb, aurora, voice, mic ─────────────────────────
const orbEl = $('orb');
const orb = new Orb(orbEl);
const aurora = new Aurora($('aurora'));
aurora.follow(orb);
let moodState = 'idle';
export function setMood(state) {
  let s = state;
  if (s === 'idle' && !navigator.onLine) s = 'offline';
  if ((s === 'idle' || s === 'speaking') && S.prefs.encourage) s = 'encourage'; // soft pink and slower, while she speaks too
  if (s === 'idle' && S.lesson?.solved) s = 'celebrate';
  moodState = s;
  orb.setState(s);
  aurora.setMood(s);
  const b = document.querySelector('.brand-orb');
  const cols = { listening: ['#ffb547', '#ff4fd8', '#ff7a45'], thinking: ['#8b6cff', '#3be8ff', '#ff4fd8'], celebrate: ['#3dffb5', '#3be8ff', '#ffe27a'], teach: ['#ffb547', '#3dffb5', '#3be8ff'], encourage: ['#ff9ec7', '#c9a7ff', '#ffd1e3'], offline: ['#77758c', '#55536b', '#99979e'] }[s] || ['#3be8ff', '#8b6cff', '#ff4fd8'];
  b?.style.setProperty('--o1', cols[0]); b?.style.setProperty('--o2', cols[1]); b?.style.setProperty('--o3', cols[2]);
}

const voice = new Voice({
  api,
  prefs: () => S.prefs,
  config: () => S.config,
  orb,
  onSpeaking: (on) => {
    document.body.classList.toggle('speaking', on);
    if (on) setMood('speaking');
    else if (moodState === 'speaking') setMood('idle');
    if (!on) document.querySelectorAll('.listen-btn.playing').forEach((b) => b.classList.remove('playing'));
  },
  onDeviceFallback: (e) => {
    if (S.warnedVoice) return;
    S.warnedVoice = true;
    toast(e?.code === 'offline' ? ui('offline') : `The AI voice isn't available right now (${e?.message || 'unknown'}). Using this device's voice.`, { kind: 'warn', ms: 5200 });
  },
});
const mic = new Mic(() => voice.context());

// ───────────────────────── Language ─────────────────────────
const langScope = () => [$('stage'), $('panel'), $('onboard')];
function applyLanguage({ animateIt = false } = {}) {
  const l = L();
  for (const el of langScope()) el.lang = l.tag;
  $('langName').textContent = l.native;
  $('setLangName').textContent = `${l.native} · ${l.name}`;
  $('title').textContent = l.ui.title;
  $('sub').textContent = l.ui.sub;
  if (animateIt) swapText($('greet'), l.ui.greet, l.tag); else if (!S.introRunning) $('greet').textContent = l.ui.greet;
  $('ask').dataset.base = l.ui.ask;
  $('ask').placeholder = l.ui.ask;
  $('ask').lang = l.tag;
  $('hintLabel').textContent = l.ui.hint;
  $('showLabel').textContent = l.ui.show;
  $('padLabel').textContent = l.ui.pad;
  $('teachChipLabel').textContent = l.ui.teach;
  $('teachLabel').textContent = l.ui.teach;
  $('parentLabel').textContent = l.ui.parent;
  $('ladderTitle').textContent = l.ui.ladder;
  $('solutionTitle').textContent = l.ui.solution;
  $('wordsTitle').textContent = l.ui.words;
  $('pcLabel').textContent = l.ui.problem;
  $('padTitle').textContent = l.ui.pad;
  $('checkLabel').textContent = l.ui.check;
  $('skyTitle').textContent = l.ui.sky;
  $('callBtn').setAttribute('aria-label', `${l.ui.call} (call mode)`);
  renderExamples(animateIt);
  renderLadder();
  renderMix();
  placeholderTyper?.restart();
}

export async function setLanguage(code, { quiet } = {}) {
  if (!LANGS.some((l) => l.code === code) || code === S.prefs.lang) return;
  const pill = $('langPill');
  S.prefs.lang = code;
  savePrefs();
  if (!reduced()) {
    pill.classList.add('flipped');
    await sleep(260);
  }
  applyLanguage({ animateIt: true });
  pill.classList.remove('flipped');
  if (!quiet) toast(`${L().native} · ${L().name}`, { kind: 'ok', ms: 2200 });
}

// ───────────────────────── Hero ─────────────────────────
function renderExamples(animateIt) {
  const box = $('examples');
  box.innerHTML = '';
  EXAMPLES(S.prefs.lang).forEach((ex) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ex-card glass-2 z2';
    b.dataset.tilt = '9';
    b.innerHTML = `<span class="glare"></span><span class="ex-icon"><svg class="ic"><use href="#${ex.icon}"/></svg></span><span class="ex-text">${rich(ex.text, { words: false })}</span><svg class="ic ex-go"><use href="#i-arrow"/></svg>`;
    b.addEventListener('click', () => startLesson(ex.text, { fromCard: b, subject: ex.subject }));
    box.appendChild(b);
  });
  if (animateIt) stagger(box.children, (el, d) => flip(el, { delay: d, origin: '50% 100%' }));
  renderHeroRecent();
}

function renderHeroRecent() {
  const box = $('heroRecent');
  const recent = store.get('recent', []).filter((r) => !r.solved).slice(0, 3);
  box.innerHTML = '';
  for (const r of recent) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `↺ ${plain(r.problem)}`;
    b.title = 'Continue this lesson';
    b.onclick = () => resumeLesson(r.id);
    box.appendChild(b);
  }
}

// ───────────────────────── Page-load sequence (once) ─────────────────────────
async function intro({ skipAurora = false } = {}) {
  S.introRunning = true;
  const l = L();
  if (reduced()) {
    $('greet').textContent = l.ui.greet;
    for (const el of [$('app')]) animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 }, 'enter');
    orb.intro();
    S.introRunning = false;
    return;
  }
  if (!skipAurora) aurora.fadeIn();
  // 150: dot grid ripples outward
  setTimeout(() => {
    const dots = $('dots');
    const t0 = performance.now();
    const step = (now) => { const t = Math.min(1, (now - t0) / 900); dots.style.setProperty('--reveal', String(140 * (1 - (1 - t) ** 3))); if (t < 1) requestAnimationFrame(step); };
    dots.style.setProperty('--reveal', '0');
    requestAnimationFrame(step);
  }, 150);
  // 300: orb materialises
  const home = $('orbHome');
  home.style.opacity = '0';
  setTimeout(() => {
    home.style.opacity = '';
    orb.intro();
    home.animate([{ transform: 'scale(.6)', filter: 'blur(20px)', opacity: 0 }, { transform: 'scale(1)', filter: 'blur(0)', opacity: 1 }], { duration: 1100, easing: EASE.spring, fill: 'backwards' });
  }, 300);
  // 650: greeting rises akshara by akshara
  $('greet').textContent = '';
  setTimeout(() => riseText($('greet'), l.ui.greet, l.tag).then(() => { S.introRunning = false; }), 650);
  maskReveal($('title'), { delay: 760 });
  maskReveal($('sub'), { delay: 860 });
  // 850: nav glass slides down with its blur
  animate($('nav'), [{ transform: 'translateY(-20px)', opacity: 0, backdropFilter: 'blur(0px)' }, { transform: 'none', opacity: 1, backdropFilter: 'blur(22px)' }], { duration: DUR.l, delay: 850 }, 'enter');
  stagger(document.querySelectorAll('#nav .icon-btn, #nav .lang-pill, #nav .mix'), (el, d) => pop(el, { delay: d }), 40, 950);
  // 950: example cards flip up
  stagger($('examples').children, (el, d) => flip(el, { delay: d, origin: '50% 100%' }), STAGGER, 950);
  // 1150: dock springs in, panel cards slide in
  animate($('dock'), [{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900, delay: 1150, easing: EASE.spring }, 'enter');
  if (!isPhone()) stagger($('panel').querySelectorAll('.card'), (el, d) => reveal(el, { y: 0, blur: 8, delay: d }), 70, 1050);
  stagger($('panel').querySelectorAll('.rung'), (el, d) => animate(el, [{ transform: 'translateX(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: DUR.l, delay: d }, 'enter'), 60, 1200);
  setTimeout(() => { S.introRunning = false; }, 2600);
}

// ───────────────────────── Onboarding ─────────────────────────
function buildCoins(box, onPick) {
  box.innerHTML = '';
  for (let g = 5; g <= 12; g++) {
    const c = document.createElement('button');
    c.type = 'button'; c.className = 'coin'; c.setAttribute('role', 'radio'); c.textContent = g; c.dataset.g = g;
    c.setAttribute('aria-label', `Class ${g}`);
    c.setAttribute('aria-checked', String(S.prefs.grade === g));
    c.onclick = () => {
      S.prefs.grade = g; savePrefs();
      box.querySelectorAll('.coin').forEach((x) => x.setAttribute('aria-checked', String(x === c)));
      if (!reduced()) { c.classList.remove('spin'); void c.offsetWidth; c.classList.add('spin'); }
      onPick?.(g);
    };
    box.appendChild(c);
  }
}

function buildTiles(box, onPick) {
  box.innerHTML = '';
  const cols = isPhone() ? 2 : 4;
  LANGS.forEach((l, i) => {
    const t = document.createElement('button');
    t.type = 'button'; t.className = 'tile-lang glass-2'; t.setAttribute('role', 'radio'); t.lang = l.tag;
    t.dataset.tilt = '8';
    t.setAttribute('aria-checked', String(S.prefs.lang === l.code));
    t.setAttribute('aria-label', `${l.name} (${l.native})`);
    t.innerHTML = `<span class="glare"></span><span class="tn">${esc(l.native)}</span><span class="tg">${esc(l.ui.greet)}</span><span class="te">${esc(l.name)}</span><span class="tick-face">✓ ${esc(l.ui.greet)}</span>`;
    t.style.setProperty('--d', `${(Math.floor(i / cols) + (i % cols)) * 55}ms`);
    t.onclick = () => {
      box.querySelectorAll('.tile-lang').forEach((x) => { x.setAttribute('aria-checked', String(x === t)); x.classList.toggle('chosen', x === t); });
      box.classList.add('has-choice');
      onPick(l.code);
    };
    box.appendChild(t);
  });
  return cols;
}

function showOnboarding() {
  const ob = $('onboard');
  ob.hidden = false;
  $('app').setAttribute('inert', '');
  const cols = buildTiles($('obTiles'), (code) => { S.prefs.lang = code; savePrefs(); applyLanguage(); localizeOnboarding(); });
  buildCoins($('obClass'));
  segSetup($('obVoice'), 'v', S.prefs.voice, (v) => { S.prefs.voice = v; savePrefs(); });
  localizeOnboarding();
  aurora.fadeIn();
  // Tiles wave in diagonally; coins drop in.
  [...$('obTiles').children].forEach((t, i) => flip(t, { axis: 'x', from: 60, delay: 200 + (Math.floor(i / cols) + (i % cols)) * 55 }));
  stagger($('obClass').children, (c, d) => animate(c, [{ transform: 'translateY(-40px) rotateX(70deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: DUR.l, delay: d, easing: EASE.spring }, 'enter'), 45, 600);
  reveal($('obStart'), { delay: 900 });
  // Greetings cycle through all 11 scripts.
  let i = 0;
  const cycle = () => {
    if (ob.hidden) return;
    const l = LANGS[i++ % LANGS.length];
    $('obGreet').lang = l.tag;
    riseText($('obGreet'), l.ui.greet, l.tag, { step: 55 });
    S.greetTimer = setTimeout(cycle, 1900);
  };
  cycle();
  setTimeout(() => $('obTiles').querySelector('[aria-checked="true"]')?.focus({ preventScroll: true }), 400);
}

function localizeOnboarding() {
  const l = L();
  $('obTitle').textContent = `${l.ui.chooseLang}${l.code === 'en-IN' ? '' : ' · Choose your language'}`;
  $('obClassLabel').textContent = l.ui.yourClass;
  $('obStartLabel').textContent = l.ui.start;
}

async function finishOnboarding() {
  S.prefs.onboarded = true;
  savePrefs();
  clearTimeout(S.greetTimer);
  const ob = $('onboard');
  const app = $('app');
  app.removeAttribute('inert');
  if (!reduced()) {
    ob.classList.add('warp');
    app.classList.add('warp-in');
    await sleep(420);
  }
  ob.hidden = true;
  ob.classList.remove('warp');
  applyLanguage();
  intro({ skipAurora: true });
  setTimeout(() => app.classList.remove('warp-in'), 1000);
  setTimeout(() => $('ask').focus({ preventScroll: true }), 1600);
}

// ───────────────────────── Lesson ─────────────────────────
const log = $('log');

function newLesson(problem, extra = {}) {
  return { id: uid(), problem, photo: null, subject: 'maths', practice: false, history: [], hint: 1, maxRung: 1, hintsUsed: 0, wrongInRow: 0, solved: false, board: [], terms: [], teachScore: null, startedAt: Date.now(), stars: 0, lang: S.prefs.lang, grade: S.prefs.grade, ...extra };
}

function stopAll() {
  voice.stop();
  S.ctrl?.abort();
  S.ctrl = null;
  S.busy = false;
  if (S.listening) cancelListening();
  removeThinking();
}

let orbPlace = 'home';
// The one orb canvas moves between the hero, the lesson header and the call view (so there are never more than two WebGL contexts).
function moveOrb(to) {
  if (to !== 'call' && to !== 'call-end') orbPlace = to;
  const where = callActive() && to !== 'call-end' ? 'call' : to === 'call-end' ? orbPlace : to;
  const slot = where === 'lesson' ? $('orbSlot') : where === 'call' ? $('callOrb') : $('orbHome');
  if (orbEl.parentElement !== slot) slot.appendChild(orbEl);
}

async function goLesson(fromCard) {
  if (!$('lesson').hidden) return;
  if (fromCard && document.startViewTransition && !reduced()) fromCard.style.viewTransitionName = 'problem';
  await viewTransition(() => {
    $('hero').hidden = true;
    $('lesson').hidden = false;
    moveOrb('lesson');
  });
  if (fromCard) fromCard.style.viewTransitionName = '';
  stagger($('chips').children, (el, d) => (el.hidden ? null : pop(el, { delay: d })), STAGGER, 100);
}

async function goHome() {
  stopAll();
  S.lesson = null;
  S.mode = 'ask';
  S.prefs.encourage = false;
  await viewTransition(() => {
    $('lesson').hidden = true;
    $('hero').hidden = false;
    moveOrb('home');
    log.innerHTML = '';
    resetPanels();
    renderHeroRecent();
  });
  setMood('idle');
  stagger($('examples').children, (el, d) => flip(el, { delay: d, origin: '50% 100%' }), STAGGER, 150);
}

export async function startLesson(problem, { photo = null, subject = 'maths', fromCard = null, practice = false } = {}) {
  const text = String(problem || '').trim();
  if (!text) return;
  if (S.lesson && S.lesson.practice && !S.lesson.solved) { S.stats.practiceStreak = 0; store.set('stats', S.stats); }
  stopAll();
  S.mode = 'ask';
  S.prefs.encourage = false;
  S.prefs.confident = false;
  S.lesson = newLesson(text, { photo, subject, practice });
  resetPanels();
  log.innerHTML = '';
  setProblem(text, photo);
  closeSheet();
  await goLesson(fromCard);
  saveRecent();
  return askTutor({ kind: 'start' });
}

function setProblem(text, photo) {
  $('problemText').innerHTML = rich(text, { words: false });
  $('problemCard').classList.remove('scanning');
  const th = $('pcThumb');
  th.hidden = !photo;
  if (photo) $('pcImg').src = photo;
}

function resetPanels() {
  renderLadder();
  const board = $('board');
  board.querySelectorAll('li:not(.empty)').forEach((li) => li.remove());
  $('boardEmpty').hidden = false;
  $('words').querySelectorAll('.word').forEach((w) => w.remove());
  $('wordsEmpty').hidden = false;
  $('wordsCount').textContent = '';
  $('teachBtn').disabled = true;
  $('parentBtn').disabled = true;
  $('teachBtn').classList.remove('ready');
  $('parentBtn').classList.remove('ready');
  $('teachChip').hidden = true;
  $('hintBtn').classList.remove('ember');
  $('caption').textContent = '';
  $('caption').className = 'caption';
  renderStats(false);
}

// Keep the newest message in view: once now, and again after entrance animations settle.
function scrollLog() {
  const go = () => log.scrollTo({ top: log.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' });
  requestAnimationFrame(go);
  setTimeout(go, 950);
}

export function addStudent(text) {
  const el = document.createElement('div');
  el.className = 'msg student';
  el.lang = L().tag;
  el.innerHTML = `<div class="msg-who">${esc(ui('you'))}</div><div class="msg-text">${rich(text, { words: false })}</div>`;
  log.appendChild(el);
  // flies in from the dock with a warm trail
  animate(el, [{ opacity: 0, transform: 'translate(40px, 60px) scale(.85)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: DUR.l, easing: EASE.spring }, 'enter');
  scrollLog();
  return el;
}

function showThinking(label) {
  removeThinking();
  const el = document.createElement('div');
  el.className = 'thinking glass-2 z2';
  el.id = 'thinking';
  el.innerHTML = `<span class="orbit" aria-hidden="true"><i></i><i></i><i></i></span><span class="shimmer-text">${esc(label || ui('thinking'))}</span>`;
  log.appendChild(el);
  animate(el, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: DUR.m }, 'enter');
  scrollLog();
  setMood('thinking');
}

function removeThinking() { $('thinking')?.remove(); }

// Christina's message: arcs in, words stream, voice starts, the spoken word glows (karaoke).
export function addTutor(r, { speak = true, history = true, extra, kind = 'reply' } = {}) {
  removeThinking();
  const el = document.createElement('div');
  el.className = 'msg tutor glass-2 z2';
  el.lang = L().tag;
  el.innerHTML = `<span class="edge-sweep" aria-hidden="true"></span><div class="msg-who">Christina</div><div class="msg-text"></div><div class="msg-foot"></div>`;
  log.appendChild(el);
  animate(el, [
    { opacity: 0, transform: 'rotateX(18deg) translateY(24px) translateZ(-40px)', filter: 'blur(10px)' },
    { opacity: 1, transform: 'none', filter: 'blur(0)' },
  ], { duration: DUR.l, easing: EASE.out, heavy: true }, 'enter');
  const textEl = el.querySelector('.msg-text');
  stream(textEl, rich(r.screen));
  const foot = el.querySelector('.msg-foot');
  if (r.mistake) {
    const m = document.createElement('span');
    m.className = 'mistake';
    m.tabIndex = 0;
    m.innerHTML = `<svg class="ic"><use href="#i-alert"/></svg><span></span><span class="tip">This is the mistake to fix. Christina won't give the answer, but this is what to look at again.</span>`;
    m.querySelector('span').textContent = r.mistake;
    foot.appendChild(m);
  }
  if (extra) el.appendChild(extra);
  if (r.speak) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'listen-btn';
    b.innerHTML = `<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><svg class="ic"><use href="#i-volume"/></svg><span>${esc(ui('again'))}</span>`;
    b.onclick = () => speakMessage(el, r, b);
    foot.appendChild(b);
  }
  if (!foot.children.length) foot.remove();
  scrollLog();
  if (history && S.lesson) S.lesson.history.push({ role: 'assistant', content: r.screen });
  S.lastReply = { el, r };
  if (speak && r.speak) speakMessage(el, r, el.querySelector('.listen-btn'));
  else setMood('idle');
  return el;
}

function karaokeMap(textEl, speakText) {
  const tokens = [...textEl.querySelectorAll('.w')];
  const norm = (s) => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{M}\p{N}]/gu, '');
  const screen = tokens.map((t) => (t.classList.contains('m') ? '' : norm(t.textContent)));
  const said = wordsOf(speakText).map(norm);
  const map = new Array(said.length).fill(-1);
  let p = 0;
  for (let i = 0; i < said.length; i++) {
    if (!said[i]) continue;
    for (let j = p; j < Math.min(screen.length, p + 8); j++) if (screen[j] && screen[j] === said[i]) { map[i] = j; p = j + 1; break; }
  }
  // Words with no exact match (maths read aloud, rephrasing) are spread over the gap between their matched neighbours.
  let i = 0;
  while (i < map.length) {
    if (map[i] !== -1) { i++; continue; }
    let k = i; while (k < map.length && map[k] === -1) k++;
    const a = i > 0 ? map[i - 1] : -1;
    const b = k < map.length ? map[k] : tokens.length;
    const span = Math.max(0, b - a - 1);
    for (let n = i; n < k; n++) map[n] = span > 0 ? a + 1 + Math.floor(((n - i) / (k - i)) * span) : Math.max(0, a);
    i = k;
  }
  return { tokens, map };
}

function speakMessage(el, r, btn) {
  const textEl = el.querySelector('.msg-text');
  if (btn?.classList.contains('playing')) { voice.stop(); return; }
  const { tokens, map } = karaokeMap(textEl, r.speak);
  let lit = null;
  const clear = () => { lit?.classList.remove('kw'); lit = null; };
  document.querySelectorAll('.w.kw').forEach((w) => w.classList.remove('kw')); // only one word is ever lit
  document.querySelectorAll('.listen-btn.playing').forEach((b) => b.classList.remove('playing'));
  btn?.classList.add('playing');
  voice.say(r.speak, {
    onWord: (i) => {
      if (S.prefs.muted) return;
      const t = tokens[map[i]];
      if (t && t !== lit) { clear(); t.classList.add('kw'); lit = t; }
    },
    onEnd: () => { clear(); btn?.classList.remove('playing'); if (!callActive()) setMood('idle'); },
  });
  const stopClear = () => { if (!voice.speaking) { clear(); btn?.classList.remove('playing'); } else setTimeout(stopClear, 300); };
  setTimeout(stopClear, 600);
}

function addError(err, retry) {
  removeThinking();
  const offline = err.code === 'offline';
  const el = document.createElement('div');
  el.className = 'msg tutor glass-2 z2';
  el.innerHTML = `<div class="msg-who">Christina</div><div class="msg-text"></div><div class="msg-foot"></div>`;
  el.querySelector('.msg-text').textContent = offline ? ui('offline') : err.message;
  el.lang = offline ? L().tag : 'en';
  if (retry) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'retry-btn'; b.textContent = 'Try again';
    b.onclick = () => { el.remove(); retry(); };
    el.querySelector('.msg-foot').appendChild(b);
  }
  log.appendChild(el);
  reveal(el, { y: 12, blur: 4, dur: DUR.m });
  scrollLog();
  setMood('idle');
  if (offline) { voice.device([ui('offline')], S.prefs.lang, {}, voice.gen); }
  if (err.code === 'bad_key' || err.code === 'no_key') toast(err.message, { kind: 'err', ms: 7000 });
}

export async function askTutor({ message = '', kind = 'answer', hintLevel } = {}) {
  const lesson = S.lesson;
  if (!lesson) return;
  voice.stop();
  S.ctrl?.abort();
  const ctrl = new AbortController();
  S.ctrl = ctrl;
  const history = lesson.history.slice();
  if (message) { addStudent(message); lesson.history.push({ role: 'user', content: message }); }
  if (kind === 'hint') lesson.history.push({ role: 'user', content: '[I asked for another hint]' });
  const hint = hintLevel ?? lesson.hint;
  S.busy = true;
  showThinking();
  try {
    const r = await api('tutor', {
      language: S.prefs.lang, grade: S.prefs.grade, mix: S.prefs.mix, problem: lesson.problem, message, history, hint_level: hint, kind,
      encourage: S.prefs.encourage || undefined, confident: S.prefs.confident || undefined,
    }, { signal: ctrl.signal });
    if (ctrl.signal.aborted || S.lesson !== lesson) return;
    handleReply(r, { kind });
  } catch (e) {
    if (e.code === 'aborted' || ctrl.signal.aborted || S.lesson !== lesson) return;
    if (message) { lesson.history.pop(); }
    addError(e, () => askTutor({ message, kind, hintLevel }));
  } finally {
    if (S.ctrl === ctrl) { S.ctrl = null; S.busy = false; }
  }
}

export function handleReply(r, { kind = 'answer', source = 'tutor' } = {}) {
  const lesson = S.lesson;
  if (!lesson) return;
  const prevRung = lesson.hint;
  lesson.hint = Math.min(4, Math.max(1, r.hint_level || lesson.hint));
  lesson.maxRung = Math.max(lesson.maxRung, lesson.hint);
  if (r.mistake) lesson.wrongInRow++;
  else if (r.board) lesson.wrongInRow = 0;
  lesson.mood = r.mood || lesson.mood;

  // F10 encouragement mode
  const wasEncouraging = S.prefs.encourage;
  const shouldEncourage = r.mood === 'frustrated' || lesson.wrongInRow >= 3;
  if (shouldEncourage && !wasEncouraging) S.prefs.encourage = true;
  // Encouragement lasts until the student gets a step right, solves it, or sounds confident again.
  if (S.prefs.encourage && (r.board || r.solved || r.mood === 'confident') && !shouldEncourage) S.prefs.encourage = false;
  S.prefs.confident = r.mood === 'confident' && !r.solved;

  addTutor(r);
  if (r.board) addBoardLine(r.board);
  if (r.terms?.length) addWords(r.terms);
  renderLadder(prevRung !== lesson.hint);
  $('hintBtn').classList.toggle('ember', lesson.wrongInRow >= 2 && !r.solved);
  if (S.prefs.encourage && !wasEncouraging && r.mood !== 'frustrated') {
    // The reply didn't open with encouragement, so Christina adds one warm line.
    setTimeout(() => { if (S.lesson === lesson) addTutor({ screen: ui('keepGoing'), speak: ui('keepGoing') }, { speak: !voice.speaking, history: false, kind: 'encourage' }); }, 900);
  }
  if (S.prefs.confident && !S.confidentHinted) { S.confidentHinted = true; captionNote(ui('tryAlone')); }
  if (r.solved && !lesson.solved) celebrate();
  else setTimeout(() => { if (!voice.speaking && !S.busy) setMood('idle'); }, 400);
  saveRecent();
}

export function requestHint() {
  const lesson = S.lesson;
  if (!lesson) { toast('Ask a question first, then I can give hints.', { kind: 'info' }); return; }
  if (lesson.solved) { toast(`${ui('solved')} ✓`, { kind: 'ok', ms: 1800 }); return; }
  pressKbd('H');
  lesson.hintsUsed++;
  const next = S.prefs.encourage ? lesson.hint : Math.min(4, lesson.hint + 1); // encouragement: one rung gentler than normal
  askTutor({ kind: 'hint', hintLevel: next });
}

// ───────────────────────── Hint ladder ─────────────────────────
function renderLadder(changed = false) {
  const ol = $('ladder');
  const lesson = S.lesson;
  const now = lesson?.hint || 1;
  const max = lesson?.maxRung || 1;
  const names = L().rungs;
  ol.querySelectorAll('.rung').forEach((r) => r.remove());
  for (let i = 1; i <= 4; i++) {
    const li = document.createElement('li');
    li.className = `rung${lesson && i === now ? ' now' : ''}${lesson && i < max + 1 && i !== now ? ' used' : ''}`;
    li.dataset.r = i;
    li.innerHTML = `<span class="n">${i}</span><span class="rn"></span><span class="re">${RUNGS[i - 1]}</span>`;
    li.querySelector('.rn').textContent = names[i - 1];
    li.setAttribute('aria-current', lesson && i === now ? 'step' : 'false');
    ol.appendChild(li);
  }
  $('ladderSmall').textContent = lesson ? `${now} / 4` : '';
  const badge = $('rungBadge');
  const prev = badge.textContent;
  badge.textContent = lesson ? String(now) : '';
  if (prev !== badge.textContent && lesson) { badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop'); }
  // Bead travels up the rail to the current rung.
  requestAnimationFrame(() => {
    const target = ol.querySelector(`.rung[data-r="${now}"]`);
    const bead = $('bead');
    if (!target) return;
    bead.style.top = `${target.offsetTop + target.offsetHeight / 2 - 6}px`;
    bead.style.opacity = lesson ? '1' : '0.35';
    if (changed && lesson) { target.classList.add('pulse'); setTimeout(() => target.classList.remove('pulse'), 900); }
  });
}

// ───────────────────────── Your solution ─────────────────────────
export function addBoardLine(tex) {
  const lesson = S.lesson;
  if (!lesson) return;
  const clean = String(tex).replace(/^\$+|\$+$/g, '').trim();
  if (!clean || lesson.board.includes(clean)) return;
  lesson.board.push(clean);
  $('boardEmpty').hidden = true;
  const li = document.createElement('li');
  li.innerHTML = `<span class="line wipe">${rich(`$${clean}$`, { words: false })}</span><svg class="ic check draw" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`;
  $('board').appendChild(li);
  setTimeout(() => { if (li.isConnected) { const [x, y] = centerOf(li.querySelector('.check')); dust(x, y); } }, 900);
}

// ───────────────────────── Words to know ─────────────────────────
export function addWords(terms) {
  const lesson = S.lesson;
  const box = $('words');
  for (const t of terms) {
    if (!t?.en || !t?.local) continue;
    if (lesson && lesson.terms.some((x) => x.en.toLowerCase() === t.en.toLowerCase())) continue;
    lesson?.terms.push(t);
    $('wordsEmpty').hidden = true;
    const w = document.createElement('div');
    w.className = 'word';
    w.tabIndex = 0;
    w.setAttribute('role', 'button');
    w.setAttribute('aria-label', `${t.local}: ${t.en}. ${t.meaning}. Press to flip.`);
    w.dataset.tilt = '6';
    w.innerHTML = `<div class="word-in"><div class="face front"><span class="local" lang="${L().tag}"></span><span class="flip-hint">↻ English</span></div><div class="face back"><span class="en"></span><span class="meaning" lang="${L().tag}"></span><button class="hear" type="button" aria-label="Listen"><svg class="ic"><use href="#i-volume"/></svg></button></div></div>`;
    w.querySelector('.local').textContent = t.local;
    w.querySelector('.en').textContent = t.en;
    w.querySelector('.meaning').textContent = t.meaning;
    const flipIt = () => w.classList.toggle('flipped');
    w.addEventListener('click', (e) => { if (!e.target.closest('.hear')) flipIt(); });
    w.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); flipIt(); } });
    w.querySelector('.hear').onclick = (e) => { e.stopPropagation(); voice.say(`${t.local}. ${t.en}.`, { lang: S.prefs.lang }); };
    flipList(box, () => box.insertBefore(w, box.querySelector('.word')));
    animate(w, [{ opacity: 0, transform: 'translateZ(60px) translateY(-14px) scale(1.06)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: DUR.l, easing: EASE.spring }, 'enter');
  }
  const n = box.querySelectorAll('.word').length;
  $('wordsCount').textContent = n ? String(n) : '';
}

// ───────────────────────── Stats, stars, streak ─────────────────────────
function starsFor(lesson) { return lesson.hintsUsed === 0 && lesson.maxRung <= 1 ? 3 : lesson.hintsUsed <= 2 && lesson.maxRung <= 3 ? 2 : 1; }

function renderStats(animateIt = true) {
  const sky = loadSky();
  const vals = { stSolved: sky.length, stStars: sky.reduce((n, s) => n + (s.stars || 0), 0), stStreak: streakDays(sky), stPractice: S.stats.practiceStreak || 0 };
  for (const [id, v] of Object.entries(vals)) {
    const el = $(id);
    if (!animateIt) { el.textContent = String(v); el.dataset.v = String(v); } else splitFlap(el, v);
  }
  $('skyBadge').textContent = sky.length ? String(sky.length) : '';
}

// ───────────────────────── Solved ─────────────────────────
function celebrate() {
  const lesson = S.lesson;
  lesson.solved = true;
  lesson.stars = starsFor(lesson);
  lesson.minutes = Math.max(1, Math.round((Date.now() - lesson.startedAt) / 60000));
  S.prefs.encourage = false;
  setMood('celebrate');
  if (lesson.practice) { S.stats.practiceStreak = (S.stats.practiceStreak || 0) + 1; store.set('stats', S.stats); }

  const card = document.createElement('div');
  card.className = 'solved-card glass-2 z2';
  card.dataset.tilt = '4';
  card.lang = L().tag;
  const starsHtml = [1, 2, 3].map((i) => `<span class="star${i <= lesson.stars ? ' on' : ''}" aria-hidden="true"><svg><use href="#i-star-fill"/></svg></span>`).join('');
  card.innerHTML = `<span class="glare"></span><span class="mint-sweep" aria-hidden="true"></span><div class="solved-title">${esc(ui('solved'))} ${esc(ui('solvedSelf'))}</div>
    <div class="stars" role="img" aria-label="${lesson.stars} of 3 independence stars">${starsHtml}</div>
    <div class="solved-sub">${lesson.hintsUsed === 0 ? 'No hints needed' : `${lesson.hintsUsed} hint${lesson.hintsUsed > 1 ? 's' : ''}`} · ${lesson.board.length} step${lesson.board.length === 1 ? '' : 's'} in your solution · ${lesson.minutes} min</div>
    <div class="solved-actions">
      <button class="btn win" type="button" data-act="teach" data-magnetic><svg class="ic"><use href="#i-teach"/></svg>${esc(ui('teach'))}</button>
      <button class="btn" type="button" data-act="parent" data-magnetic><svg class="ic"><use href="#i-wave"/></svg>${esc(ui('parent'))}</button>
      <button class="btn primary" type="button" data-act="practice" data-magnetic><svg class="ic"><use href="#i-spark"/></svg>${esc(ui('practice'))}</button>
      <button class="btn" type="button" data-act="share" data-magnetic><svg class="ic"><use href="#i-share"/></svg>${esc(ui('solvedSelf'))}</button>
    </div>`;
  card.querySelector('[data-act="teach"]').onclick = (e) => startTeach(e.currentTarget);
  card.querySelector('[data-act="parent"]').onclick = (e) => openReport(e.currentTarget);
  card.querySelector('[data-act="practice"]').onclick = (e) => loadPractice(e.currentTarget);
  card.querySelector('[data-act="share"]').onclick = () => shareLesson();
  setTimeout(() => {
    if (S.lesson !== lesson) return;
    log.appendChild(card);
    flip(card, { axis: 'y', from: -90, origin: '0 50%', dur: 900 });
    scrollLog();
    const stars = card.querySelectorAll('.star.on');
    stars.forEach((s, i) => {
      animate(s, [{ transform: 'scale(0) rotate(-40deg)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 650, delay: 350 + i * 180, easing: EASE.spring }, 'enter');
      setTimeout(() => { const [x, y] = centerOf(s); sparkle(x, y, { color: '#ffd166' }); }, 520 + i * 180);
    });
    const [cx, cy] = centerOf(card);
    confetti({ x: cx, y: cy - 20 });
    // The new star flies into the sky.
    const rec = addStar({ id: lesson.id, problem: lesson.problem, subject: lesson.subject, stars: lesson.stars, hints: lesson.hintsUsed, teachScore: null, lang: lesson.lang, date: new Date().toISOString() });
    lesson.skyId = rec.id;
    const firstStar = stars[0] || card;
    flyTo(firstStar, $('skyBtn'), { html: '<svg><use href="#i-star-fill"/></svg>', dur: 1100, arc: -160, scaleTo: 0.45, spin: 200 }).then(() => {
      renderStats(true);
      const b = $('skyBadge'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      const [sx, sy] = centerOf($('skyBtn')); sparkle(sx, sy, { color: '#ffd166', count: 10 });
    });
  }, reduced() ? 0 : 900);

  for (const b of [$('teachBtn'), $('parentBtn')]) { b.disabled = false; b.classList.add('ready'); }
  $('teachChip').hidden = false;
  pop($('teachChip'));
  $('hintBtn').classList.remove('ember');
  saveRecent();
}

// ───────────────────────── Explain it back (teach-back) ─────────────────────────
function startTeach() {
  if (!S.lesson?.solved) { toast('Solve the problem first, then explain it back.', { kind: 'info' }); return; }
  S.mode = 'teach';
  setMood('teach');
  closeSheet();
  addTutor({ screen: ui('explain'), speak: ui('explain') }, { history: false, kind: 'teach' });
  captionNote('🎓 Hold the mic (or Space) and explain, or type it.');
  $('ask').focus({ preventScroll: true });
}

async function teachback(explanation) {
  const lesson = S.lesson;
  addStudent(explanation);
  showThinking();
  try {
    const r = await api('teachback', { language: S.prefs.lang, grade: S.prefs.grade, mix: S.prefs.mix, problem: lesson.problem, history: lesson.history, explanation });
    if (S.lesson !== lesson) return;
    S.mode = 'ask';
    lesson.teachScore = r.score;
    if (lesson.skyId) addStar({ id: lesson.skyId, teachScore: r.score }, { update: true });
    const extra = document.createElement('div');
    extra.className = 'teach-card';
    const ticks = Array.from({ length: 20 }, (_, i) => { const a = (i / 20) * Math.PI * 2; return `<line class="tick" data-i="${i}" x1="${50 + Math.cos(a) * 46}" y1="${50 + Math.sin(a) * 46}" x2="${50 + Math.cos(a) * 49}" y2="${50 + Math.sin(a) * 49}" stroke-width="2"/>`; }).join('');
    extra.innerHTML = `<div class="ring" role="img" aria-label="Understanding ${r.score} out of 100"><svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="38" fill="none" stroke-width="8"/>${ticks}<circle class="val" cx="50" cy="50" r="38" fill="none" stroke-width="8" stroke-dasharray="238.8" stroke-dashoffset="238.8"/></svg><span class="ring-num">0</span></div><div class="teach-lines"><span>✓ <b></b></span>${r.missing ? '<span>＋ <b class="miss"></b></span>' : ''}</div>`;
    extra.querySelector('b').textContent = r.good;
    if (r.missing) extra.querySelector('b.miss').textContent = r.missing;
    const el = addTutor(r, { extra, history: false, kind: 'teach' });
    flip(extra, { axis: 'y', from: -70, delay: 200 });
    animateRing(extra, r.score);
    setMood('celebrate');
    el.scrollIntoView({ block: 'end', behavior: reduced() ? 'auto' : 'smooth' });
    saveRecent();
  } catch (e) {
    addError(e, () => teachback(explanation));
  }
}

function animateRing(box, score) {
  const val = box.querySelector('.val');
  const num = box.querySelector('.ring-num');
  const ticks = box.querySelectorAll('.tick');
  const color = (s) => (s < 40 ? '#ff6b8b' : s < 70 ? '#ffb547' : '#3dffb5');
  const dur = reduced() ? 0 : 1300;
  const t0 = performance.now();
  const step = (now) => {
    const t = dur ? Math.min(1, (now - t0) / dur) : 1;
    const s = Math.round(score * (1 - (1 - t) ** 3));
    num.textContent = String(s);
    val.style.strokeDashoffset = String(238.8 * (1 - s / 100));
    box.querySelector('.ring').style.setProperty('--tc', color(s));
    ticks.forEach((tk, i) => tk.classList.toggle('lit', i < Math.round((s / 100) * ticks.length)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ───────────────────────── Voice note for parents ─────────────────────────
let reportData = null;
async function openReport(trigger) {
  const lesson = S.lesson;
  if (!lesson) return;
  reportData = null;
  const textEl = $('reportText');
  textEl.lang = L().tag;
  textEl.innerHTML = '<span class="skeleton" style="width:92%"></span><span class="skeleton" style="width:80%"></span><span class="skeleton" style="width:64%"></span>';
  for (const id of ['reportPlay', 'reportWa', 'reportShare']) $(id).disabled = true;
  openDialog($('reportDlg'), trigger);
  try {
    const r = await api('report', { language: S.prefs.lang, grade: S.prefs.grade, problem: lesson.problem, history: lesson.history, board: lesson.board, stats: { solved: lesson.solved, hints: lesson.hintsUsed, teachScore: lesson.teachScore, minutes: Math.max(1, Math.round((Date.now() - lesson.startedAt) / 60000)) } });
    reportData = r;
    await stream(textEl, rich(r.screen));
    for (const id of ['reportPlay', 'reportWa', 'reportShare']) $(id).disabled = false;
    playReport();
  } catch (e) {
    textEl.textContent = e.message;
  }
}

function playReport() {
  if (!reportData) return;
  const btn = $('reportPlay');
  if (voice.speaking && btn.dataset.playing === '1') { voice.stop(); return; }
  const textEl = $('reportText');
  const { tokens, map } = karaokeMap(textEl, reportData.speak);
  let lit = null;
  btn.dataset.playing = '1';
  btn.querySelector('use').setAttribute('href', '#i-pause');
  btn.querySelector('span').textContent = 'Stop';
  const done = () => { lit?.classList.remove('kw'); btn.dataset.playing = '0'; btn.querySelector('use').setAttribute('href', '#i-play'); btn.querySelector('span').textContent = 'Play'; };
  voice.say(reportData.speak, { onWord: (i) => { const t = tokens[map[i]]; if (t && t !== lit) { lit?.classList.remove('kw'); t.classList.add('kw'); lit = t; } }, onEnd: done });
  const watch = () => { if (btn.dataset.playing !== '1') return; if (!voice.speaking) done(); else setTimeout(watch, 400); };
  setTimeout(watch, 1500);
}

async function shareReport() {
  if (!reportData) return;
  const text = `${plain(reportData.screen)}\n\n— Christina, voice tutor`;
  try {
    let file = null;
    if (!S.prefs.freeVoice && S.config?.voice) {
      const bufs = await voice.buffers(reportData.speak, S.prefs.lang);
      if (bufs.length) file = new File([buffersToWav(bufs)], 'christina-voice-note.wav', { type: 'audio/wav' });
    }
    if (file && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text, title: 'Voice note from Christina' }); return; }
    if (file) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Voice note saved. Attach it on WhatsApp.', { kind: 'ok' });
      return;
    }
    if (navigator.share) await navigator.share({ text, title: 'Note from Christina' });
    else { await navigator.clipboard?.writeText(text); toast('The note was copied.', { kind: 'ok' }); }
  } catch (e) { if (e?.name !== 'AbortError') toast('Sharing was not possible on this device.', { kind: 'warn' }); }
}

// ───────────────────────── Practice ladder (F5) ─────────────────────────
async function loadPractice(btn) {
  const lesson = S.lesson;
  if (!lesson) return;
  btn.disabled = true;
  showThinking();
  try {
    const r = await api('practice', { language: S.prefs.lang, grade: S.prefs.grade, problem: lesson.problem, solvedWith: { hints: lesson.hintsUsed, teachScore: lesson.teachScore } });
    if (S.lesson !== lesson) return;
    removeThinking();
    const extra = document.createElement('div');
    extra.className = 'practice';
    const labels = ui('levels');
    r.problems.forEach((p, i) => {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'pr-card glass-2'; c.dataset.level = p.level; c.dataset.tilt = '7'; c.lang = L().tag;
      c.innerHTML = `<span class="glare"></span><span class="pr-level">${esc(labels[i] || p.level)}</span><span class="pr-text">${rich(p.text, { words: false })}</span>`;
      c.onclick = () => startLesson(p.text, { practice: true, subject: lesson.subject, fromCard: c });
      extra.appendChild(c);
    });
    addTutor({ screen: `${ui('practice')} →`, speak: '' }, { extra, history: false, speak: false });
    stagger(extra.children, (el, d) => flip(el, { axis: 'y', from: 90, delay: d + 150 }), 120);
  } catch (e) {
    addError(e, () => loadPractice(btn));
  } finally { btn.disabled = false; }
}

// ───────────────────────── Show me (F7) ─────────────────────────
async function showMe() {
  const lesson = S.lesson;
  if (!lesson || S.busy) return;
  S.busy = true;
  showThinking();
  try {
    const spec = await api('visual', { language: S.prefs.lang, grade: S.prefs.grade, problem: lesson.problem, history: lesson.history });
    if (S.lesson !== lesson) return;
    const svg = renderVisual(spec);
    let extra = null;
    if (svg) { extra = document.createElement('div'); extra.className = 'visual'; extra.innerHTML = svg; extra.setAttribute('aria-label', spec.caption || 'Diagram'); }
    const cap = spec.caption || '';
    addTutor({ screen: cap, speak: cap }, { extra, history: true });
  } catch (e) {
    addError(e, showMe);
  } finally { S.busy = false; }
}

// ───────────────────────── Share card (F8) ─────────────────────────
async function shareLesson(record) {
  const l = record ? byCode(record.lang) : L();
  const src = record || S.lesson;
  if (!src) return;
  try {
    const res = await shareSolved({ greet: l.ui.greet, solvedSelf: l.ui.solvedSelf, problem: plain(src.problem), stars: src.stars || 1, lang: l.tag, font: l.font });
    if (res === 'downloaded') toast('Your card was saved. Share it anywhere!', { kind: 'ok' });
  } catch (e) { if (e?.name !== 'AbortError') toast('Could not make the share card on this device.', { kind: 'warn' }); }
}

// ───────────────────────── Photos ─────────────────────────
async function shrinkPhoto(file, max = 1600, quality = 0.85) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {
    bmp = await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = URL.createObjectURL(file); });
  }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/jpeg', quality);
  const t = document.createElement('canvas');
  const ts = Math.min(1, 360 / Math.max(c.width, c.height));
  t.width = Math.round(c.width * ts); t.height = Math.round(c.height * ts);
  t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
  return { base64: dataUrl.split(',')[1], full: dataUrl, thumb: t.toDataURL('image/jpeg', 0.8) };
}

async function handlePhoto(file) {
  if (!file) return;
  if (!/^image\//.test(file.type)) { toast('That file is not a photo. Choose a picture of your homework.', { kind: 'warn' }); return; }
  stopAll();
  let shot;
  try { shot = await shrinkPhoto(file); } catch { toast('That photo could not be opened. Try another one.', { kind: 'warn' }); return; }
  S.photoFull = shot.full;
  // Show the lesson with the photo being scanned (laser line + shimmer skeleton).
  log.innerHTML = '';
  resetPanels();
  S.lesson = null;
  $('problemText').innerHTML = '<span class="skeleton" style="width:85%"></span><span class="skeleton" style="width:60%"></span>';
  $('problemCard').classList.add('scanning');
  $('pcThumb').hidden = false;
  $('pcImg').src = shot.thumb;
  await goLesson();
  showThinking('Reading your photo…');
  try {
    const r = await api('photo', { image: shot.base64, mime: 'image/jpeg' });
    removeThinking();
    $('problemCard').classList.remove('scanning');
    if (!r.readable) {
      $('problemText').textContent = 'The photo was not clear enough.';
      addError(new Error('The photo was not clear enough to read. Hold the phone steady over the page, use good light, keep one problem in the frame and try again, or type the problem.'), () => $('camBtn').click());
      return;
    }
    S.lesson = newLesson(r.problem, { photo: shot.thumb, subject: r.subject });
    setProblem(r.problem, shot.thumb);
    saveRecent();
    return askTutor({ kind: 'start' });
  } catch (e) {
    $('problemCard').classList.remove('scanning');
    $('problemText').textContent = 'The photo could not be read.';
    addError(e, () => handlePhoto(file));
  }
}

// ───────────────────────── Listening (push to talk) ─────────────────────────
let recording = null;
let webRec = null;
let levelRaf = 0;

function useWebSpeech() { return S.prefs.freeVoice || !S.config?.ears || !window.MediaRecorder; }

export async function startListening() {
  if (S.listening || callActive()) return;
  voice.stop();
  S.listening = true;
  const micBtn = $('micBtn');
  micBtn.classList.add('rec');
  micBtn.setAttribute('aria-label', 'Stop and send');
  document.body.classList.add('recording');
  setMood('listening');
  const cap = $('caption');
  cap.className = 'caption listening';
  cap.textContent = ui('listening');
  dotWave(micBtn);
  pressKbd('Space');
  if (useWebSpeech()) {
    webRec = recognizer(S.prefs.lang, {
      onInterim: (t) => { cap.innerHTML = t ? t.split(/\s+/).map((w) => `<span class="cw">${esc(w)}</span>`).join(' ') : esc(ui('listening')); },
      onEnd: (text) => { const r = webRec; webRec = null; if (r) finishHeard(text, null); },
      onError: (err) => { if (err === 'not-allowed') toast('Microphone permission is blocked. Allow it in the address bar, or type your doubt.', { kind: 'err' }); },
    });
    if (!webRec) { endListeningUI(); toast("This browser can't listen. Type your doubt instead, or turn off Free browser voice.", { kind: 'warn' }); return; }
    try { webRec.start(); } catch { /* already started */ }
    return;
  }
  try {
    voice.context();
    await mic.open();
  } catch (e) { endListeningUI(); toast(e.message, { kind: 'err', ms: 6000 }); return; }
  if (!S.listening) { mic.close(); return; }
  recording = mic.record({ onAutoStop: () => { toast('That was 30 seconds, so I stopped listening.', { kind: 'info' }); stopListening(); } });
  orb.attach(mic.analyser);
  let lastPeak = 0;
  const lv = () => {
    if (!S.listening) return;
    const l = mic.level();
    const v = Math.min(1, l * 9);
    micBtn.style.setProperty('--lvl', String(1 + v * 0.14));
    const now = performance.now();
    if (l > 0.06 && now - lastPeak > 200) { lastPeak = now; soundRing(micBtn); }
    levelRaf = requestAnimationFrame(lv);
  };
  lv();
}

function endListeningUI() {
  S.listening = false;
  cancelAnimationFrame(levelRaf);
  const micBtn = $('micBtn');
  micBtn.classList.remove('rec');
  micBtn.style.removeProperty('--lvl');
  micBtn.setAttribute('aria-label', 'Hold to talk (or hold Space)');
  document.body.classList.remove('recording');
  orb.detach(mic.analyser);
  const cap = $('caption');
  cap.className = 'caption';
  if (cap.textContent === ui('listening')) cap.textContent = '';
  if (moodState === 'listening') setMood('idle');
}

function cancelListening() {
  recording?.cancel(); recording = null;
  try { webRec?.abort(); } catch { /* ignore */ }
  webRec = null;
  mic.close();
  endListeningUI();
}

export async function stopListening() {
  if (!S.listening) return;
  if (webRec) { try { webRec.stop(); } catch { /* ignore */ } endListeningUI(); return; }
  const rec = recording; recording = null;
  endListeningUI();
  if (!rec) { mic.close(); return; }
  const { blob, ms, mime } = await rec.stop();
  mic.close();
  if (ms < 450 || blob.size < 1200) { toast('Hold the mic (or Space) while you speak.', { kind: 'info', ms: 2600 }); return; }
  const cap = $('caption');
  cap.innerHTML = `<span class="shimmer-text">${esc(ui('thinking'))}</span>`;
  try {
    const audio = await blobToBase64(blob);
    const r = await api('transcribe', { audio, mime, language: S.prefs.lang });
    finishHeard(r.text, r.language);
  } catch (e) {
    cap.textContent = '';
    toast(e.message, { kind: 'err', ms: 5000 });
  }
}

function finishHeard(text, language) {
  const cap = $('caption');
  const t = String(text || '').trim();
  if (!t) { cap.textContent = ''; toast("I didn't catch that. Try again a little closer to the mic.", { kind: 'info' }); return; }
  cap.innerHTML = t.split(/\s+/).map((w, i) => `<span class="cw" style="animation-delay:${i * 40}ms">${esc(w)}</span>`).join(' ');
  setTimeout(() => { if (cap.querySelector('.cw')) cap.textContent = ''; }, 2600);
  maybeSwitchLanguage(language);
  routeInput(t);
}

export function routeInput(text) {
  if (S.mode === 'teach' && S.lesson?.solved) return teachback(text);
  if (!S.lesson) return startLesson(text);
  return askTutor({ message: text });
}

// F11: offer to switch when the student speaks another language.
function maybeSwitchLanguage(code) {
  if (!code || code === S.prefs.lang || !LANGS.some((l) => l.code === code)) return;
  const target = byCode(code);
  const cap = $('caption');
  setTimeout(() => {
    cap.innerHTML = '';
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'switch-chip'; b.lang = target.tag;
    b.textContent = fmt(target.ui.switchTo, { x: target.native });
    b.onclick = () => { setLanguage(code); cap.textContent = ''; };
    cap.appendChild(b);
    pop(b);
    setTimeout(() => { if (b.isConnected) b.remove(); }, 9000);
  }, 2700);
}

function soundRing(btn) {
  if (reduced()) return;
  const r = document.createElement('span');
  r.className = 'sound-ring';
  btn.appendChild(r);
  r.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 0.8 }, { transform: 'translate(-50%,-50%) scale(2.3)', opacity: 0 }], { duration: 900, easing: EASE.out }).finished.then(() => r.remove(), () => r.remove());
}

function dotWave(from) {
  if (reduced() || tier() === 'lite') return;
  const [x, y] = centerOf(from);
  const w = document.createElement('span');
  w.className = 'dot-wave';
  w.style.left = `${x}px`; w.style.top = `${y}px`;
  document.querySelector('.bg').appendChild(w);
  w.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 0.9 }, { transform: 'translate(-50%,-50%) scale(120)', opacity: 0 }], { duration: 1400, easing: EASE.out }).finished.then(() => w.remove(), () => w.remove());
}

function captionNote(text) {
  const cap = $('caption');
  cap.className = 'caption';
  cap.textContent = text;
  setTimeout(() => { if (cap.textContent === text) cap.textContent = ''; }, 5000);
}

// ───────────────────────── Recent lessons (F12) ─────────────────────────
function saveRecent() {
  const l = S.lesson;
  if (!l) return;
  const list = store.get('recent', []).filter((r) => r.id !== l.id);
  const { photo, ...rest } = l;
  list.unshift({ ...rest, history: l.history.slice(-24), date: new Date().toISOString() });
  store.set('recent', list.slice(0, 10));
  renderRecent();
}

function renderRecent() {
  const list = store.get('recent', []);
  const ul = $('recentList');
  ul.innerHTML = '';
  $('recentCard').hidden = !list.length;
  for (const r of list) {
    const li = document.createElement('li');
    const d = new Date(r.date);
    li.innerHTML = `<button type="button"><span class="${r.solved ? 'ok' : ''}">${r.solved ? '✓' : '↺'}</span><span class="rt"></span><span class="rd">${byCode(r.lang).native} · ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span></button>`;
    li.querySelector('.rt').textContent = plain(r.problem);
    li.querySelector('.rt').lang = byCode(r.lang).tag;
    li.querySelector('button').onclick = () => resumeLesson(r.id);
    ul.appendChild(li);
  }
}

async function resumeLesson(id) {
  const r = store.get('recent', []).find((x) => x.id === id);
  if (!r) return;
  stopAll();
  if (r.lang && r.lang !== S.prefs.lang) await setLanguage(r.lang, { quiet: true });
  S.lesson = { ...newLesson(r.problem), ...r, photo: null };
  S.mode = 'ask';
  resetPanels();
  log.innerHTML = '';
  setProblem(r.problem, null);
  closeSheet();
  await goLesson();
  for (const h of r.history) {
    if (h.role === 'user') { if (!h.content.startsWith('[')) addStudent(h.content); } else addTutor({ screen: h.content, speak: plain(h.content) }, { speak: false, history: false });
  }
  const board = r.board.slice(); S.lesson.board = []; board.forEach(addBoardLine);
  const terms = r.terms.slice(); S.lesson.terms = []; addWords(terms);
  renderLadder();
  if (r.solved) { for (const b of [$('teachBtn'), $('parentBtn')]) { b.disabled = false; b.classList.add('ready'); } $('teachChip').hidden = false; }
  setMood('idle');
  toast('Lesson resumed. Carry on where you left off.', { kind: 'ok', ms: 2600 });
}

// ───────────────────────── Dialogs ─────────────────────────
const openers = new Map();
export function openDialog(dlg, trigger) {
  if (dlg.open) {
    if (!dlg.classList.contains('closing')) return;
    // Reopened while it was animating closed: cancel the close and grow it back.
    dlg.classList.remove('closing');
    dlg.getAnimations().forEach((a) => a.cancel());
    growFrom(dlg, trigger || openers.get(dlg));
    return;
  }
  openers.set(dlg, trigger || document.activeElement);
  dlg.showModal();
  dlg.classList.remove('closing');
  growFrom(dlg, trigger);
  document.body.classList.add('dialog-open');
  trigger?.setAttribute?.('aria-expanded', 'true');
}

export async function closeDialog(dlg) {
  if (!dlg.open || dlg.classList.contains('closing')) return;
  const trigger = openers.get(dlg);
  dlg.classList.add('closing');
  await shrinkTo(dlg, trigger);
  if (!dlg.classList.contains('closing')) return; // reopened meanwhile
  dlg.close();
  dlg.classList.remove('closing');
  dlg.style.removeProperty('opacity');
  dlg.getAnimations().forEach((a) => a.cancel());
  trigger?.setAttribute?.('aria-expanded', 'false');
  if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
  if (trigger?.focus && trigger.isConnected) trigger.focus({ preventScroll: true });
  if (dlg.id === 'reportDlg') voice.stop();
}

for (const dlg of document.querySelectorAll('dialog.dlg')) {
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (dlg.id !== 'passDlg') closeDialog(dlg); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg && dlg.id !== 'passDlg') closeDialog(dlg); });
  dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeDialog(dlg)));
}

function askPasscode(wrong) {
  const dlg = $('passDlg');
  $('passHint').textContent = wrong ? 'That passcode was not accepted. Try again.' : "This Christina is protected so strangers can't use up its free quota. Ask the person who shared the link.";
  $('passInput').value = '';
  openDialog(dlg, null);
  setTimeout(() => $('passInput').focus(), 50);
  return new Promise((resolve) => {
    $('passForm').onsubmit = (e) => {
      e.preventDefault();
      S.passcode = $('passInput').value.trim();
      store.set('pass', S.passcode);
      closeDialog(dlg);
      resolve();
    };
  });
}

function segSetup(box, key, value, onChange) {
  box.querySelectorAll('button').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset[key] === value));
    b.onclick = () => { box.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b))); onChange(b.dataset[key]); };
  });
}

function toggleSetup(btn, value, onChange) {
  btn.setAttribute('aria-checked', String(!!value));
  btn.onclick = () => { const v = btn.getAttribute('aria-checked') !== 'true'; btn.setAttribute('aria-checked', String(v)); onChange(v); };
}

function buildSettings() {
  buildCoins($('setClass'));
  const mixBox = $('setMix');
  mixBox.innerHTML = MIXES.map((m) => `<button type="button" role="radio" data-mix="${m.id}" title="${m.tip}">${m.label}</button>`).join('');
  segSetup(mixBox, 'mix', S.prefs.mix, (v) => setMix(v));
  segSetup($('setVoice'), 'v', S.prefs.voice, (v) => { S.prefs.voice = v; savePrefs(); voice.say(L().ui.greet); });
  const pace = $('setPace');
  pace.value = String(S.prefs.pace);
  $('paceVal').textContent = `${Number(S.prefs.pace).toFixed(2)}×`;
  pace.oninput = () => { S.prefs.pace = Number(pace.value); $('paceVal').textContent = `${S.prefs.pace.toFixed(2)}×`; savePrefs(); };
  toggleSetup($('setSpeak'), !S.prefs.muted, (v) => setMuted(!v));
  toggleSetup($('setFree'), S.prefs.freeVoice, (v) => { S.prefs.freeVoice = v; savePrefs(); toast(v ? 'Free browser voice is on. No AI voice calls are made.' : 'The AI voice is back on.', { kind: 'ok' }); });
  segSetup($('setFx'), 'fx', S.prefs.fx, (v) => { S.prefs.fx = v; S.autoTier = null; savePrefs(); applyTier(); });
  applyTier();
}

function setMuted(m) {
  S.prefs.muted = m;
  savePrefs();
  document.body.classList.toggle('muted', m);
  const b = $('muteBtn');
  b.setAttribute('aria-pressed', String(m));
  b.setAttribute('aria-label', m ? "Turn Christina's voice on" : "Turn Christina's voice off");
  b.querySelector('use').setAttribute('href', m ? '#i-volume-off' : '#i-volume');
  $('setSpeak').setAttribute('aria-checked', String(!m));
  if (m) voice.stop();
}

function setMix(v) {
  if (S.prefs.mix === v) return;
  S.prefs.mix = v;
  savePrefs();
  renderMix();
  const m = MIXES.find((x) => x.id === v);
  toast(`${L().mixes[MIXES.indexOf(m)]} · ${m.tip}. Christina's next reply will use it.`, { kind: 'ok', ms: 2800 });
}

function renderMix() {
  const box = $('mix');
  const names = L().mixes;
  box.querySelectorAll('button').forEach((b, i) => {
    b.textContent = names[i] || MIXES[i].label;
    b.setAttribute('aria-checked', String(b.dataset.mix === S.prefs.mix));
  });
  $('mix').hidden = S.prefs.lang === 'en-IN';
  const on = box.querySelector('[aria-checked="true"]');
  const ind = box.querySelector('.mix-ind');
  if (on && ind) requestAnimationFrame(() => { ind.style.width = `${on.offsetWidth}px`; ind.style.transform = `translateX(${on.offsetLeft}px)`; });
  $('setMix')?.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mix === S.prefs.mix)));
}

// About: live service status
async function openAbout(trigger) {
  openDialog($('aboutDlg'), trigger);
  trigger?.classList.add('bounce');
  setTimeout(() => trigger?.classList.remove('bounce'), 700);
  renderServices(null);
  try {
    const h = await api('health');
    renderServices(h);
  } catch (e) { renderServices({ error: e.message }); }
}

function renderServices(h) {
  const c = S.config || {};
  const box = $('services');
  const s = h?.services || {};
  const row = (name, label, svc, note) => {
    const st = h == null ? 'wait' : svc ? (svc.ok ? 'ok' : svc.configured === false ? '' : 'bad') : (label ? '' : '');
    const detail = svc?.ok ? `${svc.model ? `${svc.model} · ` : ''}connected` : svc?.error || note || (label ? 'Checking…' : 'Not configured');
    return `<div class="svc"><span class="dot ${st}" aria-hidden="true"></span><div class="sv"><b>${esc(name)}: ${esc(label || 'not set up')}</b><span>${esc(h == null ? 'Checking…' : detail)}</span></div><span class="ms">${svc?.ok ? `${svc.latencyMs} ms` : ''}</span></div>`;
  };
  const sarvamSet = s.sarvam && s.sarvam.configured !== false;
  box.innerHTML = [
    row('Brain', c.brain, h ? (c.brain?.startsWith('Sarvam') ? s.sarvam : s.gemini) : null),
    row('Eyes (photos, scratchpad)', c.eyes, h ? s.gemini : null),
    row('Ears (speech to text)', c.ears, h ? (sarvamSet ? s.sarvam : s.gemini) : null),
    row('Voice (text to speech)', c.voice, h ? (sarvamSet ? s.sarvam : s.geminiTts) : null),
    row('Backup', c.backup || (sarvamSet ? 'Sarvam' : null), h ? (sarvamSet ? s.gemini : s.sarvam) : null, 'Add SARVAM_API_KEY for a backup brain and Indian voices'),
  ].join('') + (h?.error ? `<div class="note warn">${esc(h.error)}</div>` : '') + (!c.brain ? '<div class="note warn">No AI key yet. Paste a free Gemini key into <b>keys.txt</b> after <b>GEMINI_API_KEY=</b> and refresh. On Vercel, add it under Environment Variables and redeploy.</div>' : '');
  $('healthWhen').textContent = h?.checkedAt ? `· checked ${new Date(h.checkedAt).toLocaleTimeString()}` : '';
}

// Language picker dialog
function openLangPicker(trigger) {
  buildTiles($('langTiles'), (code) => { setLanguage(code); setTimeout(() => closeDialog($('langDlg')), 350); });
  openDialog($('langDlg'), trigger);
  stagger($('langTiles').children, (t, d) => flip(t, { from: 50, delay: d }), 30, 120);
}

// ───────────────────────── Phone bottom sheet ─────────────────────────
const panel = $('panel');
const scrim = $('scrim');
function openSheet() {
  if (!isPhone()) return;
  panel.classList.add('open');
  panel.style.setProperty('--drag', '0px');
  scrim.classList.add('on');
  scrim.style.removeProperty('--p');
  $('panelBtn').setAttribute('aria-expanded', 'true');
  panel.setAttribute('aria-modal', 'true');
  setTimeout(() => $('sheetHandle').focus({ preventScroll: true }), 300);
}
function closeSheet() {
  if (!panel.classList.contains('open')) return;
  panel.classList.remove('open');
  scrim.classList.remove('on');
  scrim.style.removeProperty('--p');
  $('panelBtn').setAttribute('aria-expanded', 'false');
  panel.removeAttribute('aria-modal');
}
(() => {
  const h = $('sheetHandle');
  let y0 = 0; let dy = 0; let dragging = false;
  h.addEventListener('pointerdown', (e) => { dragging = true; y0 = e.clientY; dy = 0; panel.classList.add('dragging'); h.setPointerCapture(e.pointerId); });
  h.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dy = e.clientY - y0;
    const shown = dy < 0 ? dy * 0.25 : dy; // elastic overscroll upwards
    panel.style.setProperty('--drag', `${shown}px`);
    scrim.style.setProperty('--p', String(Math.max(0, 1 - Math.max(0, dy) / panel.offsetHeight)));
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove('dragging');
    if (dy > panel.offsetHeight * 0.3) closeSheet();
    else { panel.style.setProperty('--drag', '0px'); scrim.style.removeProperty('--p'); }
    if (Math.abs(dy) < 4) closeSheet(); // a tap on the handle closes it
  };
  h.addEventListener('pointerup', end);
  h.addEventListener('pointercancel', end);
  h.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeSheet(); $('panelBtn').focus(); } });
  scrim.addEventListener('click', closeSheet);
})();

// ───────────────────────── Keyboard ─────────────────────────
const typingTarget = (el) => el && (el.closest('input, textarea, select, button, [contenteditable="true"], [role="button"], a, dialog') != null);
const overlayOpen = () => !!document.querySelector('dialog[open]') || callActive() || padOpen() || skyOpen() || !$('onboard').hidden || !!document.querySelector('.lightbox');
let spaceHeld = false;

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const lb = document.querySelector('.lightbox');
    if (lb) { lb.click(); return; }
    if (callActive() || padOpen() || skyOpen()) return; // their own handlers close them
    if (panel.classList.contains('open')) { closeSheet(); return; }
    if (S.listening) { cancelListening(); return; }
    pressKbd('Esc');
    voice.stop();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey || overlayOpen()) return;
  if (e.code === 'Space' && !e.repeat && !typingTarget(e.target)) { e.preventDefault(); spaceHeld = true; startListening(); return; }
  if (typingTarget(e.target)) return;
  const k = e.key.toLowerCase();
  if (k === 'h') { e.preventDefault(); requestHint(); }
  else if (k === 'n') { e.preventDefault(); pressKbd('N'); if (S.lesson || !$('lesson').hidden) goHome(); else $('ask').focus(); }
  else if (k === '/') { e.preventDefault(); $('ask').focus(); }
});
addEventListener('keyup', (e) => { if (e.code === 'Space' && spaceHeld) { spaceHeld = false; e.preventDefault(); stopListening(); } });
addEventListener('blur', () => { if (spaceHeld) { spaceHeld = false; stopListening(); } });

// ───────────────────────── Wiring ─────────────────────────
$('dock').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('ask');
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  input.value = '';
  // the text flies up into the log as a little paper plane
  if (!reduced()) flyTo(input, log.lastElementChild || log, { html: esc(text.slice(0, 60)), className: 'paper-plane', dur: 600, arc: -60, scaleTo: 0.6 });
  routeInput(text);
});

const micBtn = $('micBtn');
let pressT = 0; let tapMode = false;
micBtn.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  if (S.listening && tapMode) { tapMode = false; stopListening(); return; }
  pressT = performance.now();
  micBtn.setPointerCapture?.(e.pointerId);
  startListening();
});
micBtn.addEventListener('pointerup', () => {
  if (!S.listening || tapMode) return;
  if (performance.now() - pressT < 300) { tapMode = true; return; } // a quick tap keeps listening until the next tap
  stopListening();
});
micBtn.addEventListener('pointercancel', () => { if (S.listening && !tapMode) stopListening(); });
micBtn.addEventListener('click', (e) => { if (e.detail === 0) { if (S.listening) stopListening(); else { tapMode = true; startListening(); } } }); // keyboard
micBtn.addEventListener('contextmenu', (e) => e.preventDefault());

$('camBtn').addEventListener('click', () => $('photoInput').click());
$('photoInput').addEventListener('change', (e) => { const f = e.target.files?.[0]; e.target.value = ''; handlePhoto(f); });
$('pcThumb').addEventListener('click', () => {
  const src = S.photoFull || $('pcImg').src;
  if (!src) return;
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `<img alt="Your homework photo">`;
  lb.querySelector('img').src = src;
  lb.onclick = () => { animate(lb, [{ opacity: 1 }, { opacity: 0 }], { duration: DUR.s, fill: 'forwards' }, 'exit').finished.then(() => lb.remove(), () => lb.remove()); };
  document.body.appendChild(lb);
  animate(lb.querySelector('img'), [{ transform: 'scale(.6) rotateY(-25deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: DUR.l, easing: EASE.spring }, 'enter');
});
$('hintBtn').addEventListener('click', requestHint);
$('showBtn').addEventListener('click', showMe);
$('padBtn').addEventListener('click', (e) => openPad(ctx, e.currentTarget));
$('teachChip').addEventListener('click', startTeach);
$('teachBtn').addEventListener('click', startTeach);
$('parentBtn').addEventListener('click', (e) => openReport(e.currentTarget));
$('reportPlay').addEventListener('click', playReport);
$('reportWa').addEventListener('click', () => { if (reportData) open(`https://wa.me/?text=${encodeURIComponent(`${plain(reportData.screen)}\n\n— Christina, voice tutor`)}`, '_blank', 'noopener'); });
$('reportShare').addEventListener('click', shareReport);
$('newBtn').addEventListener('click', () => { pressKbd('N'); goHome(); });
$('muteBtn').addEventListener('click', () => setMuted(!S.prefs.muted));
$('callBtn').addEventListener('click', (e) => openCall(ctx, e.currentTarget));
$('skyBtn').addEventListener('click', (e) => openSky(ctx, e.currentTarget));
$('panelBtn').addEventListener('click', () => (panel.classList.contains('open') ? closeSheet() : openSheet()));
$('settingsBtn').addEventListener('click', (e) => { buildSettings(); openDialog($('settingsDlg'), e.currentTarget); });
$('aboutBtn').addEventListener('click', (e) => openAbout(e.currentTarget));
$('recheck').addEventListener('click', async () => { renderServices(null); try { renderServices(await api('health')); } catch (e) { renderServices({ error: e.message }); } });
$('langPill').addEventListener('click', (e) => openLangPicker(e.currentTarget));
$('setLang').addEventListener('click', (e) => openLangPicker(e.currentTarget));
$('mix').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => setMix(b.dataset.mix)));
$('replayIntro').addEventListener('click', () => { closeDialog($('settingsDlg')); setTimeout(showOnboarding, 300); });
$('resetAll').addEventListener('click', () => {
  if (!confirm('Clear your stars, streak, recent lessons and saved voice? Your settings stay.')) return;
  ['sky', 'recent', 'stats'].forEach((k) => store.del(k));
  S.stats = { practiceStreak: 0 };
  caches.delete('christina-voice-v1').catch(() => {});
  renderStats(false); renderRecent(); renderHeroRecent();
  toast('Progress cleared.', { kind: 'ok' });
});
$('obStart').addEventListener('click', finishOnboarding);
$('brand').addEventListener('click', (e) => {
  e.preventDefault();
  const p = document.createElement('span');
  p.className = 'ping';
  e.currentTarget.appendChild(p);
  p.animate([{ transform: 'scale(1)', opacity: 0.9 }, { transform: 'scale(2.4)', opacity: 0 }], { duration: 700, easing: EASE.out }).finished.then(() => p.remove(), () => p.remove());
  if (S.lesson || !$('lesson').hidden) goHome();
});
orbEl.addEventListener('click', () => {
  orb.pulse();
  if (S.lastReply?.el?.isConnected) speakMessage(S.lastReply.el, S.lastReply.r, S.lastReply.el.querySelector('.listen-btn'));
  else voice.say(`${ui('greet')}! ${ui('sub')}`);
});

// Dot grid brightens near the cursor (desktop, full tier)
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || tier() !== 'full' || reduced()) return;
  const d = $('dotsHover');
  d.classList.add('on');
  d.style.setProperty('--hx', `${e.clientX}px`);
  d.style.setProperty('--hy', `${e.clientY}px`);
}, { passive: true });

// Offline / online (F9)
addEventListener('offline', () => { setMood('idle'); toast(ui('offline'), { kind: 'warn', ms: 6000 }); });
addEventListener('online', () => { setMood('idle'); toast('Back online.', { kind: 'ok', ms: 2200 }); });

// Shared context for feature modules (call mode, scratchpad, sky).
export const ctx = { S, L, ui, api, voice, mic, orb, aurora, toast, setMood, moveOrb, addTutor, addStudent, handleReply, askTutor, startLesson, routeInput, showThinking, removeThinking, addError, addBoardLine, speakMessage, openDialog, closeDialog, shareLesson, renderStats, stopAll, goHome, finishHeard, maybeSwitchLanguage, isPhone, store };

// ───────────────────────── Start ─────────────────────────
let placeholderTyper = null;
async function init() {
  S.autoTier = null;
  applyTier();
  installPointerFX();
  installFocusRing();
  document.body.classList.add('has-ring');
  setMuted(S.prefs.muted);
  placeholderTyper = typePlaceholder($('ask'), () => EXAMPLES(S.prefs.lang).map((e) => plain(e.text)));
  applyLanguage();
  renderStats(false);
  renderRecent();
  renderLadder();
  setMood(navigator.onLine ? 'idle' : 'offline');
  addEventListener('resize', () => { renderMix(); renderLadder(); if (!isPhone()) closeSheet(); });

  // FPS watchdog: in Auto, drop a tier if we stay under 45 fps for 3 s.
  setTimeout(() => fpsWatchdog((fps) => {
    if (S.prefs.fx !== 'auto') return;
    const cur = document.documentElement.dataset.tier;
    const next = cur === 'full' ? 'medium' : 'lite';
    if (cur === 'lite') return;
    S.autoTier = next;
    applyTier();
    console.info(`[christina] ${Math.round(fps)} fps, switching visual effects to ${next}.`);
  }), 4000);

  if (!S.prefs.onboarded) showOnboarding(); else intro();

  try {
    S.config = await api('config');
    if (!S.config.brain) toast('No AI key yet. Paste a free Gemini key into keys.txt after GEMINI_API_KEY= and refresh (on Vercel: Environment Variables).', { kind: 'warn', ms: 12000, action: 'How?', onAction: () => openAbout($('aboutBtn')) });
  } catch (e) {
    S.config = {};
    toast(e.message, { kind: 'err', ms: 8000 });
  }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

init();
