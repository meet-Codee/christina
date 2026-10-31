import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanVisual, lessonIssues, TUTOR_PROMPT } from '../lib/core.js';
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = { documentElement: { dataset: {} } };
const { renderVisual } = await import('../public/visual.js');
import { lessonCopy, LANGS, MIXES } from '../public/i18n.js';

test('native-script guard rejects romanized Kannada, accepts Kannada voice over English screen', () => {
  const b = { language: 'kn-IN', mix: 'english', problem: 'Teach equations' };
  assert.equal(lessonIssues({ screen: 'An equation balances two sides.', speak: 'samikarana' }, b).length, 1);
  assert.deepEqual(lessonIssues({ screen: 'An equation balances two sides.', speak: 'ಸಮೀಕರಣವು ಸಮತೋಲನದ ತಕ್ಕಡಿಯಂತಿದೆ.' }, b), []);
});
test('obvious final answer leaks in a visual or screen are rejected', () => {
  const b = { language: 'en-IN', mix: 'mixed', problem: 'Solve 3x + 7 = 22' };
  for (const data of [{ screen: 'x = 5', speak: 'Try it' }, { screen: 'Try it', beats: [{ screen: 'Look', speak: 'Look', visual: { left: 'x = 5' } }] }]) assert.ok(lessonIssues(data, b).length);
  assert.deepEqual(lessonIssues({ screen: 'Subtract 7 on both sides. x = ?', speak: 'Subtract seven on both sides.' }, b), []);
});
test('all supported languages have four modes and native setup copy', () => {
  assert.equal(MIXES.length, 4);
  for (const l of LANGS) { const copy = lessonCopy(l.code); assert.equal(copy.modes.length, 4); assert.ok(copy.sample && copy.turn && copy.board); }
});
test('visual whitelist drops markup and bounds numerical input', () => {
  assert.equal(cleanVisual({ type: 'html', html: '<script>bad()</script>' }).type, 'none');
  const line = cleanVisual({ type: 'number_line', min: -1e9, max: 1e9, marks: [], jumps: [] });
  assert.ok(line.max - line.min <= 60);
  for (const type of ['balance','circuit','light_ray','food_chain','cell']) {
    const svg = renderVisual(cleanVisual({ type, left: '<script>bad</script>', right: '?', labels: ['<img onerror=x>'], caption: 'Diagram' }));
    assert.ok(svg.includes('<svg'));
    assert.ok(!svg.includes('<script>') && !svg.includes('<img'));
    assert.ok(!svg.includes('NaN'));
  }
});
test('teaching and language prompts keep no-answer rule and optional questions', () => {
  for (const mix of MIXES) {
    const prompt = TUTOR_PROMPT({ language: 'kn-IN', grade: 6, mix: mix.id, problem: 'Teach equations' });
    assert.match(prompt, /Never state the final answer/);
    assert.match(prompt, /Do not replace teaching with questions/);
    assert.match(prompt, /Unknown results must be "\?"/);
  }
});
