// voice.js: Christina's voice out.
// F1 sentence pipeline: split → fetch sentence 1 alone and the rest in parallel → play gaplessly on the AudioContext timeline.
// Every sentence is cached in Cache Storage, so "Listen again" costs no network. Falls back to the device voice.
import { splitAksharas } from './motion.js';

const CACHE = 'christina-voice-v1';

export function sentences(text, lang) {
  const src = String(text || '').replace(/\s+/g, ' ').trim();
  if (!src) return [];
  let out = [];
  try {
    for (const { segment } of new Intl.Segmenter(lang, { granularity: 'sentence' }).segment(src)) { const s = segment.trim(); if (s) out.push(s); }
  } catch { out = src.split(/(?<=[.?!।॥])\s+/).map((s) => s.trim()).filter(Boolean); }
  // Danda and double danda are always sentence ends, even where the segmenter disagrees.
  out = out.flatMap((s) => s.split(/(?<=[।॥])\s+/)).filter(Boolean);
  // Very long sentences split at commas so the first one arrives fast.
  out = out.flatMap((s) => {
    if (s.length <= 260) return [s];
    const parts = []; let cur = '';
    for (const piece of s.split(/(?<=[,;:،])\s+/)) { if ((cur + ' ' + piece).length > 220 && cur) { parts.push(cur); cur = piece; } else cur = cur ? `${cur} ${piece}` : piece; }
    if (cur) parts.push(cur);
    return parts;
  });
  // Tiny fragments ride along with their neighbour; never more than 8 sentences.
  const merged = [];
  for (const s of out) {
    if (merged.length && (s.length < 14 || merged[merged.length - 1].length < 14) && (merged[merged.length - 1].length + s.length) < 200) merged[merged.length - 1] += ` ${s}`;
    else merged.push(s);
  }
  while (merged.length > 8) { const last = merged.pop(); merged[merged.length - 1] += ` ${last}`; }
  return merged;
}

export const wordsOf = (s) => String(s).split(/\s+/).filter(Boolean);

function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + s.length.toString(36);
}

