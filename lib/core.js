// lib/core.js: every AI call Christina makes.
// One entry point, handle(action, body, headers, method) → { status, body },
// shared by server.mjs (local), api/[action].js (Vercel) and netlify/functions/api.mjs.
// Zero dependencies: Node 20+ built-ins only. Keys are read from process.env and never returned or logged.

// ───────────────────────── Languages ─────────────────────────

export const LANGS = {
  'hi-IN': { name: 'Hindi', native: 'हिन्दी', script: 'Devanagari' },
  'kn-IN': { name: 'Kannada', native: 'ಕನ್ನಡ', script: 'Kannada' },
  'ta-IN': { name: 'Tamil', native: 'தமிழ்', script: 'Tamil' },
  'te-IN': { name: 'Telugu', native: 'తెలుగు', script: 'Telugu' },
  'ml-IN': { name: 'Malayalam', native: 'മലയാളം', script: 'Malayalam' },
  'mr-IN': { name: 'Marathi', native: 'मराठी', script: 'Devanagari' },
  'bn-IN': { name: 'Bengali', native: 'বাংলা', script: 'Bengali' },
  'gu-IN': { name: 'Gujarati', native: 'ગુજરાતી', script: 'Gujarati' },
  'pa-IN': { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  'od-IN': { name: 'Odia', native: 'ଓଡ଼ିଆ', script: 'Odia' },
  'en-IN': { name: 'English', native: 'English', script: 'Latin' },
};

const RUNG_NAMES = { 1: 'Nudge', 2: 'Concept', 3: 'Similar example', 4: 'Next step' };
const MOODS = ['calm', 'confused', 'frustrated', 'confident'];
const SUBJECTS = ['maths', 'physics', 'chemistry', 'biology', 'science', 'other'];

// ───────────────────────── Settings ─────────────────────────

const env = (k, d = '') => (process.env[k] ?? '').trim() || d;
const list = (k, d) => env(k, d).split(',').map((s) => s.trim()).filter(Boolean);

const cfg = () => ({
  gemini: env('GEMINI_API_KEY'),
  sarvam: env('SARVAM_API_KEY'),
  provider: env('LLM_PROVIDER', 'auto').toLowerCase(),
  models: list('GEMINI_MODELS', 'gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite'),
  ttsModels: list('GEMINI_TTS_MODELS', 'gemini-3.8-flash-tts,gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts'),
  gVoice: { female: env('GEMINI_VOICE_FEMALE', 'Kore'), male: env('GEMINI_VOICE_MALE', 'Puck') },
  sChat: env('SARVAM_CHAT_MODEL', 'sarvam-105b'),
  sTts: env('SARVAM_TTS_MODEL', 'bulbul:v3'),
  sVoice: { female: env('SARVAM_VOICE_FEMALE', 'priya').toLowerCase(), male: env('SARVAM_VOICE_MALE', 'shubh').toLowerCase() },
  passcode: env('APP_PASSCODE'),
  // Base URLs can be overridden for a corporate proxy or a local test double. Not needed normally.
  gBase: env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com').replace(/\/+$/, ''),
  sBase: env('SARVAM_BASE_URL', 'https://api.sarvam.ai').replace(/\/+$/, ''),
});

const ACTION_BUDGET_MS = 25_000; // every action finishes inside 25 s (Vercel is set to 60 s)
const MAX_B64 = 4_000_000; // keep request payloads under Vercel's 4.5 MB
const MAX_RESPONSE_B64 = 3_800_000; // and responses too

// ───────────────────────── Errors ─────────────────────────

const FRIENDLY = {
  no_key: [503, 'The server has no AI key yet. Add GEMINI_API_KEY to keys.txt (or your host settings) and refresh.'],
  bad_key: [502, 'The API key was not accepted. Check keys.txt.'],
  busy: [429, 'Christina is busy right now. Wait a few seconds and try again.'],
  timeout: [504, 'That took too long. Try again.'],
  network: [502, 'The server could not reach the AI service. Check the internet connection and try again.'],
  provider: [502, 'Christina could not answer just now. Try again in a moment.'],
  bad_input: [400, 'Something was missing from that request.'],
  too_large: [413, 'That was too big to send. Try a shorter recording or a smaller photo.'],
  passcode: [401, 'Enter the passcode to use Christina.'],
  unknown_action: [404, 'Unknown action.'],
};

export class AIError extends Error {
  constructor(code, detail = '', message) {
    super(message || FRIENDLY[code]?.[1] || FRIENDLY.provider[1]);
    this.code = FRIENDLY[code] ? code : 'provider';
    this.status = FRIENDLY[this.code][0];
    this.detail = detail;
  }
}

// Remove anything that looks like a secret before text leaves the server.
function redact(text) {
  let s = String(text || '');
  const { gemini, sarvam, passcode } = cfg();
  for (const k of [gemini, sarvam, passcode]) if (k && k.length > 3) s = s.split(k).join('•••');
  return s.replace(/AIza[0-9A-Za-z_\-]{20,}/g, '•••').replace(/sk_[0-9A-Za-z_\-]{16,}/g, '•••').slice(0, 300);
}

// Ranks codes so that, when several attempts fail, the most useful reason is reported.
const CODE_RANK = { bad_key: 6, busy: 5, timeout: 4, network: 3, provider: 2, model_missing: 1 };
const worst = (errs) => errs.reduce((a, e) => ((CODE_RANK[e.code] || 0) > (CODE_RANK[a?.code] || 0) ? e : a), null);

async function fetchWithTimeout(url, opts, ms) {
  if (ms < 400) throw new AIError('timeout', 'no time left');
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ac.signal });
  } catch (e) {
    if (e?.name === 'AbortError') throw new AIError('timeout', `timed out after ${Math.round(ms / 1000)} s`);
    throw new AIError('network', e?.cause?.code || e?.message || 'fetch failed');
  } finally {
    clearTimeout(t);
  }
}

