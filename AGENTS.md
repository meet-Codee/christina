# AGENTS.md: how to work on Christina

Read this file first. Then read the docs in `docs/` that your task touches. **Continuing the work? Read `docs/HANDOFF.md` next: it says where things stand and what to do now.**

## What Christina is

Christina is a voice tutor for Indian school students (classes 5–12) who study in regional-language schools. The student speaks, snaps or types a maths or science doubt. Christina replies out loud in their language and guides them with a four-rung hint ladder. She **never gives the final answer**.

It was built for the ForMa 24h hackathon, problem statement PS-ED01. See `docs/HACKATHON_BRIEF.md`.

## Stack (keep it this way)

- **No build step, no framework.** The browser loads plain ES modules from `public/` exactly as they are on disk.
- **Backend with zero dependencies.** It uses Node 20+ built-ins only (`fetch`, `FormData`, `Blob`, `Buffer`).
- **One backend, three hosts.** All AI logic lives in `lib/core.js` → `handle(action, body, headers)`, and three thin wrappers call it:
  - `server.mjs`: local server (`node server.mjs`)
  - `api/[action].js`: Vercel function
  - `netlify/functions/api.mjs`: Netlify function (path `/api/:action`)

## File map

| File | What it does |
|---|---|
| `public/index.html` | All markup: nav, stage (orb + hero + problem card), log, dock, progress panel, dialogs, SVG icon sprite |
| `public/styles.css` | Design tokens (`:root`), glass, layout, components, responsive rules, reduced motion |
| `public/app.js` | App state `S`, `api()` client (busy retry, passcode prompt, offline), conversation (`askTutor`, `handleReply`, `addTutor` + karaoke mapping, `addStudent`), push-to-talk, teach-back, parent note, photo reading, practice, Show me, encouragement mode (F10), language auto-detect chip (F11), recent lessons (F12), progress panel and phone sheet, onboarding, dialogs, settings, keyboard shortcuts, the page-load sequence |
| `public/orb.js` | `Orb` class: WebGL liquid orb plus 2D kolam halo (redraws its line on every state change, intro particles). `setState('idle'\|'speaking'\|'listening'\|'teach'\|'thinking'\|'celebrate'\|'encourage'\|'offline')`, `attach(analyserNode)`, `energy` (0–1), `paused`, `intro()`, `pulse()`. One canvas moves between hero, lesson and call |
| `public/aurora.js` | `Aurora` class: WebGL background. `setMood(state)`, `follow(source with .energy)` |
| `public/fx.js` | `esc`, `renderMath` (KaTeX, with a plain-text fallback), `rich` (maths, bold, one `<span class="w">` per word for streaming and karaoke), `stream`, `countUp`, 3D paper `confetti`, `sparkle`, `dust` |
| `public/i18n.js` | `LANGS` (11 languages, native UI words), `RUNGS`, `MIXES`, `EXAMPLES` |
| `public/motion.js` | The motion language as helpers: `reveal`, `flip`, `pop`, `riseText`/`swapText` (per akshara), `splitAksharas`, `viewTransition`, `growFrom`/`shrinkTo` (dialogs), `ripple`, `splitFlap`, `flipList`, `flyTo`, pointer FX (tilt, magnetic, specular, cursor glow), the animated focus ring, quality tiers and the FPS watchdog |
| `public/voice.js` | `Voice`: F1 sentence pipeline (`sentences()`, first sentence fetched alone, the rest in parallel), per-sentence Cache Storage, gapless scheduling, F2 karaoke timing, device-voice fallback, `buffersToWav()` |
| `public/mic.js` | `Mic` (getUserMedia, level, MediaRecorder ≤ 30 s), `VAD` (calibration, start/end detection, barge-in mode), `recognizer()` (Web Speech) |
| `public/call.js` | F3 Call mode: hands-free loop, barge-in, live captions |
| `public/scratchpad.js` | F4 Scratchpad: pressure strokes, palm rejection, undo/eraser, PNG export → `/api/check-work` |
| `public/sky.js` | F6 My Sky: `loadSky`, `addStar`, `streakDays`, the 3D constellation view |
| `public/visual.js` | F7 Show me: `renderVisual(spec)` draws whitelisted diagram types as animated SVG |
| `public/share.js` | F8 share card: `drawCard`, `shareSolved` |
| `public/sw.js`, `manifest.webmanifest`, `icon*.{svg,png}` | F9 offline-ready PWA (shell, fonts and KaTeX cached; `/api/*` never cached) |
| `lib/core.js` | Prompts, Gemini and Sarvam calls, model rotation, speech-to-text, text-to-speech (PCM→WAV), every `/api/*` action |
| `server.mjs` | Static files plus `/api/*`. Re-reads `keys.txt` and `.env` on every API request. Binds `127.0.0.1`, port 3000 (tries 3001–3010 if busy). `--open` opens the browser |
| `start-christina.bat` | Windows double-click launcher (opens `keys.txt` if no key yet) |
| `keys.txt`, `.env` | Secrets. Both are gitignored. **Never read them out, print them or commit them** |

