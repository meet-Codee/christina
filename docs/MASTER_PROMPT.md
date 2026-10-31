# Master prompt: Christina upgrade

> Paste everything below the line into your coding agent (Claude Code, Codex, Gemini CLI, Cursor or Copilot), opened in the `christina` folder.

---

You are a senior full-stack engineer and motion designer. You are upgrading **Christina**, a voice AI tutor for Indian regional-medium school students, for the ForMa hackathon finale (problem statement PS-ED01). The judges must feel it is the most polished, most alive and most useful entry they see. It must also work flawlessly on localhost and on Vercel.

## 0. Before you write any code

1. Read `AGENTS.md`, then `docs/HACKATHON_BRIEF.md`, `docs/API.md`, `docs/DESIGN_SYSTEM.md`, `docs/FEATURES.md` and `docs/QA_CHECKLIST.md`. They are the spec. Where this prompt and a doc disagree, the doc wins on details and this prompt wins on priorities.
2. Start the app with `node server.mjs`, open http://localhost:3000 and call `GET /api/config`.
   - If `brain` is `null`, there is no API key yet. Stop and ask me to paste my Gemini key into `keys.txt` after `GEMINI_API_KEY=`. **Never ask me to paste a key into chat, and never print `keys.txt` or `.env`.**
3. Run one real lesson end to end (type `Solve 3x + 7 = 22`, give a wrong answer, ask for a hint, solve it). Note anything broken before changing code.
4. Post a plan of at most 10 lines, then start. Don't wait for approval unless an action is destructive.

## 1. API: make the AI layer bulletproof and fast

Work in `lib/core.js`. Every new action is a `case` in `handle()`, so it works on localhost, Vercel and Netlify with no other changes.

- **Health check:** add `GET /api/health`. It pings each configured service with a tiny request and returns `{ services: { gemini: {ok, model, latencyMs, error?}, geminiTts: {...}, sarvam: {...} } }`. No secrets in the output. Show the result as live status dots in the "How Christina works" dialog.
- **Strict JSON:** add Gemini `responseSchema` (structured output) for `tutor`, `teachback`, `report`, `photo` and the new actions, so malformed JSON becomes rare. Keep `parseJSON()` as the fallback.
- **Clear errors:** map provider errors to student-friendly text plus a machine `code`:
  - 429 → "Christina is busy, trying again…" (rotate model and retry once with backoff)
  - 401/403 → "The API key was not accepted. Check keys.txt."
  - timeout → "That took too long. Try again."
  - offline → handled on the client
- **Sentence voice pipeline:** `/api/speak` must accept `{ sentences: [...] }` and return `{ audios: [{ text, audio }] }`, synthesising in parallel (concurrency 3). The client plays them gaplessly (see F1 in FEATURES.md).
- **New actions** from FEATURES.md: `check-work`, `practice`, `visual`, plus a `mood` field on `tutor`. Request and response shapes are fixed in `docs/API.md`. Implement them exactly.
- Keep every payload under 4 MB (the Vercel limit is 4.5 MB). Keep every action under 25 s, using `fetchWithTimeout`.

## 2. Visual system: glass, depth, 3D and motion on every element

Implement `docs/DESIGN_SYSTEM.md` completely. In short:

- **Glass tiers** (`.glass-1` to `.glass-3`): backdrop blur, a light sheen from the top-left, an edge that catches the light, and a pointer-following specular highlight. Dialogs animate the backdrop blur in and out.
- **Depth ladder z0–z4:** a perspective root on the app, `translateZ` plus shadow tokens per layer, and pointer parallax on the background layers (aurora, dot grid, orb) only. The UI itself stays put so it remains easy to use.
- **One orchestrated page-load sequence** (aurora → dot ripple → orb materialises → greeting rises → nav → example cards flip up → dock springs in).
- **Every element in the effect catalog table** gets its enter, hover/focus, press and state-change effect exactly as listed: 3D card flips, magnetic buttons, split-flap stats, handwriting reveal on the solution board, 3D coins for class picking, dialogs that grow out of the button that opened them, a sheet that follows your finger on phones, and so on. Build them as reusable helpers in a new `public/motion.js` (`reveal`, `tilt`, `magnetic`, `flip`, `ripple`, `viewTransition`, `splitAksharas`) plus CSS utility classes. No one-off hacks.
- **View Transitions API:** use it (with a fallback) for hero → lesson. The example card morphs into the problem card, and the big orb morphs into the small orb.
- **Quality tiers:** Auto / Full / Lite, plus an FPS watchdog that drops a tier if fps < 45 for 3 s. Add a "Visual effects" setting.
- **`prefers-reduced-motion`:** all 3D, parallax, flips, confetti and magnetic effects become short opacity fades.
- **Text the student is reading never moves after it has arrived.** Effects happen on entry and on interaction only.

## 3. Features: build in this order and time-box each

Specs and acceptance criteria are in `docs/FEATURES.md`.

- **P0 (must ship):**
  - F1 instant sentence-by-sentence voice
  - F2 karaoke captions (spoken word highlights)
  - F3 hands-free **Call mode** with voice activity detection and barge-in
  - F4 **Scratchpad**: the student writes working by finger or mouse, and Christina checks the step from the drawing
- **P1:**
  - F5 Practice ladder (3 more problems: easier, same, harder)
  - F6 **My Sky**: every solved problem becomes a star in a 3D constellation, with streak days
  - F7 **Show me** visual explainer (animated SVG diagrams from a typed spec)
  - F8 shareable "I solved it" image card
- **P2 (only if time is left):**
  - F9 offline-ready PWA
  - F10 encouragement mode driven by `mood`
  - F11 spoken-language auto-detect
  - F12 recent lessons list

Ship each feature completely (UI, API, errors, mobile, reduced motion) before starting the next. A finished P0 beats a half-done P1.

## 4. Quality bar

Run the whole `docs/QA_CHECKLIST.md` before saying you are done, including:

- 1440×900, 1366×768, 3840×2160 (4K) and 390×844 phone
- keyboard-only use
- reduced motion
- no-key, wrong-key and offline states
- Kannada, Hindi and Tamil lessons
- a clean console and no layout shift

Fix what fails.

## 5. Hard rules

- Plain HTML, CSS and ES modules. No React, Next, Tailwind, bundler or build step. No new npm runtime dependencies. Libraries only from jsDelivr with exact pinned versions, and only if a native API can't do it.
- Never expose, print or commit API keys. `keys.txt` and `.env` stay gitignored.
- Don't remove or break existing features: hint ladder, Your solution, Explain it back, parent voice note, Words to know, language mix, photo reading, free browser voice, passcode, keyboard shortcuts.
- Christina never gives the final answer. Don't weaken `TUTOR_PROMPT`.
- Indian-script text must be animated per akshara using `splitAksharas()` (DESIGN_SYSTEM §1), never per character or plain grapheme, or conjuncts like ಸ್ಕಾ break apart.
- Keep `api/[action].js`, `netlify/functions/api.mjs` and `server.mjs` working. Test that `node server.mjs` still starts with zero installs.
- Make a small commit after each phase or feature, with a clear message.

## 6. Definition of done and hand-off

1. The app is running on localhost: leave `node server.mjs` running and give me the exact URL (for example http://localhost:3000).
2. Every QA checklist item has passed, or is listed as a known issue with the reason.
3. `README.md` is updated: the AI tools table (including any new API use), the new features, and the demo script (2 minutes, showing Call mode, Scratchpad and My Sky).
4. Your final message contains: what changed (grouped by phase), the files touched, how to test each new feature in under 30 seconds, known issues, and the localhost URL.