const left = (deadline, cap = 20_000) => Math.min(cap, deadline - Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Turn a provider HTTP failure into one of our codes.
async function providerError(res, who) {
  let msg = '';
  let reason = '';
  try {
    const j = await res.json();
    msg = j?.error?.message || j?.message || j?.detail || JSON.stringify(j).slice(0, 200);
    reason = (j?.error?.details || []).map((d) => d.reason).filter(Boolean).join(',') || j?.error?.status || '';
  } catch { /* not JSON */ }
  const s = res.status;
  let code = 'provider';
  if (s === 401 || s === 403 || /API_KEY_INVALID|API key not valid|invalid api key|unauthori[sz]ed|PERMISSION_DENIED/i.test(`${reason} ${msg}`)) code = 'bad_key';
  else if (s === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(reason + msg)) code = 'busy';
  else if (s === 404) code = 'model_missing';
  else if (s === 503 || s === 500 || s === 502) code = 'busy'; // overloaded: rotate like a rate limit
  const err = new AIError(code === 'model_missing' ? 'provider' : code, redact(`${who}: ${s} ${msg}`));
  err.raw = code;
  err.schemaProblem = s === 400 && /schema|response_schema|responseSchema|thinking/i.test(msg);
  return err;
}

// ───────────────────────── JSON helpers ─────────────────────────

export function parseJSON(text) {
  if (text && typeof text === 'object') return text;
  let s = String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const tryParse = (t) => { try { return JSON.parse(t); } catch { return undefined; } };
  let out = tryParse(s);
  if (out !== undefined) return out;
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) {
    const mid = s.slice(a, b + 1);
    out = tryParse(mid) ?? tryParse(mid.replace(/,\s*([}\]])/g, '$1'));
    if (out !== undefined) return out;
  }
  throw new AIError('provider', 'reply was not valid JSON');
}

const str = (v, max = 2000) => (typeof v === 'string' ? v : v == null ? '' : String(v)).trim().slice(0, max);
const int = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const nullable = (v, max) => { const s = str(v, max); return s && !/^(null|none|n\/a)$/i.test(s) ? s : null; };

// Words only: what text-to-speech should read.
export function plainSpeech(text) {
  return str(text, 4000)
    .replace(/\$+([^$]*)\$+/g, ' $1 ')
    .replace(/\\(frac|dfrac)\{([^}]*)\}\{([^}]*)\}/g, ' $2 by $3 ')
    .replace(/\\(times|cdot)/g, ' times ')
    .replace(/\\div/g, ' divided by ')
    .replace(/\\sqrt\{([^}]*)\}/g, ' square root of $1 ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[*_`#>{}\\^~|]/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Gemini structured-output schema helpers (OpenAPI subset).
const S = {
  str: (extra = {}) => ({ type: 'STRING', ...extra }),
  nstr: () => ({ type: 'STRING', nullable: true }),
  int: () => ({ type: 'INTEGER' }),
  num: () => ({ type: 'NUMBER' }),
  bool: () => ({ type: 'BOOLEAN' }),
  arr: (items, extra = {}) => ({ type: 'ARRAY', items, ...extra }),
  obj: (properties, required = Object.keys(properties)) => ({ type: 'OBJECT', properties, required, propertyOrdering: Object.keys(properties) }),
};

const SCHEMAS = {
  tutor: S.obj({
    screen: S.str(), speak: S.str(), hint_level: S.int(), solved: S.bool(), mistake: S.nstr(), board: S.nstr(),
    terms: S.arr(S.obj({ en: S.str(), local: S.str(), meaning: S.str() })),
    mood: S.str({ enum: MOODS }),
  }),
  teachback: S.obj({ score: S.int(), good: S.str(), missing: S.nstr(), screen: S.str(), speak: S.str() }),
  report: S.obj({ screen: S.str(), speak: S.str() }),
  photo: S.obj({ problem: S.str(), subject: S.str({ enum: SUBJECTS }), readable: S.bool() }),
  listen: S.obj({ text: S.str(), language: S.str() }),
  checkWork: S.obj({
    verdict: S.str({ enum: ['correct', 'partly', 'wrong', 'unreadable'] }), read: S.str(),
    screen: S.str(), speak: S.str(), mistake: S.nstr(), board: S.nstr(), solved: S.bool(),
  }),
  practice: S.obj({ problems: S.arr(S.obj({ level: S.str({ enum: ['easier', 'same', 'harder'] }), text: S.str() })) }),
  visual: {
    type: 'OBJECT',
    properties: {
      type: S.str({ enum: ['number_line', 'bar_model', 'fraction', 'graph', 'triangle', 'none'] }),
      caption: S.str(),
      min: S.num(), max: S.num(),
      marks: S.arr(S.obj({ value: S.num(), label: S.str() })),
      jumps: S.arr(S.obj({ from: S.num(), to: S.num(), label: S.str() })),
      bars: S.arr(S.obj({ label: S.str(), parts: S.int(), partLabel: S.str() }, ['label', 'parts'])),
      numerator: S.int(), denominator: S.int(), shape: S.str({ enum: ['circle', 'bar'] }),
      kind: S.str({ enum: ['linear', 'quadratic'] }), a: S.num(), b: S.num(), c: S.num(), xMin: S.num(), xMax: S.num(),
      points: S.arr(S.obj({ x: S.num(), label: S.str() })),
      sides: S.obj({ a: S.str(), b: S.str(), c: S.str() }, []),
      angles: S.obj({ A: S.str(), B: S.str(), C: S.str() }, []),
    },
    required: ['type', 'caption'],
  },
};

// ───────────────────────── Prompts ─────────────────────────

const langOf = (code) => LANGS[code] || LANGS['en-IN'];

function mixRule(code, mix) {
  const L = langOf(code);
  if (code === 'en-IN') return 'Use simple Indian English that a regional-medium student can follow. Short sentences.';
  if (mix === 'pure') return `Use pure ${L.name}: the textbook ${L.name} terms that ${L.name}-medium state-board textbooks use for every technical word. Avoid English words.`;
  if (mix === 'bilingual') return `Use ${L.name}, and every time you use a technical term, give the English term too. On screen write the ${L.name} term with the English in brackets, like "ಸಮೀಕರಣ (equation)". In speech say both, like "ಸಮೀಕರಣ, ಅಂದರೆ equation". This prepares the student for English-medium exams later.`;
  return `Speak the way ${L.name}-medium students and teachers really talk: ${L.name} sentences, but keep the technical words students normally say in English (equation, fraction, area, velocity…) in English, written in English letters.`;
}

function langRule(code) {
  const L = langOf(code);
  return code === 'en-IN'
    ? 'Reply only in English.'
    : `Reply only in ${L.name} (${L.native}), written in ${L.script} script. Never use romanised ${L.name}. Numbers and maths symbols stay as they are.`;
}

