# QA report (Christina 2.0)

Run on 31 October 2026 against `docs/QA_CHECKLIST.md`, in headless Chromium (Playwright) with a fake microphone and camera.
This build environment had **no real Gemini or Sarvam key**, so lessons ran against a local stand-in that answers in Gemini's REST format. The wrong-key check ran against the **real** Gemini endpoint. Re-run the items marked ⏳ on your laptop with your key before the demo.

✅ passed · ⏳ needs your machine or your key · ⚠️ known issue

## Setup
- ✅ `node server.mjs` starts with zero installs and prints the URL. It creates `keys.txt` from a template on first run.
- ⏳ `start-christina.bat` (needs Windows).
- ✅ `GET /api/config` shows brain, eyes, ears and voice when a key is set.
- ✅ `GET /api/health` shows a status per service (live dots in ⓘ). Cached for 60 s, refreshed at once when keys change.
- ✅ Editing `keys.txt` takes effect on the next request, with no restart (adding, changing and removing a key).
- ✅ `git status` never shows `keys.txt` or `.env`.

## Core lesson (Kannada, Hindi, Tamil, English)
- ✅ Example `3x + 7 = 22` gets a nudge question in the chosen script with KaTeX maths, and every message has the right `lang` attribute.
- ✅ A wrong answer gets a shaking mistake pill, with no answer given.
- ✅ **H** and the Hint chip climb the ladder one rung at a time. The bead travels and used rungs keep an ember.
- ✅ Correct steps are handwritten into Your solution with a check mark that draws itself.
- ✅ Solving shows the flip-in solved card, stars, 3D confetti, a mint orb, and a star flying into My Sky.
- ✅ Explain it back (typed and by voice) shows the score ring counting up with ticks lighting in sequence.
- ✅ The parent voice note plays with karaoke, and WhatsApp opens with the text. Share sends one WAV file, or downloads it.
- ✅ Words to know fills with flip cards, and Listen works.
- ⏳ Pure / Mixed / + English changes the wording (the prompt rules are in place, but this needs the real model).
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
