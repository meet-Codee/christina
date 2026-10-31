# Hand-off: continue Christina in another coding agent (Codex, Gemini CLI, Cursor…)

Read `AGENTS.md` first (Codex loads it automatically). This file says where the work stands and what to do next.

## Where things stand (31 Oct 2026)

Christina 2.0 was rebuilt from the docs in this repo and every phase of `docs/MASTER_PROMPT.md` is done:

| Phase | Status | Main files |
|---|---|---|
| 1. API & Pedagogy | Done: `/api/health`, structured output (`responseSchema`), timeout + busy model cool-down (`gemini-3.5-flash-lite` primary), 3-beat progressive visuals (`ensureBeatVisuals`), Basics / no-question teaching mode, 4 language modes (`pure`, `mixed`, `english`, `bilingual`) | `lib/core.js`, `server.mjs`, `api/[action].js`, `netlify/functions/api.mjs` |
| 2. Visual system & 4K SVG | Done: 4K SVG `<defs>` gradients/glows, balance scale weight blocks, pulsing `?` unknown badges, science schematics (`circuit`, `light_ray`, `food_chain`, `cell`), glass tiers, per-akshara text animation | `public/visual.js`, `public/styles.css`, `public/motion.js`, `public/orb.js`, `public/aurora.js` |
| 3. Setup, Modes & Explain Board | Done: 3-step first-screen setup (`#onboard`), summary pill (`ಕನ್ನಡ · Class 8 · ಓದಲು English, ಕೇಳಲು ಕನ್ನಡ`), 4 language modes, interactive Explain Board (`public/explain.js`) with synced karaoke in all 4 modes, Basics chip, method choice pills | `public/explain.js`, `public/i18n.js`, `public/index.html`, `public/app.js` |
| 4. P0–P2 Features | Done: F1 sentence voice, F2 karaoke, F3 Call mode, F4 Scratchpad, F5 practice, F6 My Sky, F7 Show me, F8 share card, F9 PWA, F10 encouragement, F11 language auto-detect, F12 recent lessons | `public/voice.js`, `public/mic.js`, `public/call.js`, `public/scratchpad.js`, `public/sky.js`, `public/share.js`, `public/sw.js` |
| 5. Real-Key QA | Done: Verified live against real Gemini API + Gemini TTS in Kannada (`kn-IN`), Hindi (`hi-IN`), and Tamil (`ta-IN`) across all 4 language modes and Basics mode, plus 6/6 unit tests (`node --test tools/lesson.test.mjs`). Results: `docs/QA_REPORT.md` | `tools/lesson.test.mjs`, `docs/QA_REPORT.md` |

## What is left (for deployment & demo)

1. ✅ **Tested with the real key** (`http://localhost:3000`): `GET /api/config` and `GET /api/health` are green (`gemini-3.5-flash-lite` + `gemini-3.8-flash-tts`), and full lessons (`Solve 3x + 7 = 22`: start → wrong attempt → hint → solve) + Basics mode + all 4 language modes (`pure`, `mixed`, `english`, `bilingual`) + TTS audio have been verified in Kannada, Hindi, and Tamil.
2. ✅ **Prompts & visual pedagogy tuned** (`TUTOR_PROMPT`, `ensureBeatVisuals`, `scrubSolvedAnswer` in `lib/core.js`).
3. **Push to GitHub** (a new repo; `keys.txt` and `.env` are gitignored) and **deploy on Vercel**: Framework "Other", no build command, add `GEMINI_API_KEY` (and `SARVAM_API_KEY`), deploy, set `APP_PASSCODE` before sharing the link.
4. **Phone smoke test** on the https link: mic permission, one lesson, one photo, one Call mode turn, one Scratchpad step.
5. **Demo prep** (README "Hackathon checklist"): rehearse the demo problems once so their voice is cached, record a backup video, post on LinkedIn.

## How to test without spending quota

```bash
node tools/mock-gemini.mjs
```
Then in `keys.txt`: `GEMINI_API_KEY=test` and `GEMINI_BASE_URL=http://127.0.0.1:4599`, and refresh. The stand-in answers like Gemini (tutor replies in Kannada, Hindi, Tamil and English, TTS audio, health, photo, check-work, practice, visual). Model names starting with `busy-` return 429, `missing-` return 404, `slow-` hang 30 s, and the key `bad` is rejected, so you can test every error path. **Remove those two lines before using your real key.**

## Rules that matter most (full list in AGENTS.md)

- Plain HTML, CSS and ES modules. No framework, bundler, build step or npm runtime dependency. The server uses Node 20+ built-ins only.
- Every AI call goes through `handle()` in `lib/core.js`, so localhost, Vercel and Netlify keep working.
- Never print, log or commit `keys.txt` or `.env`.
- Indian-script letter animation uses `splitAksharas()` only.
- Respect `prefers-reduced-motion` and the Lite tier. Animate only transform, opacity, filter, clip-path and background-position.
- Small commits, one change each. Re-run the relevant `docs/QA_CHECKLIST.md` items after every change.

## Gotchas found during the build

- The single orb canvas moves between the hero, the lesson header and the call view (`moveOrb()` in `app.js`), so there are only ever two WebGL contexts. Don't create a second orb.
- `.log` children must not shrink (`.log > * { flex-shrink: 0 }`), or cards with `overflow: hidden` collapse.
- The phone progress sheet and its scrim both live inside `.app` (same stacking context). Keep them there.
- Dialogs animate out before `close()`; `openDialog()` handles being reopened mid-close. Use `openDialog` / `closeDialog`, not `showModal()` directly.
- Headless Chromium uses a software GPU (about 12 fps with the orb), so the FPS watchdog drops it to Lite. That is expected and not a bug.
