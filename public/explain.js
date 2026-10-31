// Explain board: interactive multi-beat visual stage with synced speech word boundaries and method choices.
import { esc, rich } from './fx.js';
import { renderVisual } from './visual.js';
import { lessonCopy } from './i18n.js';
import { tier, reduced } from './motion.js';

export class ExplainBoard {
  constructor(host, actions) {
    this.host = host;
    this.actions = actions;
    this.reply = null;
  }

  clear() {
    this.reply = null;
    this.host.hidden = true;
    this.host.replaceChildren();
  }

  show(reply, replay) {
    this.reply = reply;
    this.replay = replay;
    this.index = -1;
    this.beats = reply.beats?.length ? reply.beats : [{ screen: reply.screen, speak: reply.speak, visual: { type: 'none' } }];
    let words = 0;
    this.starts = this.beats.map((b) => {
      const start = words;
      const len = String(b.speak || '').split(/\s+/).filter(Boolean).length;
      words += len;
      return start;
    });
    this.counts = this.beats.map((b) => Math.max(1, String(b.speak || '').split(/\s+/).filter(Boolean).length));
    this.copy = lessonCopy(reply.language);
    this.host.hidden = false;
    this.host.lang = reply.language;
    this.host.innerHTML = `<header class="explain-head">
      <div><span class="lesson-eyebrow">CHRISTINA · INTERACTIVE EXPLAIN BOARD</span><h2>${esc(this.copy.board)}</h2></div>
      <div class="explain-actions">
        <button type="button" class="chip basics-btn" aria-label="${esc(this.copy.basics)}">✦ <span>${esc(this.copy.basics)}</span></button>
        <button type="button" class="chip replay" aria-label="Replay explanation">↻ <span>${esc(this.actions.ui('again'))}</span></button>
      </div>
    </header>
    <div class="beat-progress" role="tablist" aria-label="Explanation steps"></div>
    <div class="beat-content"></div>
    <div class="beat-nav">
      <button type="button" class="chip previous" aria-label="Previous explanation step">←</button>
      <span class="beat-count" aria-live="polite"></span>
      <button type="button" class="chip next" aria-label="Next explanation step">→</button>
    </div>
    <section class="your-turn" hidden></section>`;

    this.host.querySelector('.replay').onclick = () => this.replay?.();
    this.host.querySelector('.basics-btn').onclick = () => this.actions.basics?.();
    this.host.querySelector('.previous').onclick = () => { this.actions.stop(); this.go(this.index - 1); };
    this.host.querySelector('.next').onclick = () => { this.actions.stop(); this.go(this.index + 1); };

    const prog = this.host.querySelector('.beat-progress');
    this.beats.forEach((b, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'beat-dot';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-label', `Step ${i + 1}`);
      button.innerHTML = `<span class="bd-num">0${i + 1}</span><span class="bd-bar"></span>`;
      button.onclick = () => { this.actions.stop(); this.go(i); };
      prog.appendChild(button);
    });
    this.go(0);
  }

  go(index) {
    const i = Math.max(0, Math.min(this.beats.length - 1, index));
    if (this.index === i) return;
    this.index = i;
    const beat = this.beats[i];
    const content = this.host.querySelector('.beat-content');
    const lite = tier() === 'lite';
    const diagram = renderVisual(beat.visual);
    const display = lite ? this.beats.map((b) => b.screen).join('\n\n') : beat.screen;
    const showSub = ['english', 'bilingual'].includes(this.reply.mix);

    content.innerHTML = `${diagram ? `<figure class="visual stage-visual" lang="${esc(this.reply.language)}">${diagram}${beat.visual?.caption ? `<figcaption>${esc(beat.visual.caption)}</figcaption>` : ''}</figure>` : ''}<div class="beat-copy"><div class="beat-step-badge">STEP 0${i + 1} / 0${this.beats.length}</div><div class="beat-text" lang="${this.reply.mix === 'english' ? 'en' : esc(this.reply.language)}">${rich(display)}</div>${showSub ? `<div class="spoken-subtitle" lang="${esc(this.reply.language)}"><span class="sub-tag">🔊</span> ${rich(beat.speak)}</div>` : ''}</div>`;

    const svg = content.querySelector('svg');
    if (svg) svg.setAttribute('aria-label', beat.visual?.caption || this.copy.board);
    if (!reduced() && !lite) {
      content.animate([{ opacity: 0, transform: 'translateY(10px) scale(.99)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }
    this.host.querySelector('.previous').disabled = i === 0;
    this.host.querySelector('.next').disabled = i === this.beats.length - 1;
    this.host.querySelector('.beat-count').textContent = `${i + 1} / ${this.beats.length}`;
    this.host.querySelectorAll('.beat-dot').forEach((b, k) => {
      b.setAttribute('aria-current', String(k === i));
      b.classList.toggle('done', k < i);
    });

    const turn = this.host.querySelector('.your-turn');
    turn.hidden = i !== this.beats.length - 1;
    turn.replaceChildren();
    if (turn.hidden) return;

    const heading = document.createElement('h3');
    heading.textContent = this.reply.question ? this.copy.turn : this.copy.next;
    turn.appendChild(heading);

    if (this.reply.question) {
      const q = document.createElement('p');
      q.lang = this.reply.mix === 'english' ? 'en' : this.reply.language;
      q.innerHTML = rich(this.reply.question);
      turn.appendChild(q);
    }

    if ((this.reply.choices || []).length && this.reply.question) {
      const choiceRow = document.createElement('div');
      choiceRow.className = 'turn-choices';
      for (const choice of this.reply.choices) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip choice-pill';
        b.textContent = choice;
        b.onclick = () => this.actions.answer(choice);
        choiceRow.appendChild(b);
      }
      turn.appendChild(choiceRow);
    }

    const controls = document.createElement('div');
    controls.className = 'turn-controls';
    turn.appendChild(controls);
    const add = (text, fn, cls = 'chip') => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.textContent = text;
      b.onclick = fn;
      controls.appendChild(b);
    };
    if (this.reply.question) {
      add(`⌨ ${this.actions.ui('ask')}`, () => this.actions.type());
      add(`🎤 ${this.actions.ui('call')}`, () => this.actions.mic());
      add(`✎ ${this.actions.ui('pad')}`, () => this.actions.pad());
    } else {
      add(`✦ ${this.copy.next}`, () => this.actions.answer('Continue teaching this concept with another concrete example and visual diagram. Do not ask a question yet.'), 'chip choice-pill');
      add(`✎ ${this.actions.ui('pad')}`, () => this.actions.pad());
    }
  }

  word(i, reply) {
    if (this.reply !== reply || tier() === 'lite') return;
    let beat = 0;
    this.starts.forEach((start, n) => { if (i >= start) beat = n; });
    this.go(beat);
    this.host.querySelectorAll('.kw').forEach((el) => el.classList.remove('kw'));
    const localIdx = Math.max(0, i - this.starts[beat]);
    const subWords = this.host.querySelectorAll('.spoken-subtitle .w');
    if (subWords.length) {
      subWords[Math.min(subWords.length - 1, localIdx)]?.classList.add('kw');
      return;
    }
    const beatWords = this.host.querySelectorAll('.beat-text .w');
    if (beatWords.length) {
      const ratio = localIdx / Math.max(1, this.counts[beat]);
      const target = Math.min(beatWords.length - 1, Math.floor(ratio * beatWords.length));
      beatWords[target]?.classList.add('kw');
    }
  }
}
