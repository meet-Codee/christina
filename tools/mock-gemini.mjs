// tools/mock-gemini.mjs: a local stand-in for the Gemini REST API, for testing without a key or quota. Never used in production.
// Run: node tools/mock-gemini.mjs   then put GEMINI_API_KEY=test and GEMINI_BASE_URL=http://127.0.0.1:4599 in keys.txt.
// Models named "busy-*" return 429, "missing-*" return 404. Key "bad" returns API_KEY_INVALID. "slow-*" sleeps 30 s.
import http from 'node:http';

const PORT = Number(process.env.MOCK_PORT || 4599);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LAT = Number(process.env.MOCK_LATENCY || 500);

const T = {
  Kannada: {
    start: { screen: 'ಸರಿ, ನಾವು ಒಟ್ಟಿಗೆ ಪ್ರಯತ್ನಿಸೋಣ. $3x + 7 = 22$ ನಲ್ಲಿ, **$x$ ಅನ್ನು ಒಂಟಿಯಾಗಿ ಬಿಡಲು** ಮೊದಲು ಯಾವ ಸಂಖ್ಯೆಯನ್ನು ತೆಗೆಯಬೇಕು?', speak: 'ಸರಿ, ನಾವು ಒಟ್ಟಿಗೆ ಪ್ರಯತ್ನಿಸೋಣ. ಮೂರು ಎಕ್ಸ್ ಜೊತೆಗೆ ಏಳು ಸಮ ಇಪ್ಪತ್ತೆರಡು. ಎಕ್ಸ್ ಅನ್ನು ಒಂಟಿಯಾಗಿ ಬಿಡಲು ಮೊದಲು ಯಾವ ಸಂಖ್ಯೆಯನ್ನು ತೆಗೆಯಬೇಕು?', terms: [{ en: 'equation', local: 'ಸಮೀಕರಣ', meaning: 'ಎರಡೂ ಬದಿ ಸಮವಾಗಿರುವ ವಾಕ್ಯ' }] },
    wrong: { screen: 'ಹತ್ತಿರ ಬಂದಿದ್ದೀಯ! ಆದರೆ $7$ ಅನ್ನು **ಎರಡೂ ಬದಿಯಿಂದ** ತೆಗೆಯಬೇಕು. ಬಲಬದಿಯಲ್ಲಿ ಏನಾಗುತ್ತದೆ?', speak: 'ಹತ್ತಿರ ಬಂದಿದ್ದೀಯ! ಆದರೆ ಏಳನ್ನು ಎರಡೂ ಬದಿಯಿಂದ ತೆಗೆಯಬೇಕು. ಬಲಬದಿಯಲ್ಲಿ ಏನಾಗುತ್ತದೆ?', mistake: 'ಒಂದೇ ಬದಿಯಿಂದ ತೆಗೆದದ್ದು' },
    hint: { screen: 'ತಕ್ಕಡಿಯನ್ನು ನೆನಪಿಸಿಕೊ: ಒಂದು ಬದಿಯಿಂದ $7$ ರೊಟ್ಟಿ ತೆಗೆದರೆ, **ಇನ್ನೊಂದು ಬದಿಯಿಂದಲೂ** ಅಷ್ಟೇ ತೆಗೆಯಬೇಕು. ಈಗ ನೀನು ಪ್ರಯತ್ನಿಸು.', speak: 'ತಕ್ಕಡಿಯನ್ನು ನೆನಪಿಸಿಕೊ. ಒಂದು ಬದಿಯಿಂದ ಏಳು ರೊಟ್ಟಿ ತೆಗೆದರೆ, ಇನ್ನೊಂದು ಬದಿಯಿಂದಲೂ ಅಷ್ಟೇ ತೆಗೆಯಬೇಕು. ಈಗ ನೀನು ಪ್ರಯತ್ನಿಸು.', terms: [{ en: 'balance', local: 'ತಕ್ಕಡಿ', meaning: 'ಎರಡೂ ಬದಿ ತೂಕ ಸಮ' }] },
    step: { screen: 'ಅದ್ಭುತ! $3x = 15$ ಸರಿಯಾಗಿದೆ. ಈಗ $x$ ಒಂದನ್ನೇ ಪಡೆಯಲು ಏನು ಮಾಡಬೇಕು?', speak: 'ಅದ್ಭುತ! ಮೂರು ಎಕ್ಸ್ ಸಮ ಹದಿನೈದು ಸರಿಯಾಗಿದೆ. ಈಗ ಎಕ್ಸ್ ಒಂದನ್ನೇ ಪಡೆಯಲು ಏನು ಮಾಡಬೇಕು?', board: '3x = 15' },
    solved: { screen: 'ಶಭಾಷ್! **$x = 5$** ನೀನೇ ಕಂಡುಹಿಡಿದೆ. ಎರಡೂ ಬದಿಗೆ ಒಂದೇ ಕೆಲಸ ಮಾಡಿದ್ದು ತುಂಬಾ ಚೆನ್ನಾಗಿತ್ತು.', speak: 'ಶಭಾಷ್! ಎಕ್ಸ್ ಸಮ ಐದು, ನೀನೇ ಕಂಡುಹಿಡಿದೆ. ಎರಡೂ ಬದಿಗೆ ಒಂದೇ ಕೆಲಸ ಮಾಡಿದ್ದು ತುಂಬಾ ಚೆನ್ನಾಗಿತ್ತು.', board: 'x = 5' },
  },
  Hindi: {
    start: { screen: 'चलो साथ में करते हैं। $3x + 7 = 22$ में **$x$ को अकेला छोड़ने के लिए** पहले कौन सी संख्या हटानी होगी?', speak: 'चलो साथ में करते हैं। तीन एक्स प्लस सात बराबर बाईस। एक्स को अकेला छोड़ने के लिए पहले कौन सी संख्या हटानी होगी?', terms: [{ en: 'equation', local: 'समीकरण', meaning: 'दोनों तरफ़ बराबर वाला वाक्य' }] },
    wrong: { screen: 'करीब हो! लेकिन $7$ को **दोनों तरफ़ से** घटाना होगा। दाईं तरफ़ क्या बचेगा?', speak: 'करीब हो! लेकिन सात को दोनों तरफ़ से घटाना होगा। दाईं तरफ़ क्या बचेगा?', mistake: 'सिर्फ़ एक तरफ़ घटाया' },
    hint: { screen: 'तराज़ू सोचो: एक पलड़े से $7$ रोटियाँ हटाओ तो **दूसरे से भी** उतनी ही हटानी होंगी। अब तुम करो।', speak: 'तराज़ू सोचो। एक पलड़े से सात रोटियाँ हटाओ तो दूसरे से भी उतनी ही हटानी होंगी। अब तुम करो।' },
    step: { screen: 'बहुत बढ़िया! $3x = 15$ सही है। अब सिर्फ़ $x$ पाने के लिए क्या करोगे?', speak: 'बहुत बढ़िया! तीन एक्स बराबर पंद्रह सही है। अब सिर्फ़ एक्स पाने के लिए क्या करोगे?', board: '3x = 15' },
    solved: { screen: 'शाबाश! **$x = 5$** तुमने खुद निकाला। दोनों तरफ़ एक ही काम करना बहुत अच्छा था।', speak: 'शाबाश! एक्स बराबर पाँच, तुमने खुद निकाला। दोनों तरफ़ एक ही काम करना बहुत अच्छा था।', board: 'x = 5' },
  },
  Tamil: {
    start: { screen: 'சேர்ந்து செய்வோம். $3x + 7 = 22$ இல், **$x$ ஐ தனியாக விட** முதலில் எந்த எண்ணை நீக்க வேண்டும்?', speak: 'சேர்ந்து செய்வோம். மூன்று எக்ஸ் கூட்டல் ஏழு சமம் இருபத்திரண்டு. எக்ஸ் ஐ தனியாக விட முதலில் எந்த எண்ணை நீக்க வேண்டும்?' },
    wrong: { screen: 'அருகில் வந்துவிட்டாய்! ஆனால் $7$ ஐ **இரண்டு பக்கமும்** கழிக்க வேண்டும்.', speak: 'அருகில் வந்துவிட்டாய்! ஆனால் ஏழை இரண்டு பக்கமும் கழிக்க வேண்டும்.', mistake: 'ஒரு பக்கம் மட்டும் கழித்தது' },
    hint: { screen: 'தராசை நினை: ஒரு தட்டில் இருந்து $7$ எடுத்தால், **மறு தட்டில் இருந்தும்** அதே அளவு எடுக்க வேண்டும்.', speak: 'தராசை நினை. ஒரு தட்டில் இருந்து ஏழு எடுத்தால், மறு தட்டில் இருந்தும் அதே அளவு எடுக்க வேண்டும்.' },
    step: { screen: 'அருமை! $3x = 15$ சரி. இப்போது $x$ மட்டும் பெற என்ன செய்வாய்?', speak: 'அருமை! மூன்று எக்ஸ் சமம் பதினைந்து சரி. இப்போது எக்ஸ் மட்டும் பெற என்ன செய்வாய்?', board: '3x = 15' },
    solved: { screen: 'சபாஷ்! **$x = 5$** நீயே கண்டுபிடித்தாய்.', speak: 'சபாஷ்! எக்ஸ் சமம் ஐந்து, நீயே கண்டுபிடித்தாய்.', board: 'x = 5' },
  },
  English: {
    start: { screen: "Let's do it together. In $3x + 7 = 22$, which number should we remove first to **leave $x$ alone**?", speak: "Let's do it together. Three x plus seven equals twenty two. Which number should we remove first to leave x alone?", terms: [{ en: 'equation', local: 'equation', meaning: 'both sides are equal' }] },
    wrong: { screen: 'Close! But $7$ has to come off **both sides**. What is left on the right side?', speak: 'Close! But seven has to come off both sides. What is left on the right side?', mistake: 'Subtracted on one side' },
    hint: { screen: 'Think of a balance: take $7$ rotis off one pan and you must take **the same off the other**. Now you try.', speak: 'Think of a balance. Take seven rotis off one pan and you must take the same off the other. Now you try.' },
    step: { screen: 'Brilliant! $3x = 15$ is right. Now what will you do to get $x$ alone?', speak: 'Brilliant! Three x equals fifteen is right. Now what will you do to get x alone?', board: '3x = 15' },
    solved: { screen: 'Well done! **$x = 5$**, and you found it yourself. Doing the same thing to both sides was spot on.', speak: 'Well done! x equals five, and you found it yourself. Doing the same thing to both sides was spot on.', board: 'x = 5' },
  },
};