const b64ToBytes = (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

export class Voice {
  constructor({ api, prefs, config, orb, onSpeaking, onDeviceFallback }) {
    this.api = api;
    this.prefs = prefs; // () => prefs
    this.config = config; // () => server config
    this.orb = orb;
    this.onSpeaking = onSpeaking || (() => {});
    this.onDeviceFallback = onDeviceFallback || (() => {});
    this.gen = 0;
    this.sources = [];
    this.ctx = null;
    this.speaking = false;
    this.premiumBroken = 0; // timestamp of the last total failure, so we don't hammer a dead voice service
    const unlock = () => { this.context(); removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock); };
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);
  }

  context() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.gain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.gain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  cacheKey(sentence, lang) {
    const p = this.prefs();
    const provider = (this.config()?.voice || 'none').replace(/\W+/g, '-');
    return `/__voice/${provider}/${lang}/${p.voice}/${this.pace()}/${hash(sentence)}.wav`;
  }

  pace() {
    const p = this.prefs();
    const gradeMul = (p.grade && p.grade <= 8 && (!p.pace || p.pace === 1)) ? 0.93 : 1;
    return Math.round((p.pace || 1) * gradeMul * (p.encourage ? 0.9 : 1) * 100) / 100;
  }

  async fromCache(sentence, lang) {
    try {
      const c = await caches.open(CACHE);
      const r = await c.match(this.cacheKey(sentence, lang));
      return r ? await r.arrayBuffer() : null;
    } catch { return null; }
  }

  async toCache(sentence, lang, bytes) {
    try { const c = await caches.open(CACHE); await c.put(this.cacheKey(sentence, lang), new Response(bytes, { headers: { 'content-type': 'audio/wav' } })); } catch { /* storage full or unavailable */ }
  }

  async decode(arrayBuffer) {
    const ctx = this.context();
    if (!ctx) return null;
    try { return await ctx.decodeAudioData(arrayBuffer.slice(0)); } catch { return null; }
  }

  // Returns an array of promises, one AudioBuffer (or null) per sentence, fetched as fast as possible.
  synth(ss, lang) {
    const out = ss.map(() => null);
    const misses = [];
    const tSynth0 = performance.now();
    const sentStats = ss.map((s, i) => ({ index: i, text: s, ms: 0, by: 'cache', cached: true }));
    window.__lastVoiceTimings = sentStats;
    const looked = ss.map((s, i) => this.fromCache(s, lang).then((ab) => {
      if (ab) { sentStats[i].ms = Math.round(performance.now() - tSynth0); return ab; }
      sentStats[i].cached = false;
      misses.push(i);
      return null;
    }));
    const settle = Promise.all(looked).then(async (cached) => {
      misses.sort((a, b) => a - b);
      const groups = [];
      if (misses.length) groups.push(misses.slice(0, 1));
      for (let i = 1; i < misses.length; i += 3) groups.push(misses.slice(i, i + 3));
      const fetched = new Map();
      const fetchGroup = async (idxs, attempt = 0) => {
        const p = this.prefs();
        const tG0 = performance.now();
        const res = await this.api('speak', { sentences: idxs.map((i) => ss[i]), language: lang, voice: p.voice, pace: this.pace() }, { quiet: true });
        const groupMs = Math.round(performance.now() - tG0);
        const retry = [];
        res.audios.forEach((a, k) => {
          const i = idxs[k];
          sentStats[i].ms = a.ms || groupMs;
          sentStats[i].roundTripMs = groupMs;
          sentStats[i].by = a.by || 'unknown';
          if (a.audio) { const bytes = b64ToBytes(a.audio); fetched.set(i, bytes.buffer); this.toCache(ss[i], lang, bytes); } else if (a.deferred && attempt < 2) retry.push(i);
          else fetched.set(i, null);
        });
        if (retry.length) await fetchGroup(retry, attempt + 1);
      };
      const promises = groups.map((g) => fetchGroup(g).catch((e) => { g.forEach((i) => fetched.set(i, null)); throw e; }));
      return { cached, promises, fetched };
    });
    return ss.map((_, i) => settle.then(async ({ cached, promises, fetched }) => {
      if (cached[i]) return this.decode(cached[i]);
      const gi = misses.indexOf(i);
      const group = gi === 0 ? 0 : Math.floor((gi - 1) / 3) + 1;
      try { await promises[group]; } catch (e) { if (gi === 0 || i === 0) throw e; return null; }
      const ab = fetched.get(i);
      return ab ? this.decode(ab) : null;
    }));
  }

  // Speak text. opts: { lang, onWord(globalWordIndex), onEnd, onStart }
  async say(text, opts = {}) {
    this.stop();
    const gen = ++this.gen;
    const userWord = opts.onWord;
    opts = { ...opts, onWord: (i) => { userWord?.(i); dispatchEvent(new CustomEvent('christina:word', { detail: { i, gen } })); } };
    dispatchEvent(new CustomEvent('christina:say', { detail: { text, gen } }));
    const p = this.prefs();
    const lang = opts.lang || p.lang;
    const ss = sentences(text, lang);
    if (!ss.length || p.muted) { opts.onEnd?.(); return; }
    const useDevice = p.freeVoice || !this.config()?.voice || (Date.now() - this.premiumBroken < 60_000);
    if (useDevice) return this.device(ss, lang, opts, gen);

    const ctx = this.context();
    if (!ctx) return this.device(ss, lang, opts, gen);
    const bufs = this.synth(ss, lang);
    const wordBase = []; let wc = 0;
    for (const s of ss) { wordBase.push(wc); wc += wordsOf(s).length; }
    const timeline = [];
    let next = 0;
    let started = false;
    this.speaking = true;
    this.onSpeaking(true);
    this.orb?.attach(this.analyser);
    this._karaoke(gen, timeline, ss, wordBase, opts.onWord, lang);
    try {
      for (let i = 0; i < ss.length; i++) {
        let buf;
        try { buf = await bufs[i]; } catch (e) {
          if (gen !== this.gen) return;
          if (i === 0) { // the premium voice is unavailable: speak with the device voice instead
            this.premiumBroken = Date.now();
            this.onDeviceFallback(e);
            this._finishPremium(gen);
            return this.device(ss, lang, opts, gen);
          }
          buf = null;
        }
        if (gen !== this.gen) return;
        if (!buf) { // one sentence failed: say just that one with the device voice
          await new Promise((r) => { const tail = Math.max(0, next - ctx.currentTime); setTimeout(r, tail * 1000); });
          if (gen !== this.gen) return;
          await this.device([ss[i]], lang, { onWord: (w) => opts.onWord?.(wordBase[i] + w), keepSpeaking: true }, gen);
          next = ctx.currentTime;
          continue;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.gain);
        const at = Math.max(ctx.currentTime + 0.02, next);
        src.start(at);
        if (!started) { started = true; opts.onStart?.(); }
        this.sources.push(src);
        timeline.push({ i, start: at, dur: buf.duration });
        next = at + buf.duration + 0.04; // tight natural pause (< 50 ms added to WAV tail), never > 300 ms
      }
      // Wait for the last one to finish.
      await new Promise((resolve) => {
        const check = () => { if (gen !== this.gen) return resolve(); if (ctx.currentTime >= next - 0.06) return resolve(); setTimeout(check, 60); };
        check();
      });
      if (gen !== this.gen) return;
      this._finishPremium(gen);
      opts.onEnd?.();
    } catch (e) {
      if (gen === this.gen) { this._finishPremium(gen); opts.onEnd?.(); }
    }
  }

  _finishPremium(gen) {
    if (gen !== this.gen) return;
    this.speaking = false;
    this.onSpeaking(false);
    this.orb?.detach(this.analyser);
    cancelAnimationFrame(this.kRaf);
  }

  // F2: spread each sentence's duration across its words, weighted by akshara count.
  _karaoke(gen, timeline, ss, wordBase, onWord, lang) {
    if (!onWord) return;
    const weights = ss.map((s) => {
      const ws = wordsOf(s).map((w) => splitAksharas(w.replace(/[^\p{L}\p{M}\p{N}]/gu, ''), lang).length + 1.4);
      const total = ws.reduce((a, b) => a + b, 0) || 1;
      let acc = 0;
      return ws.map((w) => { const start = acc / total; acc += w; return start; });
    });
    let last = -1;
    const tick = () => {
      if (gen !== this.gen) return;
      const t = this.ctx.currentTime;
      const seg = timeline.find((s) => t >= s.start && t < s.start + s.dur);
      if (seg) {
        const frac = (t - seg.start) / seg.dur;
        const starts = weights[seg.i];
        let w = 0;
        while (w + 1 < starts.length && starts[w + 1] <= frac) w++;
        const idx = wordBase[seg.i] + w;
        if (idx !== last) { last = idx; onWord(idx); }
      }
      this.kRaf = requestAnimationFrame(tick);
    };
    this.kRaf = requestAnimationFrame(tick);
  }

  // Device voice (free browser voice, or the fallback). Uses boundary events for karaoke where the browser sends them.
  device(ss, lang, opts, gen) {
    const synth = window.speechSynthesis;
    if (!synth) { opts.onEnd?.(); return Promise.resolve(); }
    const p = this.prefs();
    const voices = synth.getVoices();
    const speechLang = lang === 'od-IN' ? 'or-IN' : lang;
    const v = voices.find((x) => x.lang === speechLang) || voices.find((x) => x.lang?.startsWith(speechLang.slice(0, 2))) || null;
    this.speaking = true;
    if (!opts.keepSpeaking) this.onSpeaking(true);
    let t0 = performance.now();
    const fake = setInterval(() => { if (this.orb) this.orb.energy = 0.35 + 0.3 * Math.abs(Math.sin((performance.now() - t0) / 90)); }, 50);
    let base = 0;
    return new Promise((resolve) => {
      const finish = () => {
        clearInterval(fake);
        if (this.orb) this.orb.energy = null;
        if (!opts.keepSpeaking && gen === this.gen) { this.speaking = false; this.onSpeaking(false); }
        resolve();
        if (gen === this.gen) opts.onEnd?.();
      };
      const speakOne = (i) => {
        if (gen !== this.gen) return finish();
        if (i >= ss.length) return finish();
        const u = new SpeechSynthesisUtterance(ss[i]);
        u.lang = speechLang;
        if (v) u.voice = v;
        u.rate = this.pace();
        u.pitch = p.voice === 'male' ? 0.85 : 1.05;
        const starts = []; let pos = 0;
        for (const w of ss[i].split(/(\s+)/)) { if (w && !/^\s+$/.test(w)) starts.push(pos); pos += w.length; }
        let lastW = -1;
        u.onstart = () => { t0 = performance.now(); if (i === 0) opts.onStart?.(); if (opts.onWord) opts.onWord(base); };
        u.onboundary = (e) => {
          if (!opts.onWord || e.name === 'sentence') return;
          let w = 0;
          while (w + 1 < starts.length && starts[w + 1] <= e.charIndex) w++;
          if (w !== lastW) { lastW = w; opts.onWord(base + w); }
        };
        u.onend = u.onerror = () => { base += starts.length; speakOne(i + 1); };
        synth.speak(u);
      };
      synth.cancel();
      speakOne(0);
    });
  }

  stop() {
    this.gen++;
    for (const s of this.sources) { try { s.stop(); } catch { /* already stopped */ } }
    this.sources = [];
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    cancelAnimationFrame(this.kRaf);
    if (this.speaking) { this.speaking = false; this.onSpeaking(false); }
    this.orb?.detach(this.analyser);
    if (this.orb) this.orb.energy = null;
  }

  // All sentences as AudioBuffers (for sharing the parent voice note as one file).
  async buffers(text, lang) {
    const ss = sentences(text, lang);
    const all = await Promise.all(this.synth(ss, lang).map((p) => p.catch(() => null)));
    return all.filter(Boolean);
  }
}

// Join AudioBuffers into one 16-bit mono WAV Blob.
export function buffersToWav(bufs) {
  const rate = bufs[0]?.sampleRate || 24000;
  const gap = Math.round(rate * 0.12);
  const len = bufs.reduce((n, b) => n + b.length + gap, 0);
  const pcm = new Int16Array(len);
  let o = 0;
  for (const b of bufs) {
    const ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) pcm[o++] = Math.max(-1, Math.min(1, ch[i])) * 0x7fff;
    o += gap;
  }
  const head = new DataView(new ArrayBuffer(44));
  const w = (off, s) => { for (let i = 0; i < s.length; i++) head.setUint8(off + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); head.setUint32(4, 36 + pcm.byteLength, true); w(8, 'WAVE'); w(12, 'fmt ');
  head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 1, true); head.setUint32(24, rate, true);
  head.setUint32(28, rate * 2, true); head.setUint16(32, 2, true); head.setUint16(34, 16, true); w(36, 'data'); head.setUint32(40, pcm.byteLength, true);
  return new Blob([head, pcm.buffer], { type: 'audio/wav' });
}
