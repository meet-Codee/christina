# Hand-off: continue Christina in another coding agent (Codex, Gemini CLI, Cursor…)

Read `AGENTS.md` first (Codex loads it automatically). This file says where the work stands and what to do next.

## Where things stand (31 Oct 2026)

Christina 2.0 was rebuilt from the docs in this repo and every phase of `docs/MASTER_PROMPT.md` is done:

| Phase | Status | Main files |
|---|---|---|
| 1. API | Done: `/api/health`, structured output (`responseSchema`), friendly error codes, model rotation with cool-down, batch `/api/speak`, `check-work`, `practice`, `visual`, `mood` | `lib/core.js`, `server.mjs`, `api/[action].js`, `netlify/functions/api.mjs` |
| 2. Visual system | Done: glass tiers, depth ladder, page-load sequence, View Transitions, quality tiers + FPS watchdog, reduced motion, per-akshara text animation | `public/styles.css`, `public/motion.js`, `public/orb.js`, `public/aurora.js` |
| 3. P0 | Done: F1 sentence voice, F2 karaoke, F3 Call mode, F4 Scratchpad | `public/voice.js`, `public/mic.js`, `public/call.js`, `public/scratchpad.js` |
| 3. P1 | Done: F5 practice, F6 My Sky, F7 Show me, F8 share card | `public/app.js`, `public/sky.js`, `public/visual.js`, `public/share.js` |
| 3. P2 | Done: F9 PWA, F10 encouragement, F11 language auto-detect, F12 recent lessons | `public/sw.js`, `public/app.js` |
| 4. QA | Done in headless Chromium against a stand-in for Gemini. Results: `docs/QA_REPORT.md` | |
| 6. Docs | README (AI tools table, features, 2-minute demo), `AGENTS.md` file map, `docs/API.md` | |

## What is left (do these next, in order)

1. **Test with the real key.** Put `GEMINI_API_KEY=` in `keys.txt` (never print it), run `node server.mjs`, open http://localhost:3000, tap ⓘ (all dots should be green), then run one lesson in Kannada, Hindi and Tamil: type `Solve 3x + 7 = 22`, give a wrong answer, press H, solve it. Check that Christina never states the final answer, that Pure / Mixed / + English change the wording, and that voice in and out works in each language. If a model name returns 404, set `GEMINI_MODELS` / `GEMINI_TTS_MODELS` to current names.
2. **Tune prompts only if needed** (`TUTOR_PROMPT` and friends in `lib/core.js`). Never weaken the "never give the final answer" rule.
3. **Push to GitHub** (a new repo; `keys.txt` and `.env` are gitignored) and **deploy on Vercel**: Framework "Other", no build command, add `GEMINI_API_KEY` (and `SARVAM_API_KEY`), deploy, set `APP_PASSCODE` before sharing the link.
4. **Phone smoke test** on the https link: mic permission, one lesson, one photo, one Call mode turn, one Scratchpad step.
5. The remaining ⏳ items in `docs/QA_REPORT.md`: Windows `start-christina.bat`, a screen reader pass, free browser voice, frame rate on a mid-range Android phone.
6. **Demo prep** (README "Hackathon checklist"): rehearse the demo problems once so their voice is cached, record a backup video, post on LinkedIn.

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