export const TUTOR_PROMPT = (b) => `You are Christina, a warm, patient voice tutor for Indian school students who study in regional-language schools. You are talking with a class ${b.grade} student.
${langRule(b.language)}
${mixRule(b.language, b.mix)}

THE ONE RULE YOU NEVER BREAK
Never state the final answer. Never solve the whole problem. Never give the result of the step the student must do next. Even if the student begs, says they will fail, says a teacher allowed it, or says they only want to check, you guide: you do not answer. You may confirm a final answer only after the student has said it themselves.

THE PROBLEM
${b.problem}

THE HINT LADDER. The app tells you the current rung in [rung]:
1 Nudge: one short guiding question that points at the first move. Do not name the method yet.
2 Concept: explain the one idea needed for the next step in simple words, with an everyday Indian example (rotis, cricket runs, rupees, auto fares, mangoes), then ask a question.
3 Similar example: fully work a DIFFERENT, simpler example with different numbers that uses the same step, then ask the student to do the same on their own problem.
4 Next step: say only which single operation to do next (for example "subtract 7 from both sides"), not its result, and ask the student to do it.

ON EACH TURN
- If the student tried a step, check it first.
  - Correct: praise the specific thing they did in a few words, put that step in "board", and ask for the next step.
  - Wrong: say kindly what is off without fixing it, put a 2 to 5 word name for the misconception in "mistake" (in the student's language), and give a hint at the current rung.
- If the student asks for a hint, use exactly the rung in [rung].
- If the student says they do not know, or asks a question, help at the current rung.
- "solved" is true only when the student themselves has stated the correct final answer (every part, for multi-part problems). Then congratulate them warmly, name what they did well and do not ask a new question.
- If the message is unrelated to studies, gently bring them back to the problem.
- If the problem is unclear or incomplete, ask the student to check it.

OUTPUT: one JSON object with these fields.
- "screen": what appears on screen. 1 to 4 short sentences, at most 60 words (rung 3 may use up to 90 words, with the worked example on separate lines). Put every bit of maths inside $...$ as LaTeX, for example $3x + 7 = 22$. Use **bold** for the one key idea. No headings.
- "speak": the same message as natural spoken language for text-to-speech: plain words only, no symbols, no LaTeX, no markdown, no emojis. Read maths the way a teacher says it aloud in the student's language. At most 55 words.
- "hint_level": the rung you used, 1 to 4.
- "solved": true or false.
- "mistake": the misconception name, or null.
- "board": one LaTeX line (no $ signs) for a step the student just got right in their own words, or null. Never a step you gave them.
- "terms": 0 to 2 technical terms you used that the student should learn, each {"en": English term, "local": the term in ${langOf(b.language).script} script, "meaning": at most 8 words in the student's language}. Do not repeat terms already taught earlier in this conversation. Use [] for English lessons unless a term needs explaining.
- "mood": "calm", "confused", "frustrated" or "confident", judged from the student's latest message and the conversation. "I give up", "I don't know" in any language, or repeated wrong attempts mean confused or frustrated. Quick correct steps mean confident.
If the mood is frustrated, begin both "screen" and "speak" with one short, genuine line of encouragement, and make this hint gentler.`;

const TEACHBACK_PROMPT = (b) => `You are Christina, a warm tutor. A class ${b.grade} student has just solved the problem below, and is now explaining the method back to you in their own words, like a teacher (the Feynman technique).
${langRule(b.language)}
${mixRule(b.language, b.mix)}

THE PROBLEM
${b.problem}

Score their understanding from 0 to 100:
- 90 to 100: explains every key step and why it works.
- 70 to 89: main steps right, one idea missing or vague.
- 40 to 69: partly right, with important gaps.
- 0 to 39: mostly missing or wrong.
Be generous with speech-to-text mistakes and informal language. Judge the method, not grammar.

OUTPUT: one JSON object:
- "score": integer 0 to 100.
- "good": a short phrase on what they explained well.
- "missing": a short phrase on what to add, or null if nothing is missing.
- "screen": 2 or 3 warm sentences of feedback. Maths inside $...$.
- "speak": the same as plain spoken words, no symbols. At most 50 words.`;

const REPORT_PROMPT = (b) => `You are Christina, a tutor. Write a short voice note for the parent or guardian of a class ${b.grade} student. The parent may not read, so it must be easy to follow by ear.
${langRule(b.language)}
Use everyday words that a parent with little schooling understands. Address the parent respectfully.

Today's lesson: ${b.problem}
Facts: solved=${b.stats.solved}, hints used=${b.stats.hints}, explain-it-back score=${b.stats.teachScore ?? 'not done'}, minutes=${b.stats.minutes}.
Steps the child wrote correctly: ${b.board.length ? b.board.join(' ; ') : 'none recorded'}.

Write 3 or 4 sentences, at most 70 words: what the child worked on (in everyday words, no symbols), how independently they worked, one specific thing they did well, and one simple way the parent can encourage them at home tonight. Warm and proud, never negative.

OUTPUT: one JSON object: {"screen": the note (maths may go inside $...$), "speak": the same note as plain spoken words with no symbols}.`;

const PHOTO_PROMPT = `Read this photo of a student's homework. It may be handwritten or printed, in any Indian script or in English.
Copy the ONE main maths or science problem exactly as written, in its original language and script. If there are several, take the one that is circled or marked, otherwise the first complete one. Write maths as LaTeX inside $...$. Do not solve it and do not add anything.
OUTPUT: one JSON object: {"problem": the problem text, "subject": one of "maths", "physics", "chemistry", "biology", "science", "other", "readable": true or false}.
If the photo is too blurry, too dark, cut off, or has no problem in it, set "readable": false and "problem": "".`;

const LISTEN_PROMPT = (b) => `Transcribe exactly what the student says in this recording. They most likely speak ${langOf(b.language).name}, but they may mix in English or speak another Indian language.
Write each language in its own native script (English words in English letters). Write numbers as digits. Do not answer, translate, correct or summarise anything.
If there is no clear speech, return an empty "text".
OUTPUT: one JSON object: {"text": the transcript, "language": the BCP-47 code of the main language spoken, one of ${Object.keys(LANGS).join(', ')}}.`;

