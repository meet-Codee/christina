# QA report (Christina 2.0)

Run on 31 October 2026 against `docs/QA_CHECKLIST.md`, with both headless Chromium (Playwright) and live real-key verification on Windows against `gemini-3.5-flash-lite` / `gemini-3.6-flash` / `gemini-3.8-flash` and `gemini-3.8-flash-tts`.

✅ passed · ⏳ needs physical phone or external deploy · ⚠️ known issue

## Setup
- ✅ `node server.mjs` starts with zero installs on `http://localhost:3000` and prints the URL. It creates `keys.txt` from a template on first run.
- ✅ `start-christina.bat` verified on Windows (checks `node`, creates `keys.txt` from `keys.example.txt` if missing, checks `GEMINI_API_KEY`/`SARVAM_API_KEY`, and runs `node server.mjs --open`).
- ✅ `GET /api/config` shows brain (`Gemini 3.5 Flash Lite`), eyes, ears and voice (`Gemini TTS`) when a key is set.
- ✅ `GET /api/health` shows live status per service (`gemini: ok`, `geminiTts: ok`). Cached for 60 s, refreshed at once when keys change.
- ✅ Editing `keys.txt` takes effect on the next request, with no restart (adding, changing and removing a key).
- ✅ `git status` never shows `keys.txt` or `.env`.
- ✅ **3-Step First-Screen Setup (`#onboard`):** Step `01` (11 language greeting tiles that translate all labels live and speak the greeting aloud with per-akshara animation), Step `02` (Class 5–12 coins), Step `03` (4 language mode cards with sample text and `▶ Listen` preview). Top summary pill (`ಕನ್ನಡ · Class 8 · ಓದಲು English, ಕೇಳಲು ಕನ್ನಡ`) reopens setup with one tap.

## Core lesson & Interactive Explain Board (Kannada, Hindi, Tamil, English)
- ✅ Example `3x + 7 = 22` starts with a 3-beat visual explanation on the **Explain Board** where **every beat** renders an active 4K SVG diagram (Beat 1: initial balance `3x + 7 = 22`; Beat 2: operation `− 7 | − 7` on both pans; Beat 3: `3x = ?` with pulsing `?` unknown badge), followed by the **Your turn** card with method choice pills (`choices`), voice, typing, and Scratchpad controls.
- ✅ **Basics / Concept Mode (`✦ Teach basics`):** Tapping the Basics button on the Explain Board or the `#basicsBtn` chip teaches the underlying concept step-by-step across 3 visual beats with definitions and everyday Indian analogies **without interrogating the student with questions** (`question: ""`, `choices: []`).
- ✅ A wrong answer (`3x = 22`) gets a shaking mistake pill in the student's native script, with no answer given.
- ✅ **H** and the Hint chip climb the ladder one rung at a time. The bead travels and used rungs keep an ember.
- ✅ Correct steps are handwritten into Your solution with a check mark that draws itself.
- ✅ Solving (`3x = 15, so x = 5`) confirms `solved: true` without leaking the answer beforehand, shows the flip-in solved card, stars, 3D confetti, a mint orb, and a star flying into My Sky.
- ✅ Explain it back (typed and by voice) shows the score ring counting up with ticks lighting in sequence.
- ✅ The parent voice note plays with karaoke, and WhatsApp opens with the text. Share sends one WAV file, or downloads it.
- ✅ Words to know fills with flip cards, and Listen works.
- ✅ **4 Language Modes verified with real Gemini key:**
  - `pure` (Fully regional): textbook regional terms on screen and in voice.
  - `mixed` (Regional + English words): natural classroom regional speech with English technical terms.
  - `english` (Read English, hear regional): English textbook display on screen + regional spoken explanation and synced regional subtitle line.
  - `bilingual` (Both on screen): English and regional lines together on screen + natural regional voice.
- ✅ **N** starts a new problem and every panel resets.

