# Features: specs and acceptance criteria

Build them in order. A feature is **done** only when it works:
- on desktop and phone
- in Kannada, Hindi and English
- with reduced motion on
- with a friendly message on every failure
- without breaking any existing feature

Request and response shapes for new endpoints are in `docs/API.md`. Visual treatment is in `docs/DESIGN_SYSTEM.md` section 5.

## Already built (do not break)

- **Hint ladder:** nudge, concept, example, next step. Never the answer.
- **Your solution:** correct steps written into the student's own working.
- **Explain it back:** score out of 100.
- **Voice note for parents:** WhatsApp and share.
- **Words to know**, in both languages.
- **Language mix:** pure, mixed, + English.
- **Photo reading** of handwritten problems.
- **Free browser voice** (data saver), **passcode**, **shortcuts** (Space, H, N).
- **Live orb and aurora** moods, onboarding in 11 scripts, **independence stars**, confetti.

---

## P0: must ship

### F1 Instant voice (sentence pipeline)

**Why:** today Christina waits for the whole reply to be synthesised before speaking. Starting fast feels alive.

**How:**
1. Split `speak` into sentences. Use `Intl.Segmenter(lang, {granularity:'sentence'})` (sentence splitting is fine), falling back to splitting on `.?!।॥`.
2. Call `/api/speak` with `{ sentences }`. Start playing sentence 1 the moment it arrives.
3. Schedule the next buffers on the AudioContext timeline (`source.start(nextTime)`) so there are no gaps.
4. Cache each sentence separately in Cache Storage (the key includes the voice provider, language, voice and pace).
5. `stopVoice()` cancels every scheduled source.

**Acceptance:**
- Voice starts ≤ 2.5 s after the reply text appears (broadband).
- Gaps between sentences ≤ 250 ms.
- Stop, a new question and the mic all interrupt speech instantly.
- The device-voice fallback still works.

### F2 Karaoke captions

**Why:** students follow along, read in their own script and learn the words.

**How:**
- Each spoken sentence maps to its words in the on-screen reply.
- Highlight the current word with a cool gradient underline.
- Timing:
  - Premium voice: spread each sentence's audio duration across its words, weighted by akshara count.
  - Device voice: use `SpeechSynthesisUtterance` `boundary` events where the browser sends them.
- The `screen` and `speak` texts differ (maths in `$…$`), so align by matching words and skip KaTeX spans.

**Acceptance:**
- The highlight stays within one word of the voice on a 3-sentence Kannada reply.
- The highlight never moves the text layout.
- It turns off when muted.

### F3 Call mode: "Talk to Christina"

**Why:** the wow moment of the demo. A hands-free voice call with a tutor in your language.

**How:**
- A phone icon next to the mic opens a full-screen call view (DESIGN_SYSTEM §5).
- **Voice activity detection** runs on the mic analyser's RMS:
  - Speech starts after > threshold for 150 ms.
  - Speech ends after < threshold for 1200 ms.
  - Calibrate the threshold from 500 ms of room noise when the call opens.
- On speech end, send the recording through `/api/transcribe`, then `askTutor`, then speak the reply, then listen again automatically.
- **Barge-in:** while Christina speaks, if the student speaks above threshold × 1.8 for 300 ms, stop her voice and start listening.
- Keep echo cancellation on. Free-browser-voice mode uses Web Speech `continuous` recognition instead.
- Live captions show what the student is saying and Christina's karaoke text.
- The end-call button, or Escape, closes the call. Hint level, the solution board and the ladder keep updating behind the call.

**Acceptance:**
- Three full back-and-forth turns without touching the screen, on laptop and phone.
- Barge-in works.
- No feedback loop (Christina never transcribes herself).
- Ending the call returns to the lesson with every reply in the log.

### F4 Scratchpad: "Show your working"

**Why:** the problem statement asks for handwritten problems. This goes further: Christina checks the student's handwritten working, step by step.

