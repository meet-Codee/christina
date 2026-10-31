// orb.js: Christina's voice. A GPU-rendered liquid orb inside a 2D kolam halo.
// new Orb(hostEl) → setState(state), attach(analyser), energy, paused, intro(), pulse()

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uT, uE, uSwirl, uIntro, uDim, uPulse;
uniform vec3 uA, uB, uC; uniform vec2 uL;
float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/(.5*min(uRes.x,uRes.y));
  float r=length(uv), ang=atan(uv.y,uv.x);
  float wob=uE*(.045*sin(ang*5.+uT*5.)+.03*sin(ang*9.-uT*7.3)+.018*sin(ang*13.+uT*9.))+.012*sin(ang*3.+uT*.9)+.008*sin(ang*2.-uT*.6);
  float R=.64*(.6+.4*uIntro)+wob+.035*uPulse;
  float d=r-R;
  float g=exp(-max(d,0.)*(6.5-2.5*uE))*(.26+.5*uE)*uIntro*(1.-smoothstep(.8,.99,r));
  vec3 glowCol=mix(uB,uA,.5+.5*sin(ang*2.+uT*.7));
  vec3 col=glowCol*g; float alpha=g;
  if(d<.02){
    float rr=min(r/R,.999);
    vec3 nrm=normalize(vec3(uv/R,sqrt(1.-rr*rr)));
    float t=uT*.12*uSwirl;
    vec3 q=nrm; float ca=cos(t), sa=sin(t); q.xz=mat2(ca,-sa,sa,ca)*q.xz;
    float f1=fbm(q*2.2+vec3(0.,0.,t*1.3));
    float f2=fbm(q*3.1+f1*1.8+vec3(t*.7,-t*.4,0.));
    vec3 c=mix(uA,uB,smoothstep(.25,.75,f2));
    c=mix(c,uC,smoothstep(.55,.85,f1*f2*1.9));
    vec3 Ld=normalize(vec3(uL,.9));
    float diff=clamp(dot(nrm,Ld),0.,1.);
    float spec=pow(clamp(dot(reflect(-Ld,nrm),vec3(0.,0.,1.)),0.,1.),28.);
    float fres=pow(1.-nrm.z,2.2);
    c=c*(.36+.8*diff)+fres*mix(uB,uA,.4)*.85+spec*.85;
    c+=uA*.45*uE*pow(1.-rr,1.5);
    c+=.07*sin(f2*18.+uT*2.*uSwirl)*uA*(1.-rr);
    float a=smoothstep(.012,-.006,d)*uIntro;
    col=mix(col,c,a); alpha=max(alpha,a);
  }
  float lum=dot(col,vec3(.3,.59,.11));
  col=mix(col,vec3(lum)*.55,uDim); alpha*=1.-.3*uDim;
  alpha=clamp(alpha,0.,1.);
  gl_FragColor=vec4(min(col,vec3(alpha)),alpha);
}`;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
export const MOODS = {
  idle: { a: '#3be8ff', b: '#8b6cff', c: '#ff4fd8', swirl: 1, halo: '#8b6cff' },
  speaking: { a: '#3be8ff', b: '#7d8bff', c: '#e8fbff', swirl: 1.5, halo: '#3be8ff' },
  listening: { a: '#ffb547', b: '#ff4fd8', c: '#ff7a45', swirl: 1.7, halo: '#ffb547' },
  thinking: { a: '#8b6cff', b: '#3be8ff', c: '#ff4fd8', swirl: 3.4, halo: '#8b6cff' },
  teach: { a: '#ffb547', b: '#3dffb5', c: '#3be8ff', swirl: 1.2, halo: '#ffb547' },
  celebrate: { a: '#3dffb5', b: '#ffe27a', c: '#3be8ff', swirl: 2.2, halo: '#3dffb5' },
  encourage: { a: '#ff9ec7', b: '#c9a7ff', c: '#ffd1e3', swirl: 0.55, halo: '#ff9ec7' },
  offline: { a: '#9a98b0', b: '#5d5b74', c: '#c8c6da', swirl: 0.3, halo: '#6d6b84' },
};

export class Orb {
  constructor(host, { onFallback } = {}) {
    this.host = host;
    this._loop = this._loop.bind(this);
    this.state = 'idle';
    this._energy = 0;
    this.manualEnergy = null;
    this.analyser = null;
    this.buf = null;
    this.paused = false;
    this.visible = true;
    this.quality = 'full';
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.introT = 1;
    this.pulseT = 0;
    this.light = [-0.55, 0.6];
    this.lightTarget = [-0.55, 0.6];
    this.cur = this._palette('idle');
    this.target = this._palette('idle');
    this.kolamProgress = 1;
    this.particles = [];
    this.t0 = performance.now();
    this.lastFrame = 0;

    this.halo = document.createElement('canvas');
    this.halo.className = 'orb-halo';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'orb-gl';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.halo.setAttribute('aria-hidden', 'true');
    host.append(this.halo, this.canvas);
    this.hctx = this.halo.getContext('2d');

    const gl = this.canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl || !this._initGL(gl)) {
      this.gl = null;
      host.classList.add('orb-fallback');
      onFallback?.();
    }

    this._resize = this._resize.bind(this);
    new ResizeObserver(this._resize).observe(host);
    this._resize();
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this._kick(); }).observe(host);
    document.addEventListener('visibilitychange', () => this._kick());
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => { this.reduced = e.matches; this._kick(); });
    addEventListener('pointermove', (e) => {
      const r = this.host.getBoundingClientRect();
      if (!r.width) return;
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(innerWidth, 1);
      const dy = (e.clientY - (r.top + r.height / 2)) / Math.max(innerHeight, 1);
      this.lightTarget = [Math.max(-1, Math.min(1, dx * 2.2)), Math.max(-1, Math.min(1, -dy * 2.2))];
    }, { passive: true });
    this._kick();
  }

  _palette(state) {
    const m = MOODS[state] || MOODS.idle;
    return { a: hex(m.a), b: hex(m.b), c: hex(m.c), swirl: m.swirl, halo: hex(m.halo), dim: state === 'offline' ? 1 : 0 };
  }

  _initGL(gl) {
    try {
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed');
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.u = {};
      for (const k of ['uRes', 'uT', 'uE', 'uSwirl', 'uIntro', 'uDim', 'uPulse', 'uA', 'uB', 'uC', 'uL']) this.u[k] = gl.getUniformLocation(prog, k);
      gl.clearColor(0, 0, 0, 0);
      this.gl = gl;
      this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.gl = null; this.host.classList.add('orb-fallback'); });
      return true;
    } catch (e) {
      console.warn('[orb] WebGL unavailable, using the CSS orb.', e?.message);
      return false;
    }
  }

  _resize() {
    const r = this.host.getBoundingClientRect();
    if (!r.width) return;
    const cap = this.quality === 'full' ? 2 : 1.25;
    let dpr = Math.min(cap, devicePixelRatio || 1);
    let w = r.width * dpr;
    const maxPx = this.quality === 'full' ? 1400 : 600;
    if (w > maxPx) { dpr *= maxPx / w; w = maxPx; }
    this.canvas.width = Math.round(w);
    this.canvas.height = Math.round(r.height * dpr);
    const hd = Math.min(2, devicePixelRatio || 1);
    this.halo.width = Math.round(r.width * 1.7 * hd);
    this.halo.height = Math.round(r.height * 1.7 * hd);
    this.hdpr = hd;
    this._kick(true);
  }

  setQuality(q) { this.quality = q; this._resize(); }

  setState(state) {
    if (!MOODS[state]) state = 'idle';
    if (state === this.state) return;
    this.state = state;
    this.target = this._palette(state);
    this.kolamProgress = 0; // the kolam redraws its line on every state change
    if (state !== 'speaking' && state !== 'listening') this.manualEnergy = null;
    this._kick(true);
  }

  attach(analyser) { this.analyser = analyser; this.buf = analyser ? new Float32Array(analyser.fftSize) : null; this._kick(); }
  detach(analyser) { if (!analyser || this.analyser === analyser) { this.analyser = null; this.buf = null; } }

  get energy() { return this._energy; }
  set energy(v) { this.manualEnergy = v == null ? null : Math.max(0, Math.min(1, v)); this._kick(); }

  set paused(v) { this._paused = v; this._kick(); }
  get paused() { return this._paused; }

  // Page load: 120 particles converge and the orb materialises.
  intro() {
    if (this.reduced) { this.introT = 1; this._kick(true); return; }
    this.introT = 0;
    this.introStart = performance.now();
    const w = this.halo.width; const h = this.halo.height;
    this.particles = Array.from({ length: 120 }, () => {
      const a = Math.random() * Math.PI * 2;
      const d = (0.55 + Math.random() * 0.6) * Math.max(w, h);
      return { a, d, s: 0.6 + Math.random() * 1.8, delay: Math.random() * 280, c: Math.random() };
    });
    this._kick(true);
  }

  pulse() { this.pulseT = 1; this._kick(); }

  _kick(force) {
    if (force) this.needFrame = true;
    if (!this.raf && !this._paused && !document.hidden && this.visible) this.raf = requestAnimationFrame(this._loop);
  }

  _level() {
    if (this.analyser && this.buf) {
      this.analyser.getFloatTimeDomainData(this.buf);
      let s = 0;
      for (let i = 0; i < this.buf.length; i += 2) s += this.buf[i] * this.buf[i];
      const rms = Math.sqrt(s / (this.buf.length / 2));
      return Math.max(0, Math.min(1, (rms - 0.008) * 7));
    }
    if (this.manualEnergy != null) return this.manualEnergy;
    return 0;
  }

  _loop(now) {
    this.raf = 0;
    if (this._paused || document.hidden || !this.visible) return;
    const fpsCap = this.quality === 'lite' ? 30 : 60;
    const live = !this.reduced || this.needFrame;
    if (now - this.lastFrame < 1000 / fpsCap - 2 && !this.needFrame) { this.raf = requestAnimationFrame(this._loop); return; }
    const dt = Math.min(0.05, (now - (this.lastFrame || now)) / 1000);
    this.lastFrame = now;
    this.needFrame = false;

    // Ease towards the target palette, energy and light.
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 4);
    for (const key of ['a', 'b', 'c', 'halo']) for (let i = 0; i < 3; i++) this.cur[key][i] += (this.target[key][i] - this.cur[key][i]) * k;
    this.cur.swirl += (this.target.swirl - this.cur.swirl) * k;
    this.cur.dim += (this.target.dim - this.cur.dim) * k;
    const lvl = this.reduced ? 0 : this._level();
    this._energy += (lvl - this._energy) * (lvl > this._energy ? 0.5 : 0.12);
    for (let i = 0; i < 2; i++) this.light[i] += (this.lightTarget[i] - this.light[i]) * (this.reduced ? 1 : 0.06);
    if (this.introT < 1) this.introT = Math.min(1, (now - this.introStart - 250) / 900);
    if (this.introT < 0) this.introT = 0;
    if (this.pulseT > 0) this.pulseT = Math.max(0, this.pulseT - dt * 2.4);
    if (this.kolamProgress < 1) this.kolamProgress = this.reduced ? 1 : Math.min(1, this.kolamProgress + dt / 1.3);

    const t = (now - this.t0) / 1000;
    this._drawGL(t);
    this._drawHalo(t, now);

    const settling = Math.abs(this.cur.swirl - this.target.swirl) > 0.01 || this.introT < 1 || this.kolamProgress < 1 || this.pulseT > 0;
    if (live && (!this.reduced || settling)) this.raf = requestAnimationFrame(this._loop);
  }

  _drawGL(t) {
    const gl = this.gl;
    if (!gl) return;
    const { u, cur } = this;
    const intro = this.introT < 1 ? 1 - (1 - Math.max(0, this.introT)) ** 3 : 1;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uT, this.reduced ? 7.0 : t);
    gl.uniform1f(u.uE, this._energy);
    gl.uniform1f(u.uSwirl, cur.swirl);
    gl.uniform1f(u.uIntro, intro);
    gl.uniform1f(u.uDim, cur.dim);
    gl.uniform1f(u.uPulse, Math.sin(this.pulseT * Math.PI));
    gl.uniform3fv(u.uA, cur.a);
    gl.uniform3fv(u.uB, cur.b);
    gl.uniform3fv(u.uC, cur.c);
    gl.uniform2f(u.uL, this.light[0], this.light[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // The kolam: two interlaced loops woven around a ring of pulli dots.
  _drawHalo(t, now) {
    const c = this.hctx;
    const W = this.halo.width; const H = this.halo.height;
    c.clearRect(0, 0, W, H);
    const cx = W / 2; const cy = H / 2;
    const base = Math.min(W, H) / 1.7 / 2; // orb radius in halo pixels (halo is 1.7× the host)
    const R0 = base * 1.2; const A = base * 0.11;
    const petals = 8;
    const rot = this.reduced ? 0 : t * (this.state === 'thinking' ? 0.22 : 0.035);
    const [r, g, b] = this.cur.halo.map((v) => Math.round(v * 255));
    const intro = this.introT < 1 ? Math.max(0, this.introT) : 1;
    const e = this._energy;

    // Pulli dots
    for (let i = 0; i < petals * 2; i++) {
      const ang = rot + (i / (petals * 2)) * Math.PI * 2 + Math.PI / (petals * 2);
      const rad = R0 + (i % 2 ? -1 : 1) * A * 0.0;
      const tw = this.reduced ? 0.7 : 0.55 + 0.45 * Math.sin(t * 2 + i * 1.7);
      c.fillStyle = `rgba(${r},${g},${b},${(0.25 + 0.5 * tw + 0.3 * e) * intro})`;
      c.beginPath();
      c.arc(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, (1.3 + e * 1.2) * this.hdpr, 0, Math.PI * 2);
      c.fill();
    }
    // Outer ring of dots
    for (let i = 0; i < petals; i++) {
      const ang = rot * 0.5 + (i / petals) * Math.PI * 2;
      c.fillStyle = `rgba(${r},${g},${b},${0.18 * intro})`;
      c.beginPath();
      c.arc(cx + Math.cos(ang) * R0 * 1.22, cy + Math.sin(ang) * R0 * 1.22, 1.1 * this.hdpr, 0, Math.PI * 2);
      c.fill();
    }
    // Two interlaced loops, drawn progressively after a state change
    const p = this.kolamProgress;
    const steps = 360;
    c.lineWidth = 1.2 * this.hdpr;
    c.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      c.strokeStyle = `rgba(${r},${g},${b},${(0.35 + 0.35 * e) * intro})`;
      c.beginPath();
      const n = Math.max(2, Math.floor(steps * p));
      for (let i = 0; i <= n; i++) {
        const th = (i / steps) * Math.PI * 2;
        const rr = R0 + A * Math.sin(petals * th + k * Math.PI) * (1 + 0.25 * e * Math.sin(t * 6 + th * 3));
        const x = cx + Math.cos(th + rot) * rr;
        const y = cy + Math.sin(th + rot) * rr;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    }
    // Intro particles converging into the orb
    if (this.introT < 1 && this.particles.length) {
      const el = now - this.introStart;
      for (const q of this.particles) {
        const tt = Math.max(0, Math.min(1, (el - q.delay) / 800));
        const ease = 1 - (1 - tt) ** 3;
        const d = q.d * (1 - ease) + base * 0.3 * ease;
        const x = cx + Math.cos(q.a + ease * 0.8) * d;
        const y = cy + Math.sin(q.a + ease * 0.8) * d;
        const col = q.c < 0.5 ? '59,232,255' : q.c < 0.8 ? '139,108,255' : '255,79,216';
        c.fillStyle = `rgba(${col},${(tt < 1 ? 0.9 : 0) * (0.4 + 0.6 * tt)})`;
        c.beginPath();
        c.arc(x, y, q.s * this.hdpr, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
}
