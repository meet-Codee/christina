// call.js: F3 "Talk to Christina", a hands-free voice call.
// Voice activity detection decides when the student has finished, the reply is spoken, and listening starts again.
// Talking over Christina (louder, for 300 ms) interrupts her: barge-in.
import { VAD, recognizer, blobToBase64 } from './mic.js';
import { viewTransition, animate, DUR, EASE, reduced } from './motion.js';
import { esc } from './fx.js';
import { wordsOf } from './voice.js';

let active = false;
export const callActive = () => active;

export async function openCall(ctx, trigger) {
  if (active) return;
  const { S, api, voice, mic, toast, setMood, moveOrb, ui } = ctx;
  const $ = (id) => document.getElementById(id);
  const view = $('call');
  const status = $('callStatus');
  const you = $('callYou');
  const her = $('callHer');
  const meter = $('vadMeter');
  const muteBtn = $('callMute');
  const free = S.prefs.freeVoice || !S.config?.ears || !window.MediaRecorder;
  let ended = false;
  let muted = false;
  let state = 'connecting';
  let rec = null;
  let vad = null;
  let sr = null;
  let speechAt = 0;
  let restartTimer = 0;
  let t0 = Date.now();

  active = true;
  ctx.stopAll();
  voice.context();
  await viewTransition(() => { view.hidden = false; moveOrb('call'); });
  if (!reduced()) animate(view.querySelector('.call-controls'), [{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: DUR.l, easing: EASE.spring }, 'enter');
  document.body.classList.add('in-call');
  $('app').setAttribute('inert', '');
  setTimeout(() => $('callEnd').focus({ preventScroll: true }), 50);

  const setStatus = (s, text) => { state = s; status.textContent = text; };
  const clock = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $('callTimer').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 500);

  // Karaoke captions for Christina's voice.
  let herWords = [];
  let gen = -1;
  const onSay = (e) => {
    gen = e.detail.gen;
    her.innerHTML = wordsOf(e.detail.text).map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
    her.lang = ctx.L().tag;
    herWords = [...her.querySelectorAll('.w')];
  };
  let lit = null;
  const onWord = (e) => {
    if (e.detail.gen !== gen) return;
    const w = herWords[e.detail.i];
    if (w && w !== lit) { lit?.classList.remove('kw'); lit?.classList.add('said'); w.classList.add('kw'); lit = w; }
  };
  addEventListener('christina:say', onSay);
  addEventListener('christina:word', onWord);

  const end = async () => {
    if (ended) return;
    ended = true;
    active = false;
    clearInterval(clock);
    clearTimeout(restartTimer);
    removeEventListener('christina:say', onSay);
    removeEventListener('christina:word', onWord);
    removeEventListener('keydown', onKey, true);
    vad?.stop();
    rec?.cancel();
    try { sr?.abort(); } catch { /* ignore */ }
    voice.stop();
    mic.close();
    document.body.classList.remove('in-call');
    $('app').removeAttribute('inert');
    await viewTransition(() => { view.hidden = true; moveOrb('call-end'); });
    setMood('idle');
    you.textContent = ''; her.textContent = '';
    trigger?.focus?.({ preventScroll: true });
  };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); } };
  addEventListener('keydown', onKey, true);
  $('callEnd').onclick = end;
  muteBtn.onclick = () => {
    muted = !muted;
    muteBtn.setAttribute('aria-pressed', String(muted));
    muteBtn.setAttribute('aria-label', muted ? 'Unmute my microphone' : 'Mute my microphone');
    muteBtn.querySelector('use').setAttribute('href', muted ? '#i-mic-off' : '#i-mic');
    if (muted) { rec?.cancel(); rec = null; try { sr?.abort(); } catch { /* ignore */ } setStatus('muted', 'Muted'); setMood('idle'); }
    else listen();
  };

  // Wait for Christina to finish (or be interrupted).
  const waitForVoice = async () => {
    await new Promise((r) => setTimeout(r, 150));
    while (!ended && (voice.speaking || S.busy)) await new Promise((r) => setTimeout(r, 120));
  };

  // Send what the student said through the normal lesson flow.
  const respond = async (text) => {
    if (ended) return;
    const t = String(text || '').trim();
    if (!t) { setStatus('listening', "Didn't catch that. Listening…"); return listen(); }
    you.textContent = t;
    you.lang = ctx.L().tag;
    setStatus('thinking', ui('thinking'));
    setMood('thinking');
    her.textContent = '';
    try { await ctx.routeInput(t); } catch { /* errors are shown in the log */ }
    if (ended) return;
    if (voice.speaking) {
      setStatus('speaking', 'Christina is speaking · talk to interrupt');
      if (vad) { vad.bargeMode(true); vad.onStart = bargeIn; }
    }
    await waitForVoice();
    if (!ended && state !== 'listening') listen();
  };

  const bargeIn = () => {
    if (ended || !voice.speaking || muted) return;
    voice.stop();
    view.dataset.bargeIns = String(Number(view.dataset.bargeIns || 0) + 1);
    her.querySelectorAll('.kw').forEach((w) => w.classList.remove('kw'));
    listen(true);
  };

  // Listening with MediaRecorder + VAD.
  const listen = (fromBarge = false) => {
    if (ended || muted) return;
    setStatus('listening', ui('listening'));
    setMood('listening');
    if (free) return listenFree();
    rec?.cancel();
    rec = mic.record({ maxMs: 29_000, onAutoStop: () => finishUtterance() });
    speechAt = fromBarge ? performance.now() : 0;
    vad.bargeMode(false);
    vad.onStart = () => { if (state === 'listening') { speechAt = performance.now(); you.innerHTML = '<span class="shimmer-text">…</span>'; } };
    vad.onEnd = () => { if (state === 'listening' && speechAt) finishUtterance(); };
    if (fromBarge) { vad.speaking = true; you.innerHTML = '<span class="shimmer-text">…</span>'; }
    // Keep recordings small while the room is quiet.
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => { if (state === 'listening' && !speechAt && !ended) listen(); }, 20_000);
  };

  const finishUtterance = async () => {
    if (!rec || ended) return;
    clearTimeout(restartTimer);
    const r = rec; rec = null;
    setStatus('thinking', ui('thinking'));
    setMood('thinking');
    const { blob, ms, mime } = await r.stop();
    if (ms < 400 || blob.size < 1500) return listen();
    try {
      const audio = await blobToBase64(blob);
      const out = await api('transcribe', { audio, mime, language: S.prefs.lang });
      ctx.maybeSwitchLanguage(out.language);
      await respond(out.text);
    } catch (e) {
      if (ended) return;
      toast(e.message, { kind: 'err', ms: 4000 });
      setStatus('listening', 'Something went wrong. Listening again…');
      setTimeout(listen, 1200);
    }
  };

  // Free browser voice: Web Speech continuous recognition.
  const listenFree = () => {
    try { sr?.abort(); } catch { /* ignore */ }
    let got = '';
    sr = recognizer(S.prefs.lang, {
      continuous: true,
      onInterim: (t) => { you.textContent = t; },
      onFinal: (t) => { got += ` ${t}`; clearTimeout(restartTimer); restartTimer = setTimeout(() => { try { sr.stop(); } catch { /* ignore */ } }, 900); },
      onEnd: () => { if (ended || muted || state !== 'listening') return; if (got.trim()) { const t = got; got = ''; respond(t); } else setTimeout(listenFree, 200); },
      onError: (err) => { if (err === 'not-allowed') { toast('Microphone permission is blocked.', { kind: 'err' }); end(); } },
    });
    if (!sr) { toast("This browser can't listen in call mode. Turn off Free browser voice, or use Chrome.", { kind: 'warn', ms: 6000 }); end(); return; }
    try { sr.start(); } catch { /* ignore */ }
  };

  // Connect the microphone and calibrate.
  setStatus('connecting', 'Connecting…');
  try { await mic.open(); } catch (e) {
    if (!free) { toast(e.message, { kind: 'err', ms: 6000 }); return end(); }
  }
  if (ended) return;
  if (mic.analyser) {
    vad = new VAD(mic, { onLevel: (v) => meter.style.setProperty('--v', String(v)) });
    setStatus('connecting', 'Measuring the room…');
    await vad.calibrate(500);
    vad.start();
  }
  if (ended) return;
  // Christina says hello first if there is no lesson yet.
  if (!S.lesson) {
    const hello = `${ui('greet')}! ${ui('title')}`;
    setStatus('speaking', 'Christina is speaking');
    voice.say(hello);
    if (vad) { vad.bargeMode(true); vad.onStart = bargeIn; }
    await waitForVoice();
  }
  t0 = Date.now();
  listen();
}
