# API reference

Everything in this file is what `lib/core.js` does today, plus the exact shapes for the new actions in `docs/FEATURES.md`. Keep this file in sync when you change an endpoint.

## Keys and settings

The server reads these from the environment. Locally, it also reads `keys.txt` and `.env`, re-read on every request, so editing a key needs no restart. On Vercel or Netlify, set them under Environment Variables and redeploy.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | **yes** (free) | none | Brain, photo reading, speech-to-text backup, voice backup. Get one at aistudio.google.com/apikey |
| `SARVAM_API_KEY` | optional | none | Better Indian-language ears and voice (Saaras v3, Bulbul v3), plus a backup brain |
| `LLM_PROVIDER` | no | `auto` | `auto` (Gemini, then Sarvam), `gemini` or `sarvam` |
| `GEMINI_MODELS` | no | `gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite` | Tried in order. Free-tier limits apply per model, so rotation keeps the demo alive |
| `GEMINI_TTS_MODELS` | no | `gemini-3.8-flash-tts,gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts` | Voice models, tried in order |
| `GEMINI_VOICE_FEMALE` / `_MALE` | no | `Kore` / `Puck` | Gemini prebuilt voice names |
| `SARVAM_CHAT_MODEL` | no | `sarvam-105b` | Or `sarvam-30b` (faster) |
| `SARVAM_TTS_MODEL` | no | `bulbul:v3` | `bulbul:v2` costs half (for testing) |
| `SARVAM_VOICE_FEMALE` / `_MALE` | no | `priya` / `shubh` | Must be valid Bulbul v3 speakers (lowercase) |
| `APP_PASSCODE` | no | none | When set, every action except `config` needs header `x-passcode` |
| `GEMINI_BASE_URL` / `SARVAM_BASE_URL` | no | official endpoints | Only for a corporate proxy or a local test double |
| `PORT` / `HOST` | no | `3000` / `127.0.0.1` | Local server only. `HOST=0.0.0.0` exposes it on your Wi-Fi |

**Never** log, print, return or commit any of these values.

## Internal endpoints (`/api/<action>`)

All requests and responses are JSON. A non-GET request is a `POST` with `content-type: application/json`. Errors return `{ "error": "message a student can read", "code": "...", "detail"?: "which models failed, never a key" }` with an HTTP status (400 bad input, 401 passcode, 404 unknown action, 413 too large, 429 busy, 502 provider failed or key rejected, 503 not configured, 504 timeout).

