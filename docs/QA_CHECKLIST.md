# QA checklist

Run this before saying anything is done, and again before the demo. Write down every failure, then fix it or list it as a known issue.

## Setup

- [ ] `node server.mjs` starts with **zero installs** and prints the localhost URL.
- [ ] On Windows, double-clicking `start-christina.bat` starts it and opens the browser.
- [ ] `GET /api/config` shows `brain`, `eyes`, `ears` and `voice` connected (Gemini key in `keys.txt`).
- [ ] `GET /api/health` shows every configured service `ok` (after it is built).
- [ ] Editing `keys.txt` takes effect after a page refresh, with no server restart.
- [ ] `git status` shows no `keys.txt` or `.env`.

## Core lesson: run in Kannada, Hindi and English

- [ ] Typing the 3x + 7 = 22 example gives a nudge question in the chosen language and script, with maths rendered.
- [ ] A wrong answer gets a mistake pill and **no final answer**.
- [ ] **H** or "Another hint" climbs the ladder one rung at a time, up to rung 4.
- [ ] Correct steps appear in **Your solution**.
- [ ] Solving shows the solved card, stars, confetti and a mint orb.
- [ ] **Explain it back** by voice gives a score ring and feedback.
- [ ] **Voice note for parents** plays, and WhatsApp opens with the text.
- [ ] **Words to know** fills with term pairs, and Listen works.
- [ ] Switching **Pure / Mixed / + English** visibly changes the wording of the next reply.
- [ ] **N** starts a new problem, and every panel resets.

## Voice

- [ ] Holding the mic (or Space) and speaking Kannada produces correct text in Kannada script.
- [ ] The reply is spoken, the orb ripples with the voice, and **Listen again** replays from cache with no network call.
- [ ] Free browser voice on: speaking and listening work with no premium voice calls (check the Network tab).
- [ ] Speech stops instantly on a new question, the mic or a new problem.
- [ ] **Call mode:** 3 turns hands-free, barge-in works, no self-transcription.

## Photos and Scratchpad

- [ ] A phone photo of a handwritten equation is read into the problem card, and the lesson starts.
- [ ] A blurry photo gets "not clear enough" with advice, and the app recovers.
- [ ] A Scratchpad step written by finger on a phone is judged, and a correct step is added to Your solution.

## Errors and edge cases

- [ ] **No key:** the app loads and a toast explains how to add a key. Nothing crashes.
- [ ] **Wrong key:** a readable message, and the app recovers.
- [ ] **Rate limit (429):** rotates to the next model. If all fail, a clear message.
- [ ] **Offline** (DevTools offline): a clear message, and it recovers when back online.
- [ ] **Microphone denied:** a toast explains, and typing still works.
- [ ] A 30-second recording is accepted, and a longer one auto-stops.
- [ ] Passcode set: the prompt appears once, and a wrong code is refused.

## Visual: check every size

- [ ] 1440×900 laptop
- [ ] 1366×768 small laptop (the empty state must fit without scrolling)
- [ ] **3840×2160 (4K)**: crisp text, orb sharp, nothing tiny
- [ ] 390×844 phone and 360×740 small Android
- [ ] Every element in the DESIGN_SYSTEM §4 table shows its enter, hover, press and state effect
- [ ] Page-load sequence plays once, smoothly
- [ ] Hero → lesson View Transition morphs (Chrome/Edge) and falls back cleanly elsewhere
- [ ] **Reduced motion** (Windows: Settings → Accessibility → Visual effects → Animation effects off): no 3D, no confetti, everything usable
- [ ] Lite tier: no backdrop blur, still beautiful, ≥ 50 fps on a low-end phone

## Performance

- [ ] Idle CPU stays low (orb and aurora only). Hidden tab: no animation frames.
- [ ] No interaction long task over 50 ms (DevTools Performance).
- [ ] Console: no errors or warnings during a full lesson.
- [ ] No layout shift when replies, words or board lines arrive.

## Accessibility

- [ ] The full lesson can be done by keyboard only, with focus always visible.
- [ ] A screen reader announces Christina's replies.
- [ ] Text contrast is ≥ 4.5:1 on glass at the brightest aurora mood.

## Deploy smoke test (Vercel)

- [ ] Push, deploy and set `GEMINI_API_KEY` (and `SARVAM_API_KEY`).
- [ ] The https link works on a phone, and the mic permission prompt appears.
- [ ] One full lesson, one photo, one call-mode turn.
- [ ] `APP_PASSCODE` is set before the link is posted publicly.

## Demo rehearsal

- [ ] Run the 2-minute script from README twice, timed.
- [ ] Demo problems have been rehearsed once, so their voice is cached.
- [ ] A backup screen recording of the full demo exists.
- [ ] The laptop is charged, Do Not Disturb is on, and the browser zoom is 100%.
