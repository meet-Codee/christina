// mic.js: listening. MediaRecorder recordings, a live level for the orb and rings, voice activity detection, and Web Speech for free mode.

const MAX_MS = 30_000;

export function pickMime() {
  if (!window.MediaRecorder) return '';
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']) if (MediaRecorder.isTypeSupported?.(m)) return m;
  return '';
}

export const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

export class Mic {
  constructor(getCtx) {
    this.getCtx = getCtx; // shares the voice AudioContext
    this.stream = null;
    this.analyser = null;
    this.buf = null;
  }

  async open() {
    if (this.stream && this.stream.getAudioTracks().some((t) => t.readyState === 'live')) return this.stream;
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('This browser cannot use the microphone. Type your doubt instead.'), { code: 'no_mic' });
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch (e) {
      const denied = e?.name === 'NotAllowedError' || e?.name === 'SecurityError';
      throw Object.assign(new Error(denied ? 'Microphone permission is blocked. Allow it in the address bar, or type your doubt.' : 'No microphone was found. Type your doubt instead.'), { code: denied ? 'mic_denied' : 'no_mic' });
    }
    const ctx = this.getCtx();
    if (ctx) {
      const src = ctx.createMediaStreamSource(this.stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.2;
      src.connect(this.analyser);
      this.buf = new Float32Array(this.analyser.fftSize);
    }
    return this.stream;
  }

  level() {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.buf);
    let s = 0;
    for (let i = 0; i < this.buf.length; i++) s += this.buf[i] * this.buf[i];
    return Math.sqrt(s / this.buf.length);
  }

  // Start a recording. Returns { stop() → Promise<{blob, ms, mime}>, cancel() }.
  record({ maxMs = MAX_MS, onAutoStop } = {}) {
    const mime = pickMime();
    const rec = new MediaRecorder(this.stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
    const chunks = [];
    const t0 = performance.now();
    let resolveStop;
    const stopped = new Promise((r) => { resolveStop = r; });
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    rec.onstop = () => resolveStop({ blob: new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }), ms: performance.now() - t0, mime: (rec.mimeType || mime || 'audio/webm').split(';')[0] });
    rec.start(250);
    const timer = setTimeout(() => { if (rec.state === 'recording') { rec.stop(); onAutoStop?.(); } }, maxMs);
    return {
      stop: () => { clearTimeout(timer); if (rec.state === 'recording') rec.stop(); return stopped; },
      cancel: () => { clearTimeout(timer); rec.ondataavailable = null; if (rec.state === 'recording') rec.stop(); },
      get ms() { return performance.now() - t0; },
    };
  }

  close() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
  }
}

// Voice activity detection on the analyser's RMS (F3).
// Speech starts after > threshold for 150 ms and ends after < threshold for 1200 ms. Calibrated from 500 ms of room noise.
export class VAD {
  constructor(mic, { onStart, onEnd, onLevel, startMs = 150, endMs = 1200 } = {}) {
    Object.assign(this, { mic, onStart, onEnd, onLevel, startMs, endMs });
    this.threshold = 0.02;
    this.speaking = false;
    this.above = 0;
    this.below = 0;
    this.running = false;
    this.mult = 1;
  }

  async calibrate(ms = 500) {
    const samples = [];
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { samples.push(this.mic.level()); await new Promise((r) => setTimeout(r, 20)); }
    samples.sort((a, b) => a - b);
    const noise = samples[Math.floor(samples.length * 0.8)] || 0.005;
    this.threshold = Math.min(0.09, Math.max(0.014, noise * 3));
    return this.threshold;
  }

  start() {
    this.running = true;
    this.speaking = false;
    this.above = this.below = 0;
    let last = performance.now();
    const tick = () => {
      if (!this.running) return;
      const now = performance.now();
      const dt = now - last; last = now;
      const lvl = this.mic.level();
      const thr = this.threshold * this.mult;
      this.onLevel?.(Math.min(1, lvl / (thr * 3)), lvl > thr);
      if (lvl > thr) { this.above += dt; this.below = 0; } else { this.below += dt; this.above = Math.max(0, this.above - dt * 0.5); }
      if (!this.speaking && this.above >= this.startMs) { this.speaking = true; this.onStart?.(); }
      else if (this.speaking && this.below >= this.endMs) { this.speaking = false; this.above = 0; this.onEnd?.(); }
      this.timer = setTimeout(tick, 30);
    };
    tick();
  }

  // Barge-in mode: louder and longer before it counts (threshold × 1.8 for 300 ms).
  bargeMode(on) { this.mult = on ? 1.8 : 1; this.startMs = on ? 300 : 150; this.above = 0; this.speaking = false; }

  stop() { this.running = false; clearTimeout(this.timer); }
}

// Web Speech recognition (free browser voice).
export function recognizer(lang, { continuous = false, onInterim, onFinal, onEnd, onError } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = lang === 'od-IN' ? 'or-IN' : lang;
  r.interimResults = true;
  r.continuous = continuous;
  r.maxAlternatives = 1;
  let finalText = '';
  r.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) { finalText += t; onFinal?.(t.trim(), finalText.trim()); } else interim += t;
    }
    onInterim?.((finalText + interim).trim());
  };
  r.onerror = (e) => onError?.(e.error);
  r.onend = () => onEnd?.(finalText.trim());
  return r;
}
