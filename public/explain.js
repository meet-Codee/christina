// Explain board: trusted SVG renderers and speech-word boundaries, no timers guessing clip lengths.
import { esc, rich } from './fx.js';
import { renderVisual } from './visual.js';
import { lessonCopy } from './i18n.js';
import { tier, reduced } from './motion.js';

export class ExplainBoard {
  constructor(host, actions) { this.host = host; this.actions = actions; this.reply = null; }
  clear() { this.reply = null; this.host.hidden = true; this.host.replaceChildren(); }
  show(reply, replay) {
    this.reply = reply; this.replay = replay; this.index = -1;
    this.beats = reply.beats?.length ? reply.beats : [{ screen: reply.screen, speak: reply.speak, visual: { type: 'none' } }];
    let words = 0; this.starts = this.beats.map(b => { const start = words; words += String(b.speak).split(/\s+/).filter(Boolean).length; return start; });
    this.copy = lessonCopy(reply.language);
    this.host.hidden = false; this.host.lang = reply.language;
    this.host.innerHTML = `<header class="explain-head"><div><span class="lesson-eyebrow">CHRISTINA / LEARN BY SEEING</span><h2>${esc(this.copy.board)}</h2></div><button type="button" class="chip replay" aria-label="Replay explanation">↻ <span>${esc(this.actions.ui('again'))}</span></button></header><div class="beat-progress" aria-label="Explanation steps"></div><div class="beat-content"></div><div class="beat-nav"><button type="button" class="chip previous" aria-label="Previous explanation step">←</button><span class="beat-count" aria-live="polite"></span><button type="button" class="chip next" aria-label="Next explanation step">→</button></div><section class="your-turn" hidden></section>`;
    this.host.querySelector('.replay').onclick = () => this.replay();
    this.host.querySelector('.previous').onclick = () => { this.actions.stop(); this.go(this.index - 1); };
    this.host.querySelector('.next').onclick = () => { this.actions.stop(); this.go(this.index + 1); };
    this.beats.forEach((b, i) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'beat-dot'; button.setAttribute('aria-label', `Step ${i+1}`);
      button.onclick = () => { this.actions.stop(); this.go(i); };
      this.host.querySelector('.beat-progress').appendChild(button);
    });
    this.go(0);
  }
  go(index) {
    const i = Math.max(0, Math.min(this.beats.length - 1, index));
    if (this.index === i) return; this.index = i;
    const beat = this.beats[i]; const content = this.host.querySelector('.beat-content');
    const lite = tier() === 'lite';
    const diagram = renderVisual(beat.visual);
    const display = lite ? this.beats.map(b => b.screen).join('\n\n') : beat.screen;
    content.innerHTML = `${diagram ? `<figure class="visual stage-visual" lang="${esc(this.reply.language)}">${diagram}<figcaption>${esc(beat.visual.caption || '')}</figcaption></figure>` : ''}<div class="beat-copy"><div class="beat-text" lang="${this.reply.mix === 'english' ? 'en' : esc(this.reply.language)}">${rich(display)}</div>${['english','bilingual'].includes(this.reply.mix) ? `<div class="spoken-subtitle" lang="${esc(this.reply.language)}">${rich(beat.speak)}</div>` : ''}</div>`;
    const svg = content.querySelector('svg'); if (svg) svg.setAttribute('aria-label', beat.visual.caption || this.copy.board);
    if (!reduced() && !lite) content.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240 });
    this.host.querySelector('.previous').disabled = i === 0;
    this.host.querySelector('.next').disabled = i === this.beats.length - 1;
    this.host.querySelector('.beat-count').textContent = `${i+1} / ${this.beats.length}`;
    this.host.querySelectorAll('.beat-dot').forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
    const turn = this.host.querySelector('.your-turn'); turn.hidden = i !== this.beats.length - 1;
    turn.replaceChildren();
    if (turn.hidden) return;
    const heading = document.createElement('h3'); heading.textContent = this.reply.question ? this.copy.turn : this.copy.next; turn.appendChild(heading);
    if (this.reply.question) { const q = document.createElement('p'); q.lang = this.reply.mix === 'english' ? 'en' : this.reply.language; q.innerHTML = rich(this.reply.question); turn.appendChild(q); }
    const controls = document.createElement('div'); controls.className = 'turn-controls'; turn.appendChild(controls);
    const add = (text, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = text; b.onclick = fn; controls.appendChild(b); };
    for (const choice of this.reply.choices || []) add(choice, () => this.actions.answer(choice));
    if (this.reply.question) {
      add(this.actions.ui('ask'), () => this.actions.type());
      add(this.actions.ui('call'), () => this.actions.mic());
      add(this.actions.ui('pad'), () => this.actions.pad());
    } else add(this.copy.next, () => this.actions.answer('Continue teaching this concept with another concrete example. Do not ask a question yet.'));
  }
  word(i, reply) {
    if (this.reply !== reply || tier() === 'lite') return;
    let beat = 0; this.starts.forEach((start, n) => { if (i >= start) beat = n; });
    this.go(beat);
    this.host.querySelectorAll('.kw').forEach(el => el.classList.remove('kw'));
    const words = this.host.querySelectorAll('.spoken-subtitle .w');
    words[i - this.starts[beat]]?.classList.add('kw');
  }
}