function langFrom(system) {
  const m = /(?:Reply only in |speak always uses )(\w+)/.exec(system || '');
  return m && T[m[1]] ? m[1] : 'English';
}

function legacyTutorReply(system, lastUser) {
  const L = T[langFrom(system)];
  const rung = Number(/\[rung\] (\d)/.exec(lastUser)?.[1] || 1);
  const said = /\[student\] ([\s\S]*)/.exec(lastUser)?.[1] || '';
  const base = { hint_level: rung, solved: false, mistake: null, board: null, terms: [], mood: 'calm' };
  if (/\[event\] The student has just shared/.test(lastUser)) return { ...base, ...L.start };
  if (/asked for another hint/.test(lastUser)) return { ...base, ...L.hint };
  if (/x\s*=\s*5|ಐದು|पाँच|ஐந்து|\bfive\b/i.test(said)) return { ...base, ...L.solved, solved: true, mood: 'confident' };
  if (/15|ಹದಿನೈದು|पंद्रह|பதினைந்து|fifteen/i.test(said)) return { ...base, ...L.step, mood: 'confident' };
  if (/give up|don.?t know|ಗೊತ್ತಿಲ್ಲ|नहीं पता/i.test(said)) return { ...base, ...L.hint, mood: 'frustrated', screen: 'You are doing fine, mistakes help us learn. ' + L.hint.screen, speak: 'You are doing fine, mistakes help us learn. ' + L.hint.speak };
  return { ...base, ...L.wrong, mood: 'confused' };
}