| `code` | Status | Student sees | What the server already did |
|---|---|---|---|
| `busy` | 429 | "Christina is busy right now…" (the client shows "Christina is busy, trying again…" and retries once after 2.5 s) | Rotated through every model, cooled the rate-limited ones down for 45 s, backed off 1.5 s and retried once |
| `bad_key` | 502 | "The API key was not accepted. Check keys.txt." | Stopped at once (rotating won't help) |
| `timeout` | 504 | "That took too long. Try again." | Each model call is capped at 13 s and the whole action at 25 s |
| `no_key` | 503 | How to add `GEMINI_API_KEY` | none |
| `network` | 502 | Check the internet connection | none |
| `offline` | (client) | "I need the internet to think…" in the student's language | The browser never sent the request |

Every JSON action sends Gemini a `responseSchema` (structured output). A model that rejects the schema or the thinking setting is retried once without it, and `parseJSON()` stays as the fallback. Every response is normalised (types, ranges, lengths) before it leaves the server.

Language codes: `hi-IN kn-IN ta-IN te-IN ml-IN mr-IN bn-IN gu-IN pa-IN od-IN en-IN`. Mix: `pure | mixed | bilingual`. Grade: 1–12.

### Existing

| Action | Request | Response |
|---|---|---|
| `GET config` | none | `{ brain, eyes, ears, voice, backup, passcode }`. Each service is a readable label (e.g. `"Gemini 3.8 Flash"`) or `null` if not configured |
| `tutor` | `{ language, grade, mix, problem, message, history:[{role:'user'\|'assistant', content}], hint_level:1-4 }` | `{ screen, speak, hint_level, solved, mistake, board, terms:[{en, local, meaning}] }` |
| `teachback` | `{ language, grade, mix, problem, history, explanation }` | `{ score:0-100, good, missing, screen, speak }` |
| `report` | `{ language, grade, problem, history, board:[latex], stats:{solved, hints, teachScore, minutes} }` | `{ screen, speak }` |
| `photo` | `{ image: base64 (no data: prefix), mime:'image/jpeg' }` | `{ problem, subject, readable }` |
| `transcribe` | `{ audio: base64, mime:'audio/webm', language }` | `{ text, by }`. Sarvam Saaras v3 first, then Gemini audio understanding |
| `speak` | `{ text, language, voice:'female'\|'male', pace:0.5-2 }` | `{ audio: base64 WAV, format:'wav', by }`. Sarvam Bulbul v3 first, then Gemini TTS |

Field meanings in `tutor`:
- `screen`: display text. Maths goes inside `$…$` (rendered with KaTeX), and `**bold**` marks the key idea.
- `speak`: plain words only, with no symbols, LaTeX or emojis. It is what gets read aloud.
- `mistake`: a 2–5 word name for the misconception, or `null`.
- `board`: one LaTeX line for a step the student just got right, or `null`. It feeds "Your solution".
- `terms`: 0–2 technical terms with their translation. They feed "Words to know".

### To add (specs for `docs/FEATURES.md`)

**Status: everything below is implemented.** Small additions beyond the original shapes are marked *added*.

**`GET health`** → `{ services: { gemini:{ok, model, latencyMs, error?}, geminiTts:{ok, model, latencyMs, error?}, sarvam:{ok, latencyMs, error?} }, checkedAt }`. *Added:* each service also has `configured` (false when its key is missing), and a cached result has `cached: true`. The cache is dropped as soon as keys or models change.
Use the smallest possible request per service (for example, a 1-token generation, or TTS of the word "ok"). Cache the result for 60 s. Error text must never include a key.

**`speak` (batch form)**. Request `{ sentences:[string], language, voice, pace }` → `{ audios:[{ text, audio, format:'wav', by }] }`.
Synthesise in parallel with concurrency 3, keeping the input order. Allow at most 8 sentences per call. The old `{ text }` form must keep working. *Added:* an item that failed has `audio: null` and `error`; if the response would pass 3.8 MB, the remaining items come back with `deferred: true` and the client asks for them again. The client sends sentence 1 alone, then the rest in groups of 3, so the voice starts as early as possible.

**`transcribe`: new field `language`**. The BCP-47 code of the language actually spoken (from Sarvam's `language_code`, or asked for in the Gemini listen prompt). Used by F11.

**`tutor`: new field `mood`**: `'calm' | 'confused' | 'frustrated' | 'confident'`. Judge it from the student's last message (for example "I give up", "ನನಗೆ ಗೊತ್ತಿಲ್ಲ", repeated wrong attempts). It drives encouragement mode (F10).
*Added (optional request fields):* `kind: 'start' | 'hint' | 'answer'` (the first turn, a hint request, or a normal message), `encourage: true` (open gently, stay on a gentle rung) and `confident: true` (keep it brisk, suggest trying without hints). The response also has `by` (the model that answered).

**`check-work`**. Request `{ language, grade, mix, problem, history, image: base64 PNG, mime:'image/png' }` → `{ verdict:'correct'|'partly'|'wrong'|'unreadable', screen, speak, mistake, board }`.
Gemini vision reads the student's handwritten working from the Scratchpad and judges **only the latest step**. It follows the same hint rules as `tutor` and never reveals the final answer. If the step is correct, `board` is that step as one LaTeX line. *Added:* `solved` (true when the step is the correct final answer), `read` (what the model read, as LaTeX) and optional `hint_level` in the request.

**`practice`**. Request `{ language, grade, problem, solvedWith:{hints, teachScore} }` → `{ problems:[{ level:'easier'|'same'|'harder', text }] }`.
It returns exactly 3 problems on the same concept, in the chosen language, with maths in `$…$` and no answers.

**`visual`**. Request `{ language, grade, problem, history }` → one of these typed diagram specs, which the client renders as animated SVG:
```jsonc
{ "type": "number_line", "min": -5, "max": 20, "marks": [{ "value": 7, "label": "+7" }], "jumps": [{ "from": 15, "to": 22, "label": "+7" }], "caption": "..." }
{ "type": "bar_model", "bars": [{ "label": "3x", "parts": 3, "partLabel": "x" }, { "label": "15", "parts": 1 }], "caption": "..." }
{ "type": "fraction", "numerator": 3, "denominator": 8, "shape": "circle" | "bar", "caption": "..." }
{ "type": "graph", "kind": "linear" | "quadratic", "a": 1, "b": -2, "c": 0, "xMin": -5, "xMax": 5, "points": [{ "x": 2, "label": "root" }], "caption": "..." }
{ "type": "triangle", "sides": { "a": "3 cm", "b": "4 cm", "c": "?" }, "angles": { "C": "90°" }, "caption": "..." }
{ "type": "none", "caption": "..." }   // when no diagram helps
```
All labels and the caption are in the chosen language. **Never** let the model return raw SVG or code: the client draws only from this whitelist, and `graph` is computed on the client from `a`, `b`, `c`.

## External APIs used

### Google Gemini (one free key does everything)

- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, header `x-goog-api-key: <key>`.
- **Body:** `{ systemInstruction:{parts:[{text}]}, contents:[{role:'user'|'model', parts:[{text} | {inlineData:{mimeType, data}}]}], generationConfig:{ responseMimeType:'application/json', responseSchema? } }`.
- **Read the reply** from `candidates[0].content.parts[].text`, skipping parts marked `thought`.
- **Vision (photos, Scratchpad):** add `{inlineData:{mimeType:'image/jpeg', data}}` to the last user turn.
- **Audio in (speech-to-text):** the same, with `mimeType:'audio/webm'`. Supported types include wav, mp3, aac, ogg, flac, webm and opus. The total request must be ≤ 20 MB.
- **Voice out (TTS):** use a TTS model with `generationConfig:{ responseModalities:['AUDIO'], speechConfig:{ voiceConfig:{ prebuiltVoiceConfig:{ voiceName:'Kore' } } } }`. The reply is `inlineData` holding raw 16-bit PCM mono at 24 kHz (read the rate from the mimeType). Wrap it in a WAV header (`pcmToWav()` does this).
- **TTS language status** (per Google Cloud docs): Hindi, Tamil, Telugu, Marathi and Bengali are GA. Kannada, Malayalam, Gujarati, Punjabi and Odia are Preview.
- **Current models** (Oct 2026): stable `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`; TTS `gemini-3.8-flash-tts`. Google renames models over time, so check the models page if one starts returning 404.

### Sarvam AI (optional, best Indian-language speech)

All requests use header `api-subscription-key: <key>`.

- **Speech-to-text:** `POST https://api.sarvam.ai/speech-to-text`, multipart `file`, `model=saaras:v3`, `mode=transcribe`, optional `language_code`. Returns `{ request_id, transcript, language_code }`. REST audio must be ≤ 30 s. Other modes are `translate`, `verbatim`, `translit` and `codemix`.
- **Text-to-speech:** `POST https://api.sarvam.ai/text-to-speech`, JSON `{ text (≤ 2500 chars for v3), target_language_code, model:'bulbul:v3', speaker, pace 0.5–2.0, speech_sample_rate, temperature 0.01–1 }`. Returns `{ request_id, audios:[base64 WAV] }`.
  - Valid v3 speakers include `shubh` (default), `priya`, `ritu`, `neha`, `kavya`, `rahul`, `aditya`, `rohan`, `anand` and `kavitha`. Names are lowercase.
  - Bulbul v3 covers hi, bn, ta, te, kn, ml, mr, gu, pa, od and en (all `-IN`).
- **Chat:** `POST https://api.sarvam.ai/v1/chat/completions`, OpenAI-style `{ model:'sarvam-105b'|'sarvam-30b', messages, temperature }`. The old Sarvam-M model is retired.
- **Price:** Bulbul v3 costs ₹30 per 10,000 characters and Saaras costs ₹30 per hour of audio. New accounts get free credits.

## Host limits

| | Vercel (Hobby) | Netlify (free) | Local |
|---|---|---|---|
| Max request/response body | **4.5 MB** | ~6 MB | none |
| Max function time | set to 60 s in `api/[action].js` (Hobby allows up to 300 s) | short, about 10 s by default for synchronous functions | none |
| Routing | `api/[action].js` gets `req.query.action` | `config.path = '/api/:action'` | `server.mjs` |

Because of these limits, keep each action fast. Return audio per sentence, and never make one endpoint do a minute of work.
