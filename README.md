# Christina

**Speak, snap or type your doubt. Christina guides you to the answer in your own language, one hint at a time.**

A voice tutor for students in regional-medium schools (classes 5–12), built for **ForMa 24h Hackathon · PS-ED01: Regional Language AI Tutor & Homework Helper**.

---

## What it does

### The three key features from PS-ED01

| Required feature | How Christina does it |
|---|---|
| Voice and audio explanations in native regional languages | 11 languages: Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia and English. Students speak their doubt and Christina answers out loud. |
| Step-by-step guided hints instead of instant answers | A visible **four-rung hint ladder**: Nudge, Concept, a similar Example, then only the Next step. Christina never states the final answer. It checks every attempt and names the misconception when one is wrong. |
| Photo upload of handwritten problems | Snap the notebook page. Christina reads the handwriting in any script and starts the walkthrough. |

### What makes it different

**Talk, write and see**
- **Call mode: "Talk to Christina".** A hands-free voice call. She hears when you start and stop talking (voice activity detection), answers, and listens again. Talk over her to interrupt, like a real tutor. Live captions highlight every word as she says it.
- **Scratchpad: "Show your working".** Write your next step with a finger, pen or mouse. Christina reads your handwriting and checks only that step. Right steps go into your solution; a wrong one gets the mistake named, never the answer.
- **Show me.** A diagram that draws itself for the current step: number line, bar model, fraction circle, graph or triangle, labelled in your language.

**She feels alive**
- **Instant voice with karaoke captions.** Replies are spoken sentence by sentence, so she starts talking in about a second, and the word she is saying glows on screen.
- **A living orb.** A real-time 3D orb rendered on the GPU, inside a glowing kolam (the dot-and-line drawing made at Indian doorsteps). It ripples with her voice, burns saffron while you speak, churns while she thinks, and turns soft pink when you're stuck.
- **Encouragement mode.** If you say "I give up" (in any language) or miss three times, she slows down, softens her voice and drops to a gentler hint.

**You own the learning**
- **Your solution.** Every step you get right is written into your own worked answer, line by line.
- **Explain it back.** After solving, you become the teacher and explain the method by voice. Christina scores your understanding out of 100 (the Feynman technique).
- **Practice ladder.** Three more problems on the same idea: easier, the same, and harder.
- **My Sky.** Every problem you solve becomes a star in your own 3D constellation. Stars from the same day join up, bigger stars mean fewer hints, and your streak shows at the top.
- **"I solved it myself" card.** A shareable image in your script, with your stars.