const CHECK_WORK_PROMPT = (b) => `You are Christina, a warm, patient tutor for a class ${b.grade} student. The image is the student's handwritten working from a scratchpad (dark ink on white).
${langRule(b.language)}
${mixRule(b.language, b.mix)}

THE PROBLEM
${b.problem}

Read the working. Judge ONLY the latest step: the last line written (usually the lowest one). Compare it with the problem, the earlier lines and the conversation so far.
- "verdict": "correct" if the step is mathematically right and follows from what came before; "partly" if it is on the right track but has a slip or is unfinished; "wrong" if it is incorrect; "unreadable" if you cannot read it confidently.
- Never state the final answer or the result of the next step. The same hint ladder rules apply as in tutoring (current rung: ${b.hint_level}, ${RUNG_NAMES[b.hint_level]}).
- correct: praise the specific step in a few words and ask for the next step. If this step is the correct final answer, congratulate them and set "solved": true.
- partly or wrong: say kindly what is off without fixing it, put a 2 to 5 word name of the misconception in "mistake", and give a hint at the current rung.
- unreadable: kindly ask them to write a bit bigger and clearer.

OUTPUT: one JSON object:
- "verdict": as above.
- "read": what you read in the latest step, as LaTeX (no $ signs), or "".
- "screen": 1 to 3 short sentences. Maths inside $...$.
- "speak": the same as plain spoken words, no symbols. At most 45 words.
- "mistake": misconception name or null.
- "board": the latest step as one LaTeX line (no $ signs) if the verdict is correct, otherwise null.
- "solved": true only if the student has correctly reached the final answer.`;

const PRACTICE_PROMPT = (b) => `A class ${b.grade} student has just solved this problem by themselves:
${b.problem}
(They used ${b.solvedWith.hints} hints; explain-it-back score: ${b.solvedWith.teachScore ?? 'not done'}.)

Write exactly 3 new practice problems on the SAME concept: one easier, one about the same, one harder. Make them feel like an Indian state-board textbook, with different numbers and, where natural, everyday Indian settings.
${langRule(b.language)}
Put maths inside $...$ as LaTeX. Do NOT include answers, hints or solutions. Each problem at most 35 words.${b.solvedWith.hints >= 3 || (b.solvedWith.teachScore ?? 100) < 60 ? ' This student needed help, so make the easier one gentle.' : ''}
OUTPUT: one JSON object: {"problems": [{"level": "easier", "text": ...}, {"level": "same", "text": ...}, {"level": "harder", "text": ...}]}.`;

const VISUAL_PROMPT = (b) => `You help a class ${b.grade} student see the idea behind the current step of this problem with ONE simple diagram, described as a typed spec. You never write SVG or code.
THE PROBLEM
${b.problem}

Pick the type that helps most:
- "number_line": {min, max (a range of at most 40), marks: [{value, label}], jumps: [{from, to, label}]} for adding, subtracting, negatives and balancing.
- "bar_model": {bars: [{label, parts (1 to 12), partLabel}]} for equations like 3x = 15, ratios and word problems. Bars are drawn to the same length, split into parts.
- "fraction": {numerator, denominator (2 to 16), shape: "circle" or "bar"}.
- "graph": {kind: "linear" or "quadratic", a, b, c, xMin, xMax, points: [{x, label}]}. Quadratic means y = a·x² + b·x + c, linear means y = a·x + b. The app computes the curve itself.
- "triangle": {sides: {a, b, c}, angles: {A, B, C}} for geometry and Pythagoras. Leave unknown entries as "?".
- "none": when no diagram would help.
Always include "type" and "caption": one sentence saying what to notice.
Never reveal the final answer in any label or the caption: write "?" or "x" for unknowns. Keep labels at most 12 characters.
${langRule(b.language)} Labels and the caption are in that language, except numbers and maths symbols.
OUTPUT: one JSON object with "type", "caption" and only the fields for that type.`;

// ───────────────────────── Gemini ─────────────────────────

// Models that hit a rate limit or vanish are skipped for a while, so the next request goes straight to one that works.
const cooldown = new Map();
const cool = (model, ms) => cooldown.set(model, Date.now() + ms);
const ordered = (models) => {
  const now = Date.now();
  const ready = models.filter((m) => !(cooldown.get(m) > now));
  return ready.length ? ready : [...models];
};

function thinkingFor(model) {
  if (/gemini-[3-9]/.test(model)) return { thinkingLevel: 'low' };
  if (/2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  return undefined;
}

async function geminiCall(model, payload, deadline, cap = 13_000) {
  const c = cfg();
  const res = await fetchWithTimeout(`${c.gBase}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': c.gemini },
    body: JSON.stringify(payload),
  }, left(deadline, cap));
  if (!res.ok) throw await providerError(res, model);
  return res.json();
}

const replyText = (j) => (j?.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join('');

// Ask Gemini for JSON, rotating models. Returns { data, by }.
async function geminiJSON({ system, contents, schema, temperature = 0.5, deadline }) {
  const c = cfg();
  if (!c.gemini) throw new AIError('no_key', 'GEMINI_API_KEY missing');
  const errs = [];
  const attempt = async (model) => {
    let useSchema = !!schema;
    let useThinking = true;
    for (let tries = 0; tries < 3; tries++) {
      const generationConfig = { responseMimeType: 'application/json', temperature };
      if (useSchema) generationConfig.responseSchema = schema;
      const th = useThinking && thinkingFor(model);
      if (th) generationConfig.thinkingConfig = th;
      try {
        const j = await geminiCall(model, { systemInstruction: { parts: [{ text: system }] }, contents, generationConfig }, deadline);
        const text = replyText(j);
        if (!text) {
          const why = j?.promptFeedback?.blockReason || j?.candidates?.[0]?.finishReason || 'empty reply';
          throw new AIError('provider', `${model}: ${why}`);
        }
        return { data: parseJSON(text), by: model };
      } catch (e) {
        // A model that rejects the schema or the thinking setting gets one more go without it.
        if (e.schemaProblem && (useSchema || useThinking)) {
          if (/thinking/i.test(e.detail) && useThinking) useThinking = false;
          else useSchema = false;
          continue;
        }
        throw e;
      }
    }
    throw new AIError('provider', `${model}: gave up`);
  };

  for (const model of ordered(c.models)) {
    try { return await attempt(model); } catch (e) {
      errs.push(e);
      if (e.code === 'bad_key' || e.code === 'timeout' && left(deadline) < 3000) break;
      if (e.raw === 'busy' || e.code === 'busy') cool(model, 45_000);
      if (e.raw === 'model_missing') cool(model, 600_000);
    }
  }
  // Every model was rate limited: back off once and retry the first one.
  if (errs.length && errs.every((e) => e.code === 'busy') && left(deadline) > 7000) {
    await sleep(1500);
    try { return await attempt(c.models[0]); } catch (e) { errs.push(e); }
  }
  const w = worst(errs) || new AIError('provider');
  throw new AIError(w.code, errs.map((e) => e.detail).filter(Boolean).join(' | '));
}

// ───────────────────────── Sarvam ─────────────────────────

async function sarvamJSON({ system, contents, deadline }) {
  const c = cfg();
  if (!c.sarvam) throw new AIError('no_key', 'SARVAM_API_KEY missing');
  const messages = [{ role: 'system', content: `${system}\n\nReply with the JSON object only.` }];
  for (const m of contents) {
    const text = m.parts.map((p) => p.text).filter(Boolean).join('\n');
    if (text) messages.push({ role: m.role === 'model' ? 'assistant' : 'user', content: text });
  }
  const res = await fetchWithTimeout(`${c.sBase}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-subscription-key': c.sarvam },
    body: JSON.stringify({ model: c.sChat, messages, temperature: 0.4 }),
  }, left(deadline));
  if (!res.ok) throw await providerError(res, c.sChat);
  const j = await res.json();
  return { data: parseJSON(j?.choices?.[0]?.message?.content || ''), by: c.sChat };
}