## Commands

```bash
node server.mjs            # http://localhost:3000
node server.mjs --open     # also opens the browser
PORT=4000 node server.mjs  # another port
```
On Windows you can double-click `start-christina.bat` instead. There's nothing to install.

## Hard rules

1. **Secrets stay on the server.** API keys never reach browser code, logs, git, screenshots or chat. Read them only via `process.env` inside `lib/core.js`. Never `cat` or print `keys.txt` or `.env`.
2. **Every AI feature goes through `handle()`.** A new feature means a new `case` in `handle()` plus a function in `lib/core.js`. Action names are a single path segment (`/api/check-work`, never `/api/check/work`), because of the Vercel and Netlify routing.
3. **Never dead-end the student.** Every AI call needs model rotation or a fallback, a timeout, and an error message that tells the student what to do next. The UI must recover from any failed call.
4. **Never weaken the pedagogy.** Christina must not state the final answer. Keep the hint ladder (1 nudge, 2 concept, 3 similar example, 4 next step only), the attempt checking, and `solved` detection. New prompts follow the same rules.
5. **Language correctness.** Generated text is in the chosen language and its native script (see `LANGS` in `lib/core.js`). Every element that shows Indian-language text gets a `lang` attribute (`L().tag`). When animating Indian text letter by letter, use `splitAksharas()` from `docs/DESIGN_SYSTEM.md` §1. It uses `Intl.Segmenter` and then glues virama clusters together. Plain grapheme splitting **still breaks conjuncts** in Chromium (ಸ್ಕಾ becomes ಸ್ + ಕಾ), and per-character splitting is worse. When in doubt, animate per word.
6. **Payload limits.** Vercel rejects request or response bodies over **4.5 MB**. Shrink images on the client (already done, 1600 px JPEG), keep recordings ≤ 30 s, and return audio per sentence rather than as one huge clip.
7. **Front-end libraries.** Prefer native CSS and web APIs. If a library is truly needed, load it from `https://cdn.jsdelivr.net/npm/<pkg>@<exact-version>/…` with an exact pinned version. Do not add npm runtime dependencies or a bundler.
8. **Motion follows `docs/DESIGN_SYSTEM.md`.** Respect `prefers-reduced-motion` and the quality tiers. Animate only `transform`, `opacity`, `filter`, `clip-path` and `background-position`. Target 60 fps on a mid-range Android phone.
9. **Accessibility.** Everything works by keyboard, focus is visible, replies are announced (`aria-live`), and text contrast is ≥ 4.5:1.
10. **Keep it working.** After every change, reload http://localhost:3000 and run the relevant checks in `docs/QA_CHECKLIST.md`. Make small commits, one feature each. Don't rename ids or classes that `app.js` uses without updating every reference.

## How a reply flows

```
mic → MediaRecorder (webm) → POST /api/transcribe → text
camera → shrinkPhoto() → POST /api/photo → problem text
text → POST /api/tutor {problem, message, history, hint_level, language, grade, mix}
     → Gemini (rotates models) → Sarvam chat fallback → JSON {screen, speak, hint_level, solved, mistake, board, terms}
     → addTutor() streams `screen` words, voice.say(`speak`) → sentences → POST /api/speak {sentences} (each cached in Cache Storage)
     → AudioContext timeline (gapless) → Orb.attach(analyser), karaoke highlight on the spoken word
```

The full contract is in `docs/API.md`.

## Docs

| Doc | Read it when |
|---|---|
| `docs/HANDOFF.md` | You are picking up the work: current state and next steps |
| `docs/QA_REPORT.md` | You want the latest test results and what still needs checking |
| `docs/MASTER_PROMPT.md` | You were given the big upgrade task (already completed) |
| `docs/HACKATHON_BRIEF.md` | You need the problem statement, judging checklist or deadline |
| `docs/API.md` | You touch `lib/core.js`, endpoints, keys or models |
| `docs/DESIGN_SYSTEM.md` | You touch anything visual or animated |
| `docs/FEATURES.md` | You build a new feature (specs plus acceptance criteria) |
| `docs/QA_CHECKLIST.md` | Before you say anything is done |
| `docs/REFERENCES.md` | You need official docs for Gemini, Sarvam, Vercel or web APIs |