**Made for Indian classrooms and homes**
- **Language mix.** *Pure* (textbook regional terms), *Mixed* (how students actually talk), or *+ English* (every term in both languages, for English-medium exams later).
- **Words to know.** Every technical term collects as a flip card in both languages, with a button to hear it.
- **Voice note for parents.** A short spoken summary in the family's language, shareable on WhatsApp, for parents who may not read.
- **Speaks your language back.** Speak Hindi while Kannada is selected and she offers to switch.
- **Works offline-ready.** Installable on Android ("Add to Home screen"). Without internet she says so kindly, and every reply she has already spoken still replays.
- **Recent lessons.** Pick up any of your last 10 lessons where you left off.
- **Keyboard shortcuts.** Hold **Space** to talk, **H** for a hint, **N** for a new problem, **/** to type, **Esc** to stop.
- **Fast on cheap phones.** Visual effects drop to Lite automatically if the phone gets slow, and everything respects "reduce motion".

---

## AI tools used

| Job | Main tool | Backup |
|---|---|---|
| Tutor brain (hints, checking attempts, mood) | **Google Gemini 3.x Flash** with structured JSON output (rotates through 3 models) | **Sarvam-105B** |
| Reading homework photos | **Gemini vision** | none |
| Checking handwritten Scratchpad steps | **Gemini vision** (`/api/check-work`) | none |
| Practice problems and "Show me" diagram specs | **Gemini** with structured output (`/api/practice`, `/api/visual`) | **Sarvam-105B** |
| Speech to text (+ which language you spoke) | **Sarvam Saaras v3** (if a Sarvam key is set) | **Gemini audio understanding** |
| Text to speech, sentence by sentence | **Sarvam Bulbul v3** (if a Sarvam key is set) | **Gemini TTS**, then the device's own voice |
| Live status of every service | `/api/health` pings each one with a tiny request | |

**It runs on one free Gemini key.** Thinking, reading photos and handwriting, listening and speaking all work with just `GEMINI_API_KEY`. Adding a Sarvam key upgrades listening and speaking to Sarvam's Indian-language speech models, with Gemini kept as backup.

**Built to never dead-end a student.** Every AI call has a time limit, model rotation (a rate-limited model is skipped for 45 s), and a message in plain words: "Christina is busy, trying again…", "The API key was not accepted. Check keys.txt.", "That took too long. Try again."

---

## Run it on your laptop (2 minutes)

Needs **Node.js 20 or newer**. There is nothing to `npm install`.

**On Windows:** double-click `start-christina.bat`. It opens `keys.txt` for your key and opens Christina in your browser. Keep the black window open while you use it.

**Anywhere:**
1. Get a **free Gemini key** at <https://aistudio.google.com/apikey>.
2. Paste it into `keys.txt` after `GEMINI_API_KEY=` and save. If `keys.txt` isn't there yet, run `node server.mjs` once and it creates it (or copy `keys.example.txt`). A `.env` file works too. Both are gitignored and re-read on every request, so there's no restart.
   Optional: add `SARVAM_API_KEY=` from <https://dashboard.sarvam.ai> for Sarvam's voices.
3. Run:
   ```
   node server.mjs
   ```
   Then open **http://localhost:3000** in Chrome.

---

## Deploy on Vercel (recommended, free)

**Option A: from GitHub (easiest)**
1. Push this folder to a new GitHub repository. `.env` is ignored, so your keys stay private.
2. Go to <https://vercel.com/new> and import the repository.
3. **Framework preset:** Other. Leave the build command empty.
4. Open **Environment Variables** and add `GEMINI_API_KEY`, plus `SARVAM_API_KEY` if you have one.
5. Click **Deploy**. You get a link like `christina-yourteam.vercel.app`.

**Option B: from the terminal**
```
npm i -g vercel
vercel                                  # first deploy, answer the prompts
vercel env add GEMINI_API_KEY           # paste the key, choose Production
vercel --prod
```

After changing an environment variable, redeploy so it takes effect.

## Deploy on Netlify (alternative)

1. Push to GitHub, then go to <https://app.netlify.com/start> and import the repository. `netlify.toml` already sets everything.
2. Open **Site configuration**, then **Environment variables**, and add `GEMINI_API_KEY` (and `SARVAM_API_KEY` if you have it).
3. Trigger a redeploy.

Netlify's free plan gives functions less time per request than Vercel's, so Vercel is safer for slower AI replies.

### Before you post the link publicly

Set `APP_PASSCODE=something` in the environment variables. Anyone opening the link is asked for it once, so strangers can't use up your free quota. Share the passcode with the judges.

---

## Keeping it free

- Gemini's free tier limits each model separately, so Christina rotates through `gemini-3.8-flash`, `gemini-3.6-flash` and `gemini-3.5-flash-lite` automatically. Voice rotates through three Gemini TTS models the same way.
- Every spoken line is cached in the browser. **Rehearse your demo problems once before going live** and replaying them on stage costs nothing.
- While building, turn on **Free browser voice** in settings to save quota. Switch it off to demo the real voice.
- If Google renames a model, set `GEMINI_MODELS` or `GEMINI_TTS_MODELS` to current names from <https://ai.google.dev/gemini-api/docs/models>.

---

## Hackathon checklist

**1. AI tools used:** see the table above. The app also shows this live: tap **ⓘ** for "How Christina works", which pings every service and shows a live status dot and its response time.

**2. Relevance to the problem:** vernacular-medium students get a 24/7 tutor that speaks their language, reads their notebook, and makes them think instead of copying answers. Every PS-ED01 feature is covered, plus five beyond it.

**3. Video session: a 2-minute demo script**
1. *(10 s)* "Most Indian students study in their own regional language, and most have no one at home to ask at 9 pm." Open the app: the orb materialises from light and the greeting rises letter by letter.
2. *(10 s)* Pick **ಕನ್ನಡ**. Point at the orb: "This is Christina's voice."
3. *(35 s)* Tap the green phone: **Call mode**. Say the problem out loud ("3x plus 7 equals 22"). Christina asks a guiding question in Kannada while the orb ripples and each spoken word lights up in the caption. Give a **wrong** answer: she names the mistake without giving the answer. Start talking while she speaks: she stops and listens (barge-in). End the call: every reply is in the log and the hint ladder has moved.
4. *(25 s)* Tap **ಲೆಕ್ಕ ಬರೆ** (Scratchpad) and write `3x = 15` with your finger or mouse. Tap **Check my step**: a light pulse flies to the orb, she says it's right, and the line is handwritten into **Your solution** with a check mark.
5. *(15 s)* Type `x = 5`. Confetti, stars, and a star flies up into the sky icon. Show **Words to know**: flip ಸಮೀಕರಣ to *equation*.
6. *(15 s)* Open **My Sky** (star icon): drag the 3D constellation of everything solved, tap a star, show the streak. Tap **Share** for the "I solved it myself" card.
7. *(10 s)* Back in the lesson, tap **Voice note for parents**, let it play, and show "Send on WhatsApp".

Record a backup video of this run before the live session, in case the internet misbehaves.

**4. LinkedIn post (replace the tags with the organisers' real handles)**

> We built **Christina** in 24 hours at the ForMa Online Hackathon (PS-ED01) 🎓
>
> Students in regional-medium schools can speak their doubt or snap their homework, and Christina guides them step by step in Kannada, Hindi, Tamil and 8 more languages. She never just gives the answer: a hint ladder makes students think, their own correct steps build their worked solution, and "Explain it back" checks they really understood. Parents get a voice note in their own language.
>
> Built with Google Gemini and Sarvam AI, deployed on Vercel.
>
> 🔗 Try it: <your-link>
> Thanks @ForMa @AKSHATH for the challenge! #ForMaHackathon #EdTech #AIforBharat #IndianLanguages

**5. Simple:** one screen, three ways to ask (mic, camera, keyboard), no sign-up.

**6. Deploy:** Vercel or Netlify, as above.

---

## Project structure

```
public/                 the website (no build step, plain ES modules)
  index.html            page structure, dialogs, icon sprite
  styles.css            tokens, glass tiers, depth ladder, every component, quality tiers, reduced motion
  app.js                lesson flow: hint ladder, solution board, teach-back, parent note, photos, practice, Show me, shortcuts
  motion.js             the motion language: reveal, flip, tilt, magnetic, ripple, View Transitions, splitAksharas, tiers
  voice.js              sentence-by-sentence voice, cache, gapless playback, karaoke timing, device fallback
  mic.js                recording, voice activity detection, Web Speech
  call.js               Call mode
  scratchpad.js         Scratchpad
  sky.js                My Sky
  visual.js             Show me diagrams (whitelisted SVG)
  share.js              "I solved it myself" card
  orb.js                the GPU-rendered voice orb and kolam halo
  aurora.js             the GPU aurora background
  fx.js                 maths rendering, streaming words, confetti, sparkles
  i18n.js               11 languages and interface words in each script
  sw.js, manifest.webmanifest, icon*  offline-ready PWA
lib/core.js             every AI call: prompts, schemas, model rotation, voice and speech fallbacks, health
api/[action].js         Vercel function
netlify/functions/api.mjs   Netlify function
server.mjs              local server, no dependencies
start-christina.bat     Windows double-click launcher
keys.txt                your API keys (gitignored, created on first run, never commit)
keys.example.txt        what keys.txt looks like
AGENTS.md               rules for AI coding agents (CLAUDE.md and GEMINI.md point to it)
docs/                   master prompt, API reference, design system, feature specs, QA checklist, references
```

### Try each new feature in 30 seconds

| Feature | How |
|---|---|
| Instant voice + karaoke | Tap an example card. She starts speaking in about a second and the spoken word glows. Tap **Listen again**: it replays from cache, no network. |
| Call mode | Tap the green phone in the dock and just talk. Talk over her to interrupt. **Esc** ends it. |
| Scratchpad | In a lesson tap **Show working**, write your next step, tap **Check my step**. |
| Practice ladder | Solve a problem, then tap **Practice 3 more** on the solved card. |
| My Sky | Tap the star in the top bar. Drag to turn it, tap a star. |
| Show me | In a lesson tap **Show me**. |
| Share card | Tap **I solved it myself** on the solved card (or Share in My Sky). |
| Encouragement | Type "I give up". The orb turns soft pink and the next hint is gentler. |
| Language auto-detect | With English selected, speak Hindi: a "Switch to हिन्दी?" chip appears. |
| Live service status | Tap **ⓘ**. |
| Quality tiers | **⚙ → Visual effects: Auto / Full / Lite.** |

### Working on Christina with an AI coding agent

Open this folder in Claude Code, Codex, Gemini CLI, Cursor or Copilot. The agent reads `AGENTS.md` automatically. Paste the prompt from `docs/MASTER_PROMPT.md` to run the full upgrade.

To change how Christina teaches, edit `TUTOR_PROMPT` in `lib/core.js`.

## Troubleshooting

| You see | Fix |
|---|---|
| "The server has no AI key yet" | Add `GEMINI_API_KEY` in your host's environment variables, then redeploy. |
| "Christina could not answer" with model names | Usually a free-tier rate limit or a wrong key. Wait a minute or check the key. Adding `SARVAM_API_KEY` gives a backup brain. |
| The mic does nothing | Allow microphone permission. The site must be on `https://` or `localhost`. |
| The voice sounds robotic | "Free browser voice" is on, or no voice service is reachable. Turn it off in settings. |
| A Gemini model name stops working | Set `GEMINI_MODELS` or `GEMINI_TTS_MODELS` to current names from Google's models page. |
| The orb looks flat | The device has WebGL turned off, so a simpler animated orb is shown. Everything else works. |
| "Christina is busy, trying again…" | A free-tier rate limit. She rotates to another model automatically; if it keeps happening, wait a minute. |
| Call mode keeps listening to the room | Use headphones, or move somewhere quieter: the call measures the room's noise for half a second when it opens. |
| The phone feels slow | **⚙ → Visual effects → Lite.** Auto switches to Lite by itself if the frame rate stays low. |
