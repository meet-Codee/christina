// aurora.js: the GPU aurora behind everything. setMood(state), follow(source with .energy), setQuality(tier).

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAG = `
precision mediump float;
uniform vec2 uRes, uP; uniform float uT, uE, uFade; uniform vec3 uA, uB, uC;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.02+vec2(3.1,1.7);a*=.5;}return s;}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec2 p=uv; p.x*=uRes.x/uRes.y; p+=uP*.025;
  float t=uT*.042;
  float f=fbm(vec2(p.x*1.1+t,p.y*.8-t*.6));
  float r1=smoothstep(.46,0.,abs(uv.y-.74-.15*sin(p.x*2.0+t*5.5+f*3.1)));
  float r2=smoothstep(.42,0.,abs(uv.y-.26-.13*sin(p.x*1.6-t*4.8+f*2.6)));
  float r3=smoothstep(.56,0.,abs(uv.x-.5-.28*sin(uv.y*2.8+t*3.2+f*2.2)))*.58;
  float r4=smoothstep(.48,0.,abs((uv.x*.65+uv.y*.65)-.68-.14*cos(p.x*1.8-t*3.6+f*2.4)))*.46;
  vec3 col=uA*r1*(.58+.48*f)+uB*r2*(.55+.50*f)+uC*(r3+r4)*(.55+.45*f);
  col*=.38+.24*uE;
  float v=smoothstep(1.42,.12,length((uv-.5)*vec2(1.12,1.32)));
  vec3 base=mix(vec3(.110,.045,.282),mix(vec3(.168,.058,.368),vec3(.028,.182,.286),uv.x),1.-uv.y*.55);
  col=col*v*uFade+base;
  gl_FragColor=vec4(col,1.);
}`;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const MOODS = {
  idle: ['#FF2E93', '#00B4D8', '#FFC93C'],
  speaking: ['#00B4D8', '#4CC9F0', '#7B2FF7'],
  listening: ['#FF9933', '#FF2E93', '#FFC93C'],
  thinking: ['#7B2FF7', '#FF2E93', '#4CC9F0'],
  teach: ['#FFC93C', '#2EE59D', '#00B4D8'],
  celebrate: ['#2EE59D', '#FFC93C', '#FF2E93'],
  encourage: ['#FF2E93', '#FFC93C', '#7B2FF7'],
  offline: ['#3A0CA3', '#2a1860', '#007796'],
};

export class Aurora {
  constructor(canvas) {
    this.canvas = canvas;
    this._loop = this._loop.bind(this);
    this.cur = MOODS.idle.map(hex);
    this.target = MOODS.idle.map(hex);
    this.energy = 0;
    this.source = null;
    this.pointer = [0, 0];
    this.pointerTarget = [0, 0];
    this.quality = 'full';
    this.fade = 0;
    this.fadeTarget = 1;
    this.paused = false;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.t0 = performance.now();
    this.last = 0;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl || !this._init(gl)) { canvas.classList.add('aurora-fallback'); this.gl = null; return; }
    this._resize = this._resize.bind(this);
    addEventListener('resize', this._resize);
    this._resize();
    addEventListener('pointermove', (e) => {
      this.pointerTarget = [(e.clientX / innerWidth - 0.5) * 2, -(e.clientY / innerHeight - 0.5) * 2];
    }, { passive: true });
    document.addEventListener('visibilitychange', () => this._kick());
    this._kick();
  }

  _init(gl) {
    try {
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.u = {};
      for (const k of ['uRes', 'uP', 'uT', 'uE', 'uFade', 'uA', 'uB', 'uC']) this.u[k] = gl.getUniformLocation(prog, k);
      this.gl = gl;
      this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.gl = null; this.canvas.classList.add('aurora-fallback'); });
      return true;
    } catch (e) {
      console.warn('[aurora] WebGL unavailable, using a gradient.', e?.message);
      return false;
    }
  }

  _resize() {
    const scale = this.quality === 'full' ? 0.5 : 0.33; // soft by nature, so render small and let CSS stretch it
    this.canvas.width = Math.max(2, Math.round(innerWidth * scale));
    this.canvas.height = Math.max(2, Math.round(innerHeight * scale));
    this.needFrame = true;
    this._kick();
  }

  setQuality(q) {
    this.quality = q;
    this.canvas.classList.toggle('aurora-static', q === 'lite');
    this._resize();
  }

  setMood(state) { this.target = (MOODS[state] || MOODS.idle).map(hex); this.needFrame = true; this._kick(); }
  follow(source) { this.source = source; }
  fadeIn() { this.fade = 0; this.fadeTarget = 1; this.fadeStart = performance.now(); this.needFrame = true; this._kick(); }
  set pausedState(v) { this.paused = v; this._kick(); }

  _kick() { if (!this.raf && this.gl && !document.hidden && !this.paused) this.raf = requestAnimationFrame(this._loop); }

  _loop(now) {
    this.raf = 0;
    if (!this.gl || document.hidden || this.paused) return;
    const fps = this.quality === 'full' ? 60 : this.quality === 'medium' ? 20 : 0;
    const still = this.reduced || fps === 0;
    if (!still && now - this.last < 1000 / fps - 2) { this.raf = requestAnimationFrame(this._loop); return; }
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000);
    this.last = now;
    const k = still ? 1 : 1 - Math.exp(-dt * 1.5);
    let moving = false;
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const d = this.target[j][i] - this.cur[j][i];
      if (Math.abs(d) > 0.002) moving = true;
      this.cur[j][i] += d * k;
    }
    const e = this.source ? this.source.energy || 0 : 0;
    this.energy += (e - this.energy) * 0.1;
    if (!this.reduced) for (let i = 0; i < 2; i++) this.pointer[i] += (this.pointerTarget[i] - this.pointer[i]) * 0.03;
    if (this.fadeStart) { this.fade = Math.min(1, (now - this.fadeStart) / 600); if (this.fade >= 1) this.fadeStart = 0; } else this.fade = this.fadeTarget;

    const { gl, u } = this;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.uP, this.pointer[0], this.pointer[1]);
    gl.uniform1f(u.uT, still ? 40 : (now - this.t0) / 1000);
    gl.uniform1f(u.uE, this.energy);
    gl.uniform1f(u.uFade, this.fade);
    gl.uniform3fv(u.uA, this.cur[0]);
    gl.uniform3fv(u.uB, this.cur[1]);
    gl.uniform3fv(u.uC, this.cur[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.needFrame = false;
    if (!still || moving || this.fadeStart) this.raf = requestAnimationFrame(this._loop);
  }
}