function tutorReply(system, lastUser) {
  const language = langFrom(system);
  const r = legacyTutorReply(system, lastUser);
  const definitions = {
    Kannada: [
      'ಸಮೀಕರಣವು ಎರಡು ಸಮಾನ ಮೌಲ್ಯಗಳನ್ನು ತೋರಿಸುತ್ತದೆ: $3x + 7 = 22$ ತಕ್ಕಡಿಯ ಎರಡೂ ಬದಿಗಳಂತೆ ಸಮವಾಗಿದೆ.',
      'ಒಂದು ಬದಿಯಿಂದ $7$ ತೆಗೆದರೆ ಇನ್ನೊಂದು ಬದಿಯಿಂದಲೂ $7$ ತೆಗೆಯಬೇಕು. ಹೀಗೆ **ಸಮತೋಲನ** ಉಳಿಯುತ್ತದೆ.',
      'ಈಗ ಎಡಬದಿಯಲ್ಲಿ $3x$ ಮಾತ್ರ ಉಳಿದಿದೆ. ಬಲಬದಿಯಲ್ಲಿ $22 - 7 = ?$ ಎಷ್ಟಾಗುತ್ತದೆ ಎಂದು ಯೋಚಿಸು.',
    ],
    Hindi: [
      'समीकरण दो बराबर मात्राएँ दिखाता है: $3x + 7 = 22$ तराजू के दोनों बराबर पलड़ों जैसा है।',
      'एक तरफ से $7$ हटाएँ तो दूसरी तरफ से भी $7$ हटाएँ। इससे **बराबरी** बनी रहती है।',
      'अब बाईं तरफ़ सिर्फ़ $3x$ बचा है। दाईं तरफ़ $22 - 7 = ?$ कितना होगा?',
    ],
    Tamil: [
      'சமன்பாடு இரண்டு சமமான அளவுகளைக் காட்டுகிறது: $3x + 7 = 22$ தராசின் இரு சம தட்டுகள் போன்றது.',
      'ஒரு பக்கத்தில் $7$ ஐக் கழித்தால் மறுபக்கத்திலும் $7$ ஐக் கழிக்க வேண்டும். **சமநிலை** மாறாது.',
      'இப்போது இடது பக்கம் $3x$ மட்டும் உள்ளது. வலது பக்கம் $22 - 7 = ?$ என்ன வரும்?',
    ],
    English: [
      'An equation says two quantities are equal: in $3x + 7 = 22$, both pans of the balance hold the same weight.',
      'Taking $7$ away from each side keeps the scale **balanced**. Whatever we do to one side, we do to the other.',
      'Now the left pan has $3x$ alone, and the right pan is $22 - 7 = ?$.',
    ],
  };
  const english = /DISPLAY: screen, beat screen/.test(system);
  const both = /DISPLAY: each short English/.test(system);
  const noQuestions = /basics|no questions|do not ask|Do NOT ask any question/i.test((system.split('THE PROBLEM\n')[1] || '').split('\n\n')[0] + lastUser);
  const start = /The student has just shared|wants to learn the basics/.test(lastUser);
  const lines = definitions[language];
  const render = (local, en) => (english ? en : both ? `${en}\n${local}` : local);
  const steps = start ? lines : [r.solved ? lines[0] : r.screen];
  const visuals = [
    { type: 'balance', left: '3x + 7', right: '22', operation: '=', caption: '3x + 7 = 22' },
    { type: 'balance', left: '3x + 7', right: '22', operation: '− 7 | − 7', caption: '− 7 | − 7' },
    { type: 'balance', left: '3x', right: '?', operation: '=', caption: '3x = ?' },
  ];
  const beats = steps.map((line, i) => ({
    screen: render(line, definitions.English[i] || definitions.English[0]),
    speak: (start || r.solved ? line : r.speak).replace(/\$|\*/g, ''),
    visual: r.solved ? { type: 'balance', left: 'x', right: '✓', operation: '=', caption: '' } : visuals[Math.min(i, 2)],
  }));
  return {
    ...r,
    beats,
    screen: beats.map((b) => b.screen).join('\n\n'),
    speak: beats.map((b) => b.speak).join(' '),
    question: noQuestions || r.solved ? '' : render(r.start?.screen || 'ಮೊದಲು ಎರಡೂ ಬದಿಗೆ ಏನು ಮಾಡೋಣ?', 'Which operation keeps the balance?'),
    choices: noQuestions || r.solved ? [] : ['− 7 | − 7', '+ 7 | + 7', '÷ 3 | ÷ 3'],
  };
}