**How:**
- A pencil chip opens a glass-3 bottom sheet holding a canvas.
- Pointer Events with pressure give variable stroke width and smoothing (quadratic curves through midpoints).
- Tools: pen (2 colours), eraser, undo (keep a stroke list), clear.
- Use `touch-action: none` on the canvas. Ignore `pointerType === 'touch'` when a pen is active (palm rejection).
- **Check my step** exports a PNG (white ink on transparent becomes dark ink on white for the model, max 1200px) and calls `/api/check-work`.
- The verdict appears as a normal Christina message with voice. When the step is correct, `board` adds a line to Your solution with the handwriting-wipe effect.

**Acceptance:**
- A handwritten `3x = 15` (finger on phone, mouse on desktop) is read and judged correctly.
- A wrong step gets a `mistake` pill and no answer.
- An unreadable scribble gets "write a bit bigger".

---

## P1: should ship

### F5 Practice ladder

- After a problem is solved, show **Practice 3 more** on the solved card. It calls `/api/practice` and returns 3 cards (easier, same, harder) that flip in.
- Picking one starts a fresh lesson. Keep the language and grade.
- A practice streak counter appears in the stats.

**Acceptance:**
- The three problems use the same concept, are in the chosen language and contain no answers.
- They open as normal lessons.

### F6 My Sky: the constellation of everything you solved

- Every solved problem adds a star in `localStorage` under `christina.sky`: `{id, problem, subject, stars, hints, teachScore, lang, date}`.
- A "My Sky" button in the nav opens a full-screen 3D starfield (WebGL or a canvas-2D 3D projection):
  - Stars sit on a slowly rotating sphere you can drag to orbit.
  - Size shows independence (1–3 stars), colour shows subject, and lines join stars from the same day.
  - Tap a star for its problem, date and stars. Shows streak days and the total solved.
- When a problem is solved, a star flies from the solved card into the sky icon.

**Acceptance:**
- It survives reload.
- It stays at 60 fps with 200 stars on desktop.
- The empty state invites the student to solve their first problem.

### F7 Show me: visual explainer

- A chip in the lesson calls `/api/visual`. Render the typed spec as an animated SVG inside a Christina message.
- Spec types: `number_line`, `bar_model`, `fraction`, `graph` (computed on the client from `a`, `b`, `c`), `triangle`, `none`.
- Lines draw themselves, then labels fade in (DESIGN_SYSTEM §5).
- **Never** render model-generated SVG or code. Draw only from the whitelist.

**Acceptance:**
- The 3 example problems each produce a sensible diagram within 3 s.
- Labels are in the chosen language.
- `none` shows the caption only.

### F8 Share card: "I solved it myself"

- Draw a 1080×1350 PNG on a canvas containing:
  - an orb-gradient background with the kolam
  - the greeting and "I solved it myself" in the chosen language
  - the stars and the problem as plain text
  - the Christina logo
- Share it with `navigator.share({files})`, or download it.
- The button sits on the solved card and in My Sky.

**Acceptance:**
- Indian scripts render correctly (wait for `document.fonts.ready` before drawing).
- The card shares on Android and downloads on desktop.

---

## P2: only if P0 and P1 are done

### F9 Offline-ready PWA

- A service worker caches the app shell, fonts and KaTeX.
- When offline, the orb dims and Christina says she needs the internet to think. Cached voice still replays.
- Register the worker only on https or localhost.

### F10 Encouragement mode

- Driven by the `mood` field from `tutor`. When it is `frustrated`, or after 3 wrong attempts:
  - the orb turns a soft pink and slows
  - the voice pace drops to 0.9
  - the next hint drops one rung lower than normal
  - Christina says one short line of encouragement in the student's language
- `confident` speeds things up and suggests trying without hints.

### F11 Spoken-language auto-detect

- First, make `/api/transcribe` return `language`: pass through Sarvam's `language_code`. For the Gemini path, add a `language` field to `LISTEN_PROMPT`'s JSON.
- If that differs from the selected language, show a chip such as "Switch to हिन्दी?".

### F12 Recent lessons

- The last 10 lessons (problem, language, date, solved?) are kept in `localStorage`. A list in the panel can reopen one (resumes history and board).

---

## Ideas parked (don't build now)

- Teacher dashboard
- Board or syllabus alignment (CBSE, state boards)
- Multiplayer doubt rooms
- Video explanations

Mention these in the pitch as the roadmap.