## Voice
- ✅ Push-to-talk (hold mic or Space) → `/api/transcribe` → the lesson continues. A quick tap toggles listening on and off.
- ✅ The reply is spoken sentence by sentence, the orb follows her voice, and Listen again replays from Cache Storage with no network call (tested offline).
- ⏳ Free browser voice depends on the device's installed voices (headless Chromium has none).
- ✅ Speech stops on a new question, the mic, a new problem and Esc.
- ✅ **Call mode:** 3 hands-free turns in 43 s, barge-in interrupts Christina, and ending the call returns to the lesson with every reply in the log. No self-transcription: nothing is recorded while she speaks, and barge-in needs 1.8× the threshold for 300 ms.

## Photos and Scratchpad
- ✅ A photo shows the laser-scan skeleton, then the problem card fills and the lesson starts.
- ✅ An unreadable photo gets advice and a Try again button.
- ✅ Scratchpad: a drawn `3x = 15` is exported as dark ink on white, checked, and the step goes into Your solution. Undo, clear, Esc and reopening (the strokes are kept) all work.

## Errors and edge cases
- ✅ No key: the app loads, a toast explains `keys.txt`, and lessons show the same message.
- ✅ Wrong key (real Gemini): "The API key was not accepted. Check keys.txt." The app recovers and ⓘ shows red dots.
- ✅ Rate limit: rotates busy → missing → working model. If every model is busy: 1.5 s backoff, then "Christina is busy…" (429), and the client retries once.
- ✅ Timeout: each model call stops at 13 s and the whole action at 25 s.
- ✅ Offline: a kind message in the student's language, the orb dims, and Try again recovers when back online.
- ✅ Microphone denied: a toast explains, and typing still works.
- ✅ A 30 s recording auto-stops. Bodies over 4.5 MB get a readable 413.
- ✅ Passcode: asked once, a wrong code is refused and asked again, and it isn't asked again after a reload.

## Visual
- ✅ 1440×900, 1366×768 (the hero fits with no scroll), 3840×2160 (the root font scales up to 24 px, the orb canvas is up to 1400 px), 390×844 and 360×740 phones: no horizontal overflow anywhere.
- ✅ The phone progress sheet follows the finger and closes past 30%. The Scratchpad sheet closes when dragged down.
- ✅ The page-load sequence plays once (aurora → dots → orb particles → greeting per akshara → nav → cards flip → dock).
- ✅ The View Transition morphs the example card into the problem card and the big orb into the small one.
- ✅ Reduced motion: no confetti canvas, no tilt or flip transforms, words appear at once, flip cards show both faces.
- ✅ Lite: no backdrop blur and still looks right. The FPS watchdog drops Auto to Medium, then Lite.

## Performance
- ✅ Hidden tab or off-screen: the orb, aurora and sky loops stop. My Sky pauses both WebGL contexts and stops painting the app underneath.
- ✅ Layout shift while a reply, a board line and a word arrive: CLS 0.0016.
- ✅ Console: no app errors during a full lesson. The only messages were from headless WebGL (`GPU stall due to ReadPixels`, from screenshots) and service workers being blocked in some tests.
- ⏳ A frame-rate check on a mid-range Android phone (headless runs on a software GPU).

## Accessibility
- ✅ The whole lesson works by keyboard: skip link → nav → example cards, `/` to type, H, Esc, and Shift+Tab reaches Explain it back. An animated focus ring is always visible.
- ✅ Replies are in an `aria-live` log. Stars, the ladder and the score ring have text labels.
- ⏳ A screen reader pass (NVDA or TalkBack).

## Deploy (Vercel)
- ✅ `api/[action].js` and `netlify/functions/api.mjs` were called directly with simulated requests (tutor, config, practice).
- ⏳ A real Vercel deploy plus a phone smoke test.

## Known issues
- ⚠️ jsDelivr was blocked in the build sandbox, so KaTeX was served locally during tests. On a normal network it loads from jsDelivr (pinned to 0.16.11). Without it, maths falls back to readable text such as `3/4`.
- ⚠️ Gemini TTS has no speed setting, so "Speaking speed" is passed as a style hint ("slowly", "briskly"). Sarvam uses the exact pace.
- ⚠️ If the model doesn't return `terms`, Words to know stays empty for that reply.