function pcm(seconds) {
  const rate = 24000;
  const n = Math.round(rate * seconds);
  const buf = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.3 * t);
    const v = Math.sin(2 * Math.PI * 180 * t + 3 * Math.sin(2 * Math.PI * 5 * t)) * 0.25 * env;
    buf.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  return buf.toString('base64');
}

const reply = (obj) => ({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(obj) }] }, finishReason: 'STOP' }] });

http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  const model = decodeURIComponent((/models\/([^:]+):/.exec(req.url) || [])[1] || '');
  const key = req.headers['x-goog-api-key'];
  const out = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
  if (key === 'bad') return out(400, { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } });
  if (model.startsWith('busy')) return out(429, { error: { code: 429, message: 'Resource has been exhausted (e.g. check quota).', status: 'RESOURCE_EXHAUSTED' } });
  if (model.startsWith('missing')) return out(404, { error: { code: 404, message: `models/${model} is not found`, status: 'NOT_FOUND' } });
  if (model.startsWith('slow')) await sleep(30000);
  await sleep(LAT);
  const system = body.systemInstruction?.parts?.[0]?.text || '';
  const lastUserTurn = [...(body.contents || [])].reverse().find((c) => c.role === 'user');
  const lastUser = (lastUserTurn?.parts || []).map((p) => p.text || '').join('\n');
  const L = langFrom(system);
  if (body.generationConfig?.responseModalities?.includes('AUDIO')) {
    const text = lastUser.replace(/^Say[^:]*:\s*/, '');
    return out(200, { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: pcm(Math.min(9, 0.6 + text.length * 0.055)) } }] } }] });
  }
  if (/Reply with the word ok/.test(lastUser) || lastUser === 'ok') return out(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] });
  if (/THE HINT LADDER/.test(system)) return out(200, reply(tutorReply(system, lastUser)));
  if (/Feynman/.test(system)) return out(200, reply({ score: 84, good: L === 'Kannada' ? 'ಎರಡೂ ಬದಿಯಿಂದ ತೆಗೆದದ್ದು' : 'Doing the same to both sides', missing: L === 'Kannada' ? 'ಏಕೆ ಮೂರರಿಂದ ಭಾಗಿಸಿದೆ' : 'Why you divided by 3', screen: L === 'Kannada' ? 'ತುಂಬಾ ಚೆನ್ನಾಗಿ ವಿವರಿಸಿದೆ! $3$ ರಿಂದ ಏಕೆ ಭಾಗಿಸಿದೆ ಎಂದೂ ಹೇಳು.' : 'Lovely explanation! Also say **why** you divided by $3$.', speak: L === 'Kannada' ? 'ತುಂಬಾ ಚೆನ್ನಾಗಿ ವಿವರಿಸಿದೆ! ಮೂರರಿಂದ ಏಕೆ ಭಾಗಿಸಿದೆ ಎಂದೂ ಹೇಳು.' : 'Lovely explanation! Also say why you divided by three.' }));
  if (/voice note for the parent/.test(system)) return out(200, reply({ screen: L === 'Kannada' ? 'ನಮಸ್ಕಾರ. ಇಂದು ನಿಮ್ಮ ಮಗು ಒಂದು ಸಮೀಕರಣವನ್ನು ತಾನೇ ಬಿಡಿಸಿತು. ಕೇವಲ ಒಂದು ಸುಳಿವು ಬಳಸಿತು. ಇಂದು ರಾತ್ರಿ ಅದನ್ನು ನಿಮಗೆ ವಿವರಿಸಲು ಕೇಳಿ.' : 'Namaste. Today your child solved an equation by themselves, using just one hint. Ask them to explain it to you tonight.', speak: L === 'Kannada' ? 'ನಮಸ್ಕಾರ. ಇಂದು ನಿಮ್ಮ ಮಗು ಒಂದು ಸಮೀಕರಣವನ್ನು ತಾನೇ ಬಿಡಿಸಿತು. ಕೇವಲ ಒಂದು ಸುಳಿವು ಬಳಸಿತು. ಇಂದು ರಾತ್ರಿ ಅದನ್ನು ನಿಮಗೆ ವಿವರಿಸಲು ಕೇಳಿ.' : 'Namaste. Today your child solved an equation by themselves, using just one hint. Ask them to explain it to you tonight.' }));
  if (/Read this photo/.test(system)) return out(200, reply({ problem: 'Solve $2x - 5 = 11$', subject: 'maths', readable: true }));
  if (/Transcribe exactly/.test(system)) return out(200, reply({ text: process.env.MOCK_TRANSCRIPT || '3x = 15', language: process.env.MOCK_LANG || 'kn-IN' }));
  if (/scratchpad/.test(system)) return out(200, reply({ verdict: 'correct', read: '3x = 15', screen: 'Correct! $3x = 15$. What comes next?', speak: 'Correct! Three x equals fifteen. What comes next?', mistake: null, board: '3x = 15', solved: false }));
  if (/practice problems/.test(system)) return out(200, reply({ problems: [{ level: 'easier', text: 'Solve $x + 4 = 9$' }, { level: 'same', text: 'Solve $2x + 5 = 17$' }, { level: 'harder', text: 'Ravi has ₹$5x - 8 = 37$. Find $x$.' }] }));
  if (/ONE simple diagram/.test(system)) return out(200, reply({ type: 'bar_model', bars: [{ label: '3x', parts: 3, partLabel: 'x' }, { label: '15', parts: 1 }], caption: 'Three equal parts make 15. What is one part?' }));
  return out(200, reply({ screen: 'ok', speak: 'ok' }));
}).listen(PORT, '127.0.0.1', () => console.log(`mock gemini on ${PORT}`));