// The brain: Gemini first, Sarvam as backup (or as configured by LLM_PROVIDER).
async function brain(req) {
  const c = cfg();
  const order = c.provider === 'sarvam' ? ['sarvam', 'gemini'] : c.provider === 'gemini' ? ['gemini'] : ['gemini', 'sarvam'];
  const usable = order.filter((p) => (p === 'gemini' ? c.gemini : c.sarvam));
  if (!usable.length) throw new AIError('no_key', 'no brain configured');
  const hasImage = req.contents.some((m) => m.parts.some((p) => p.inlineData));
  const errs = [];
  for (const p of usable) {
    if (p === 'sarvam' && hasImage) continue; // Sarvam chat can't see images
    try { return p === 'gemini' ? await geminiJSON(req) : await sarvamJSON(req); } catch (e) {
      errs.push(e);
      if (left(req.deadline) < 2500) break;
    }
  }
  const w = worst(errs) || new AIError('provider');
  throw new AIError(w.code, errs.map((e) => e.detail).filter(Boolean).join(' | '));
}

// ───────────────────────── Speech ─────────────────────────

function pcmToWav(pcm, rate = 24000, channels = 1, bits = 16) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE((rate * channels * bits) / 8, 28); h.writeUInt16LE((channels * bits) / 8, 32);
  h.writeUInt16LE(bits, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const ttsCooldown = new Map();

async function geminiSpeak(text, language, voice, pace, deadline) {
  const c = cfg();
  if (!c.gemini) throw new AIError('no_key');
  const errs = [];
  const now = Date.now();
  const ready = c.ttsModels.filter((m) => !(ttsCooldown.get(m) > now));
  const style = pace < 0.95 ? 'slowly, warmly and clearly, like a kind teacher' : pace > 1.1 ? 'briskly and clearly, like a kind teacher' : 'warmly and clearly, like a kind teacher';
  for (const model of ready.length ? ready : c.ttsModels) {
    try {
      const j = await geminiCall(model, {
        contents: [{ role: 'user', parts: [{ text: `Say ${style}: ${text}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: c.gVoice[voice] || c.gVoice.female } } },
        },
      }, deadline, 14_000);
      const part = (j?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
      if (!part) throw new AIError('provider', `${model}: no audio`);
      const mime = part.inlineData.mimeType || '';
      const rate = Number(/rate=(\d+)/.exec(mime)?.[1]) || 24000;
      const raw = Buffer.from(part.inlineData.data, 'base64');
      const wav = /wav/i.test(mime) ? raw : pcmToWav(raw, rate);
      return { audio: wav.toString('base64'), format: 'wav', by: 'Gemini TTS' };
    } catch (e) {
      errs.push(e);
      if (e.code === 'bad_key') break;
      if (e.raw === 'busy' || e.code === 'busy') ttsCooldown.set(model, Date.now() + 45_000);
      if (e.raw === 'model_missing') ttsCooldown.set(model, Date.now() + 600_000);
      if (left(deadline) < 2500) break;
    }
  }
  const w = worst(errs) || new AIError('provider');
  throw new AIError(w.code, errs.map((e) => e.detail).join(' | '));
}

async function sarvamSpeak(text, language, voice, pace, deadline) {
  const c = cfg();
  const res = await fetchWithTimeout(`${c.sBase}/text-to-speech`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-subscription-key': c.sarvam },
    body: JSON.stringify({
      text: text.slice(0, 2400),
      target_language_code: language,
      model: c.sTts,
      speaker: c.sVoice[voice] || c.sVoice.female,
      pace: num(pace, 0.5, 2, 1),
      speech_sample_rate: 22050,
      temperature: 0.6,
    }),
  }, left(deadline, 15_000));
  if (!res.ok) throw await providerError(res, c.sTts);
  const j = await res.json();
  const audio = j?.audios?.[0];
  if (!audio) throw new AIError('provider', `${c.sTts}: no audio`);
  return { audio, format: 'wav', by: 'Sarvam Bulbul v3' };
}

async function speakOne(text, language, voice, pace, deadline) {
  const c = cfg();
  const errs = [];
  if (c.sarvam) {
    try { return await sarvamSpeak(text, language, voice, pace, deadline); } catch (e) { errs.push(e); }
  }
  if (c.gemini) {
    try { return await geminiSpeak(text, language, voice, pace, deadline); } catch (e) { errs.push(e); }
  }
  if (!errs.length) throw new AIError('no_key', 'no voice configured');
  const w = worst(errs);
  throw new AIError(w.code, errs.map((e) => e.detail).join(' | '));
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// ───────────────────────── Request shaping ─────────────────────────

function base(body) {
  const b = body || {};
  return {
    language: LANGS[b.language] ? b.language : 'en-IN',
    grade: int(b.grade, 1, 12, 8),
    mix: ['pure', 'mixed', 'bilingual'].includes(b.mix) ? b.mix : 'mixed',
    problem: str(b.problem, 1500),
  };
}

function historyToContents(history) {
  const out = [];
  for (const h of (Array.isArray(history) ? history : []).slice(-16)) {
    const text = str(h?.content, 2000);
    if (!text) continue;
    const role = h.role === 'assistant' ? 'model' : 'user';
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].parts[0].text += `\n${text}`;
    else out.push({ role, parts: [{ text }] });
  }
  if (out.length && out[0].role === 'model') out.unshift({ role: 'user', parts: [{ text: '(The lesson starts.)' }] });
  return out;
}

function pushUser(contents, text, extraParts = []) {
  if (contents.length && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts.push({ text }, ...extraParts);
  } else contents.push({ role: 'user', parts: [{ text }, ...extraParts] });
  return contents;
}

function b64(body, field, label) {
  const v = str(body?.[field], MAX_B64 + 10).replace(/^data:[^,]*,/, '');
  if (!v) throw new AIError('bad_input', `${field} missing`, `No ${label} was received. Try again.`);
  if (v.length > MAX_B64) throw new AIError('too_large', `${field} is ${v.length} chars`);
  return v;
}

// ───────────────────────── Actions ─────────────────────────

async function tutor(body, deadline) {
  const b = base(body);
  if (!b.problem) throw new AIError('bad_input', 'problem missing', 'Tell Christina your problem first.');
  const hint = int(body.hint_level, 1, 4, 1);
  const kind = ['start', 'hint', 'answer'].includes(body.kind) ? body.kind : 'answer';
  const message = str(body.message, 1500);
  const contents = historyToContents(body.history);
  let turn = `[rung] ${hint} (${RUNG_NAMES[hint]})\n`;
  if (kind === 'start' || (!message && !contents.length)) turn += '[event] The student has just shared the problem and is waiting for you to begin. Start at the current rung. Do not solve anything.';
  else if (kind === 'hint') turn += `[event] The student asked for another hint. Give rung ${hint}.${message ? `\n[student] ${message}` : ''}`;
  else turn += `[student] ${message || '(no words)'}`;
  if (body.encourage) turn += '\n[note] The student is discouraged. Open with one short warm line of encouragement, keep sentences very short, and stay gentle.';
  if (body.confident) turn += '\n[note] The student is doing well. Keep it brisk and invite them to try the next step without hints.';
  pushUser(contents, turn);
  const { data, by } = await brain({ system: TUTOR_PROMPT(b), contents, schema: SCHEMAS.tutor, temperature: 0.55, deadline });
  const screen = str(data.screen, 1200) || str(data.speak, 800);
  const terms = (Array.isArray(data.terms) ? data.terms : []).slice(0, 2)
    .map((t) => ({ en: str(t?.en, 60), local: str(t?.local, 80), meaning: str(t?.meaning, 160) }))
    .filter((t) => t.en && t.local);
  return {
    screen,
    speak: plainSpeech(data.speak || screen).slice(0, 900),
    hint_level: int(data.hint_level, 1, 4, hint),
    solved: data.solved === true || data.solved === 'true',
    mistake: nullable(data.mistake, 60),
    board: nullable(data.board, 240)?.replace(/^\$+|\$+$/g, '') || null,
    terms,
    mood: MOODS.includes(data.mood) ? data.mood : 'calm',
    by,
  };
}

async function teachback(body, deadline) {
  const b = base(body);
  const explanation = str(body.explanation, 2500);
  if (!explanation) throw new AIError('bad_input', 'explanation missing', 'Christina did not hear an explanation. Try again.');
  const contents = historyToContents(body.history);
  pushUser(contents, `[event] Explain-it-back. The student's explanation of the method:\n${explanation}`);
  const { data, by } = await brain({ system: TEACHBACK_PROMPT(b), contents, schema: SCHEMAS.teachback, temperature: 0.4, deadline });
  const screen = str(data.screen, 900) || str(data.speak, 600);
  return { score: int(data.score, 0, 100, 50), good: str(data.good, 200), missing: nullable(data.missing, 200), screen, speak: plainSpeech(data.speak || screen).slice(0, 700), by };
}

async function report(body, deadline) {
  const b = base(body);
  const s = body.stats || {};
  const stats = { solved: !!s.solved, hints: int(s.hints, 0, 99, 0), teachScore: s.teachScore == null ? null : int(s.teachScore, 0, 100, null), minutes: int(s.minutes, 0, 600, 1) };
  const board = (Array.isArray(body.board) ? body.board : []).slice(0, 12).map((x) => str(x, 200));
  const contents = [{ role: 'user', parts: [{ text: '[event] Write the parent voice note now.' }] }];
  const { data, by } = await brain({ system: REPORT_PROMPT({ ...b, stats, board }), contents, schema: SCHEMAS.report, temperature: 0.6, deadline });
  const screen = str(data.screen, 1000) || str(data.speak, 800);
  return { screen, speak: plainSpeech(data.speak || screen).slice(0, 900), by };
}

async function photo(body, deadline) {
  const image = b64(body, 'image', 'photo');
  const mime = /^image\/(jpeg|png|webp|heic|heif)$/.test(body.mime) ? body.mime : 'image/jpeg';
  const contents = [{ role: 'user', parts: [{ text: 'Read the problem in this photo.' }, { inlineData: { mimeType: mime, data: image } }] }];
  const { data, by } = await brain({ system: PHOTO_PROMPT, contents, schema: SCHEMAS.photo, temperature: 0.1, deadline });
  const problem = str(data.problem, 1500);
  return { problem, subject: SUBJECTS.includes(data.subject) ? data.subject : 'maths', readable: data.readable !== false && problem.length > 2, by };
}

async function transcribe(body, deadline) {
  const audio = b64(body, 'audio', 'recording');
  const mime = str(body.mime, 60).split(';')[0] || 'audio/webm';
  const language = LANGS[body.language] ? body.language : 'en-IN';
  const c = cfg();
  const errs = [];
  if (c.sarvam) {
    try {
      const fd = new FormData();
      const ext = /ogg/.test(mime) ? 'ogg' : /mp4|m4a|aac/.test(mime) ? 'm4a' : /wav/.test(mime) ? 'wav' : 'webm';
      fd.append('file', new Blob([Buffer.from(audio, 'base64')], { type: mime }), `speech.${ext}`);
      fd.append('model', 'saaras:v3');
      fd.append('mode', 'transcribe');
      fd.append('language_code', language);
      const res = await fetchWithTimeout(`${c.sBase}/speech-to-text`, { method: 'POST', headers: { 'api-subscription-key': c.sarvam }, body: fd }, left(deadline, 15_000));
      if (!res.ok) throw await providerError(res, 'saaras:v3');
      const j = await res.json();
      return { text: str(j.transcript, 2000), language: LANGS[j.language_code] ? j.language_code : language, by: 'Sarvam Saaras v3' };
    } catch (e) { errs.push(e); }
  }
  if (c.gemini) {
    try {
      const contents = [{ role: 'user', parts: [{ text: 'Transcribe this recording.' }, { inlineData: { mimeType: mime, data: audio } }] }];
      const { data, by } = await geminiJSON({ system: LISTEN_PROMPT({ language }), contents, schema: SCHEMAS.listen, temperature: 0, deadline });
      const lang = str(data.language, 10);
      return { text: str(data.text, 2000), language: LANGS[lang] ? lang : language, by: `${prettyModel(by)} audio` };
    } catch (e) { errs.push(e); }
  }
  if (!errs.length) throw new AIError('no_key');
  const w = worst(errs);
  throw new AIError(w.code, errs.map((e) => e.detail).join(' | '));
}

async function speak(body, deadline) {
  const language = LANGS[body.language] ? body.language : 'en-IN';
  const voice = body.voice === 'male' ? 'male' : 'female';
  const pace = num(body.pace, 0.5, 2, 1);
  // Batch form: { sentences: [...] } → { audios: [{ text, audio, format, by }] }, in input order.
  if (Array.isArray(body.sentences)) {
    const sentences = body.sentences.slice(0, 8).map((s) => plainSpeech(s).slice(0, 600)).filter(Boolean);
    if (!sentences.length) throw new AIError('bad_input', 'no sentences', 'Nothing to say.');
    const results = await pool(sentences, 3, async (text) => {
      try { return { text, ...(await speakOne(text, language, voice, pace, deadline)) }; } catch (e) { return { text, audio: null, error: e.message, code: e.code }; }
    });
    if (results.every((r) => !r.audio)) {
      const first = results[0];
      throw new AIError(first.code || 'provider', results.map((r) => r.error).join(' | '));
    }
    // Stay under the response size limit: anything past it is sent back for a second request.
    let total = 0;
    for (const r of results) {
      if (!r.audio) continue;
      total += r.audio.length;
      if (total > MAX_RESPONSE_B64) { r.audio = null; r.deferred = true; }
    }
    return { audios: results };
  }
  const text = plainSpeech(body.text).slice(0, 2400);
  if (!text) throw new AIError('bad_input', 'text missing', 'Nothing to say.');
  return speakOne(text, language, voice, pace, deadline);
}

async function checkWork(body, deadline) {
  const b = base(body);
  if (!b.problem) throw new AIError('bad_input', 'problem missing', 'Start a problem first, then show your working.');
  const image = b64(body, 'image', 'drawing');
  const hint_level = int(body.hint_level, 1, 4, 1);
  const contents = historyToContents(body.history);
  pushUser(contents, '[event] The student wrote their working on the scratchpad. Check the latest step in this image.', [{ inlineData: { mimeType: body.mime === 'image/jpeg' ? 'image/jpeg' : 'image/png', data: image } }]);
  const { data, by } = await geminiJSON({ system: CHECK_WORK_PROMPT({ ...b, hint_level }), contents, schema: SCHEMAS.checkWork, temperature: 0.3, deadline });
  const verdict = ['correct', 'partly', 'wrong', 'unreadable'].includes(data.verdict) ? data.verdict : 'unreadable';
  const screen = str(data.screen, 900) || str(data.speak, 600);
  return {
    verdict,
    screen,
    speak: plainSpeech(data.speak || screen).slice(0, 700),
    mistake: verdict === 'correct' ? null : nullable(data.mistake, 60),
    board: verdict === 'correct' ? nullable(data.board || data.read, 240)?.replace(/^\$+|\$+$/g, '') || null : null,
    solved: verdict === 'correct' && data.solved === true,
    read: str(data.read, 240),
    by,
  };
}

async function practice(body, deadline) {
  const b = base(body);
  if (!b.problem) throw new AIError('bad_input', 'problem missing');
  const sw = body.solvedWith || {};
  const solvedWith = { hints: int(sw.hints, 0, 99, 0), teachScore: sw.teachScore == null ? null : int(sw.teachScore, 0, 100, null) };
  const contents = [{ role: 'user', parts: [{ text: '[event] Write the three practice problems now.' }] }];
  const { data } = await brain({ system: PRACTICE_PROMPT({ ...b, solvedWith }), contents, schema: SCHEMAS.practice, temperature: 0.8, deadline });
  const got = (Array.isArray(data.problems) ? data.problems : []).map((p) => ({ level: p?.level, text: str(p?.text, 400) })).filter((p) => p.text);
  const levels = ['easier', 'same', 'harder'];
  const problems = levels.map((level, i) => got.find((p) => p.level === level) || got[i]).filter(Boolean).map((p, i) => ({ level: levels[i], text: p.text }));
  if (problems.length < 3) throw new AIError('provider', `only ${problems.length} problems`);
  return { problems };
}

// Whitelist the diagram spec: only known types and fields, clamped. The client never draws model-written markup.
export function cleanVisual(d) {
  const label = (v) => str(v, 16);
  const caption = str(d?.caption, 220);
  const t = d?.type;
  if (t === 'number_line') {
    let min = num(d.min, -1000, 1000, 0);
    let max = num(d.max, -1000, 1000, 10);
    if (max <= min) max = min + 10;
    if (max - min > 60) max = min + 60;
    const inRange = (v) => v >= min && v <= max;
    const marks = (d.marks || []).slice(0, 8).map((m) => ({ value: num(m?.value, -1e4, 1e4, NaN), label: label(m?.label) })).filter((m) => inRange(m.value));
    const jumps = (d.jumps || []).slice(0, 4).map((j) => ({ from: num(j?.from, -1e4, 1e4, NaN), to: num(j?.to, -1e4, 1e4, NaN), label: label(j?.label) })).filter((j) => inRange(j.from) && inRange(j.to) && j.from !== j.to);
    return { type: t, min, max, marks, jumps, caption };
  }
  if (t === 'bar_model') {
    const bars = (d.bars || []).slice(0, 4).map((b) => ({ label: label(b?.label), parts: int(b?.parts, 1, 12, 1), partLabel: label(b?.partLabel) || undefined })).filter((b) => b.label || b.parts);
    return bars.length ? { type: t, bars, caption } : { type: 'none', caption };
  }
  if (t === 'fraction') {
    const denominator = int(d.denominator, 1, 16, 4);
    return { type: t, numerator: int(d.numerator, 0, denominator, 1), denominator, shape: d.shape === 'bar' ? 'bar' : 'circle', caption };
  }
  if (t === 'graph') {
    let xMin = num(d.xMin, -50, 50, -5);
    let xMax = num(d.xMax, -50, 50, 5);
    if (xMax <= xMin) { xMin = -5; xMax = 5; }
    const points = (d.points || []).slice(0, 4).map((p) => ({ x: num(p?.x, xMin, xMax, NaN), label: label(p?.label) })).filter((p) => Number.isFinite(p.x));
    return { type: t, kind: d.kind === 'quadratic' ? 'quadratic' : 'linear', a: num(d.a, -100, 100, 1), b: num(d.b, -1000, 1000, 0), c: num(d.c, -1000, 1000, 0), xMin, xMax, points, caption };
  }
  if (t === 'triangle') {
    const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, label(o?.[k])]).filter(([, v]) => v));
    return { type: t, sides: pick(d.sides, ['a', 'b', 'c']), angles: pick(d.angles, ['A', 'B', 'C']), caption };
  }
  return { type: 'none', caption };
}

async function visual(body, deadline) {
  const b = base(body);
  if (!b.problem) throw new AIError('bad_input', 'problem missing');
  const contents = historyToContents(body.history);
  pushUser(contents, '[event] The student tapped "Show me". Describe one diagram for the current step.');
  const { data } = await brain({ system: VISUAL_PROMPT(b), contents, schema: SCHEMAS.visual, temperature: 0.3, deadline });
  return cleanVisual(data);
}

// ───────────────────────── Config and health ─────────────────────────

export function prettyModel(m = '') {
  return String(m).replace(/^models\//, '').split('-').map((w) => (/^\d/.test(w) ? w : w === 'tts' ? 'TTS' : w[0].toUpperCase() + w.slice(1))).join(' ');
}

function config() {
  const c = cfg();
  const g = !!c.gemini;
  const s = !!c.sarvam;
  const brainLabel = c.provider === 'sarvam' && s ? prettyModel(c.sChat) : g ? prettyModel(c.models[0]) : s ? prettyModel(c.sChat) : null;
  return {
    brain: brainLabel,
    eyes: g ? `${prettyModel(c.models[0])} vision` : null,
    ears: s ? 'Sarvam Saaras v3' : g ? 'Gemini audio understanding' : null,
    voice: s ? 'Sarvam Bulbul v3' : g ? 'Gemini TTS' : null,
    backup: g && s ? `${prettyModel(c.sChat)} brain, Gemini voice` : null,
    passcode: !!c.passcode,
  };
}

let healthCache = null;
// The cache is tied to the current keys and models, so editing keys.txt shows fresh status straight away.
const fingerprint = (c) => { let h = 0; for (const ch of [c.gemini, c.sarvam, c.models, c.ttsModels, c.gBase].join('|')) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; };

async function timed(fn) {
  const t = Date.now();
  try { const extra = await fn(); return { ok: true, latencyMs: Date.now() - t, ...extra }; } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: e instanceof AIError ? `${e.message}${e.detail ? ` (${redact(e.detail).slice(0, 120)})` : ''}` : 'failed', code: e.code };
  }
}

async function health() {
  const c = cfg();
  const fp = fingerprint(c);
  if (healthCache && healthCache.fp === fp && Date.now() - healthCache.at < 60_000) return { ...healthCache.body, cached: true };
  const deadline = Date.now() + 15_000;
  const off = (what) => ({ ok: false, configured: false, error: `${what} not set` });
  const ping = (model, payload) => geminiCall(model, payload, deadline, 12_000);
  const [gemini, geminiTts, sarvam] = await Promise.all([
    c.gemini ? timed(async () => {
      for (const model of ordered(c.models)) {
        try {
          await ping(model, { contents: [{ role: 'user', parts: [{ text: 'Reply with the word ok.' }] }], generationConfig: { maxOutputTokens: 8, ...(thinkingFor(model) ? { thinkingConfig: thinkingFor(model) } : {}) } });
          return { model };
        } catch (e) {
          if (e.code === 'bad_key' || left(deadline) < 2000) throw e;
          if (e.schemaProblem) { await ping(model, { contents: [{ role: 'user', parts: [{ text: 'ok' }] }] }); return { model }; }
        }
      }
      throw new AIError('provider', 'no model answered');
    }) : off('GEMINI_API_KEY'),
    c.gemini ? timed(async () => {
      for (const model of c.ttsModels) {
        try {
          await ping(model, { contents: [{ role: 'user', parts: [{ text: 'Say: ok' }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: c.gVoice.female } } } } });
          return { model };
        } catch (e) { if (e.code === 'bad_key' || left(deadline) < 2000) throw e; }
      }
      throw new AIError('provider', 'no voice model answered');
    }) : off('GEMINI_API_KEY'),
    c.sarvam ? timed(async () => { await sarvamSpeak('ok', 'en-IN', 'female', 1, deadline); return { model: c.sTts }; }) : off('SARVAM_API_KEY'),
  ]);
  for (const s of [gemini, geminiTts, sarvam]) if (s.configured === undefined) s.configured = true;
  const body = { services: { gemini, geminiTts, sarvam }, checkedAt: new Date().toISOString() };
  healthCache = { at: Date.now(), fp, body };
  return body;
}

// ───────────────────────── Entry point ─────────────────────────

const ACTIONS = {
  tutor, teachback, report, photo, transcribe, speak, 'check-work': checkWork, practice, visual,
};

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i % x.length] || 0) ^ (y[i % y.length] || 0);
  return diff === 0;
}

export async function handle(action, body, headers = {}, method = 'POST') {
  const name = String(action || '').toLowerCase();
  try {
    if (name === 'config') return { status: 200, body: config() };
    const c = cfg();
    if (c.passcode) {
      const got = headers['x-passcode'] ?? headers['X-Passcode'] ?? '';
      if (!got || !safeEqual(got, c.passcode)) throw new AIError('passcode');
    }
    if (name === 'health') return { status: 200, body: await health() };
    const fn = ACTIONS[name];
    if (!fn) throw new AIError('unknown_action', name);
    if (String(method).toUpperCase() === 'GET') throw new AIError('bad_input', 'use POST', 'Use POST for this action.');
    const deadline = Date.now() + ACTION_BUDGET_MS;
    const out = await fn(body && typeof body === 'object' ? body : {}, deadline);
    return { status: 200, body: out };
  } catch (e) {
    const err = e instanceof AIError ? e : new AIError('provider', e?.message);
    if (err.code !== 'passcode' && err.code !== 'bad_input') console.warn(`[christina] ${name}: ${err.code} ${redact(err.detail)}`);
    return { status: err.status, body: { error: err.message, code: err.code, detail: err.detail ? redact(err.detail) : undefined } };
  }
}
