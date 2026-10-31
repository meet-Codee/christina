# Design system: glass, depth, 3D and motion

Christina should feel like a living object made of light floating in deep space. Every element moves, but the motion follows **one language**, so the result reads as premium rather than noisy:

- **Cool light (cyan → violet) is Christina.** Her voice, her replies and her thinking.
- **Warm light (saffron → magenta) is the student.** Their voice, their messages and their progress.
- **Mint is success.** Correct steps, solved problems and stars.
- **One key light from the top-left.** It matches the orb's highlight. Every sheen, highlight and shadow agrees with it.
- **Things the student reads never move after they arrive.** Effects happen on entry, on interaction and on state change only.

## 1. Tokens (already in `public/styles.css`; extend, don't replace)

**Colour**

| Token | Value | Use |
|---|---|---|
| `--void` | `#05050c` | Page background |
| `--text` / `--text-2` / `--text-3` | `#f6f4ff` / `#b9b5d9` / `#8a86a8` | Primary, secondary and muted text |
| `--cyan` / `--violet` / `--magenta` | `#3be8ff` / `#8b6cff` / `#ff4fd8` | Brand light |
| `--saffron` | `#ffb547` | The student |
| `--mint` | `#3dffb5` | Success |
| `--rose` | `#ff6b8b` | Mistakes (gentle, never alarming) |
| `--g-brand` / `--g-tutor` / `--g-student` / `--g-win` | gradients | See `:root` |

**Type**
- **Unbounded** for display and headings.
- **Manrope** for body text.
- **Noto Sans [script]** for every Indian script (already wired into `--indic`).
- Body text is 1.02rem with line-height 1.6. Indian scripts need line-height ≥ 1.6 or conjuncts get clipped.

**Splitting Indian text for letter animations.** Use this, and nothing else. `Intl.Segmenter` alone still splits conjuncts in Chromium (ಸ್ಕಾ → ಸ್ + ಕಾ), and wrapping those pieces in separate spans breaks the ligature on screen. The function below glues any cluster ending in a virama or ZWJ to the next one. It was tested on all 10 Indian scripts (ನ·ಮ·ಸ್ಕಾ·ರ, न·म·स्ते, ਸ·ਤ·ਸ੍ਰੀ…).

```js
const VIRAMA = /[्্੍્୍்్್്‍]$/;
export function splitAksharas(text, lang) {
  const out = [];
  for (const { segment } of new Intl.Segmenter(lang, { granularity: 'grapheme' }).segment(text)) {
    if (out.length && VIRAMA.test(out[out.length - 1])) out[out.length - 1] += segment;
    else out.push(segment);
  }
  return out;
}
```

**Motion tokens to add**

```css
--dur-micro: 120ms;  --dur-s: 240ms;  --dur-m: 420ms;  --dur-l: 700ms;  --dur-xl: 1000ms;
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);          /* already --ease */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--spring: linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1);
--stagger: 55ms;
```

**Depth tokens to add (the z ladder)**

| Layer | What sits there | `translateZ` | Shadow | Glass blur |
|---|---|---|---|---|
| z0 | Aurora, dot grid, grain | none | none | none |
| z1 | Nav, dock, mission panel cards | 0 | `0 24px 60px -30px rgba(0,0,0,.6)` | 22px |
| z2 | Messages, example cards, tiles, words | 12px | `0 30px 70px -30px rgba(0,0,0,.7)` | 18px |
| z3 | Hovered and pressed elements, chips, mic | 28px | `0 40px 80px -24px rgba(0,0,0,.75)` plus coloured glow | 16px |
| z4 | Dialogs, toast, Call mode, Scratchpad | 60px | `0 60px 140px -40px rgba(0,0,0,.9)` | 28px |

Set `perspective: 1400px` on `.app` and on dialogs. Children opt into depth with `transform-style: preserve-3d` and `.z1`–`.z4` classes.

## 2. Glass tiers

| Class | Recipe |
|---|---|
| `.glass-1` | 7% → 2% white gradient fill, 1px `--stroke` border, `backdrop-filter: blur(22px) saturate(150%)`, inner top highlight `inset 0 1px 0 rgba(255,255,255,.07)` |
| `.glass-2` | `.glass-1` plus a **gradient edge** (the `.gb` mask technique already in styles.css) and a **sheen**: a 120° white gradient band (0 → 8% → 0) that sweeps across once on hover (`background-position` animation, 900 ms) |
| `.glass-3` | `.glass-2` plus a **pointer specular highlight** (`.spot`, already built) and a faint frosted noise layer (reuse the `.grain` SVG at 4% opacity) |

- Dialog backdrops animate `backdrop-filter: blur(0) → blur(10px)` together with opacity over `--dur-m`.
- Lite tier: replace `backdrop-filter` with solid `rgba(16,14,34,.92)`, because blur is the most expensive effect on cheap phones.

## 3. The one orchestrated moment: page load (first visit and app open)

| t (ms) | What happens |
|---|---|
| 0 | Aurora fades in from black (600 ms) |
| 150 | Dot grid ripples outward from the centre (radial mask grows from 0 to 140%, 900 ms) |
| 300 | The orb materialises: 120 particles converge into it, it scales 0.6 → 1 with `--spring`, and blur goes 20px → 0 |
| 650 | The greeting rises in **akshara by akshara** (`splitAksharas`), each from 30px down with blur 12 → 0, staggered |
| 850 | The nav glass slides down 20px and its backdrop blur animates in |
| 950 | Example cards flip up from `rotateX(70deg)`, staggered by `--stagger` |
| 1150 | The dock rises 40px with `--spring`, and the mic ring starts spinning |

Run it once per page load. Respect reduced motion (show everything at once with a 200 ms fade).

## 4. Effect catalog: every element

"Enter" is how it appears, "Hover/focus" is pointer or keyboard focus, "Press" is click or tap, and "State" is a meaningful change. Every interactive element also gets the animated **focus ring**: a 2px conic-gradient outline that rotates (`@property --angle`).

| Element | Enter | Hover / focus | Press | State change |
|---|---|---|---|---|
| **Nav bar** | Slides down with blur-in (page load) | none | none | Gains a stronger glass and border when a dialog is open |
| **Brand orb** | Scale-in with the main orb | Conic spin speeds up ×3, glow pulses | Ping ripple ring | Mirrors the main orb's mood colour |
| **Language pill** | Fade and slide | Native name shimmers once (gradient sweep) | 3D flip on the Y axis revealing "Change" | New language: old name flips out, new one flips in |
| **Mix control** | Fade | Option text brightens | Gradient indicator **slides** to the chosen option with `--spring` (one shared indicator element, FLIP) | Toast confirms |
| **Icon buttons** (ⓘ, ⚙, ladder) | Pop in, staggered | **Magnetic** pull toward the cursor (max 6px), lift to z3 | Press to z1 (scale .94) | ⚙ rotates 90° on open, ⓘ bounces once, the ladder badge pops when its number changes |
| **Main orb** (WebGL) | Particle convergence (page load) | Its highlight follows the pointer (pass the pointer to the shader as the light direction) | Click replays Christina's last reply | Colour and swirl per state (already built); the kolam halo **redraws its line** on every state change |
| **Aurora** | Fade from black | none | none | Mood colours (built); flares with voice energy; slow pointer parallax (2%) |
| **Dot grid** | Radial ripple reveal | Dots near the cursor brighten (radial mask follows the pointer, desktop High tier only) | none | Ripple wave from the mic when the student starts speaking |
| **Hero greeting** | Akshara rise with blur (`splitAksharas`) | Glyphs do a small wave | none | Language change: old greeting dissolves into particles, new one rises |
| **Hero title and subtitle** | Mask reveal from bottom (`clip-path: inset(100% 0 0 0) → inset(0)`) | none | none | none |
| **Example cards** | 3D flip-up, staggered | **Tilt** (built) plus **glare** following the pointer plus the icon floating to `translateZ(30px)` | Card **morphs into the problem card** (View Transition, `view-transition-name: problem`) | none |
| **Problem card** | Arrives through the View Transition | Photo thumbnail tilts | Thumbnail opens in a 3D lightbox (zoom plus `rotateY` settle) | While a photo is read, a **laser scan line** sweeps down it in 3D and the text shows a shimmer skeleton |
| **Dock** | Spring rise | none | none | When the input has focus, a conic **gradient border rotates** around the dock; in Call mode the dock morphs into the call controls |
| **Text input** | With the dock | Placeholder **types itself** cycling example doubts in the chosen language (stops on focus) | none | Caret glows; on send the text flies up as a paper plane into the log |
| **Mic button** | Spring scale-in | Lifts to z3, ring speeds up | **3D press** (`translateZ(-6px)`, inner shadow) | Recording: concentric **sound rings** emit on each voice peak (from the analyser), button scales with level (built) |
| **Camera and send buttons** | With the dock | Lift, icon micro-move (shutter blink, arrow nudge) | Press | none |
| **Assist chips** | Pop-in, staggered, `--spring` (when the lesson starts) | Magnetic, lift to z3 | Ripple of light from the press point | The hint chip glows like an **ember** after 2 wrong attempts in a row |
| **Caption** (live transcript) | Each word fades up as it is heard | none | none | Warm gradient sweep while listening |
| **Christina message** | **3D arc in** (`rotateX(18deg) translateY(24px) translateZ(-40px) → 0`, blur 10 → 0) plus a light sweep along its gradient edge | Edge brightens | none | Words stream in (built). During speech the **spoken word is highlighted** (karaoke, F2) |
| **Older messages** | none | none | none | Scroll-driven: messages leaving the top **recede** (`rotateX(6deg)`, scale .97, opacity .6) using `animation-timeline: view()` (progressive enhancement) |
| **Student message** | Flies from the dock (origin bottom-right) with a short warm trail, springs into place | none | none | none |
| **Thinking bubble** | Fade and scale | none | none | Three dots become **particles orbiting in a 3D ring**; label shimmer (built) |
| **Mistake pill** | Small shake (±3px, 2 cycles) plus rose glow pulse | Tooltip explains the mistake | none | none |
| **Listen again** | With the message | Equaliser bars appear | Ripple | Bars animate while that reply is playing |
| **Solved card** | **3D flip-in** from `rotateY(-90deg)` | Glare | none | Stars pop (built) with sparkle particles; mint light sweep; 3D confetti (upgrade the confetti to rotating paper with perspective) |
| **Teach-back ring** | Flip-in | none | none | Gauge counts up (built) with tick marks lighting in sequence; colour shifts rose → saffron → mint as the score rises |
| **Hint ladder** | Rungs slide in from the right, staggered | Rung lifts | none | A glowing bead **travels up the rail** to the new rung, which lifts to z3 and pulses (built); used rungs keep a warm ember |
| **Your solution** | none | Line lifts | none | New line is **written in**: a handwriting wipe (`clip-path` left → right, 700 ms), then the check mark draws itself (SVG `stroke-dashoffset`) with mint dust particles |
| **Action cards** (Explain it back, Voice note) | Slide in, staggered | Sheen sweep plus the icon tile flips in 3D to an alternate icon | Press z1 | Ready state: breathing gradient border |
| **Words to know** | New card pushes the others down (FLIP) and drops in from z4 | Tilt | **3D flip card**: front shows the local term, back shows the English term, meaning and a Listen button | none |
| **Stats** | Count-up (built) | none | none | Value change: **split-flap digit flip** (each digit `rotateX` −90 → 0) |
| **Mission panel (phone)** | Sheet slides up with `--spring` | none | Drag handle: the sheet **follows the finger**, closes past 30%, elastic overscroll | Scrim blur grows with drag progress |
| **Dialogs** (settings, about, report) | **Grow out of the button that opened them** (`transform-origin` set from the trigger's rect, scale .85, `rotateX(8deg)`, blur 12 → 0) | none | none | Closing reverses back into the button |
| **Onboarding tiles** | Wave entrance staggered diagonally (row + column) | Tilt plus glare (built) | Chosen tile flips to show ✓ plus its greeting; others dim to 50% and sink to z0 | none |
| **Class picker** | Coins drop in, staggered | Coin wobbles | **3D coin spin** (`rotateY` 360°) landing on the gradient face | none |
| **Start learning** | Gradient flows (built) | Magnetic | **Warp**: the whole onboarding scales 1.15 with blur and fades as the app scales up from 0.9 (tunnel transition) | none |
| **Toggles** | none | Knob grows | Knob **squash and stretch** with `--spring`, track gradient fills from the knob side | none |
| **Toast** | Rises with `rotateX(-30deg) → 0` | Pauses its timer | none | A thin progress line shows the time left |
| **Scrollbars** | none | Thumb widens | none | Gradient thumb |
| **Keyboard hints** | none | none | none | The `kbd` key **presses down** whenever its shortcut is used |
| **Cursor glow** (desktop, High tier) | none | A soft 240px light follows the pointer, visible only over glass surfaces | none | Warm while recording, cool while Christina speaks |

## 5. New screens (from FEATURES.md) also follow this language

- **Call mode:** full screen at z4. The orb grows to 70vh, the aurora energy is turned up, captions sit below the orb, and there are only two controls (mute, end call). Entering it is a View Transition from the dock mic.
- **Scratchpad:** a glass-3 sheet with a dotted-paper canvas (the dot grid again), so ink strokes glow faintly. "Check my step" sends a light pulse from the pad to the orb.
- **My Sky:** a 3D starfield. Stars sit on a slowly rotating sphere you can drag to orbit; a new star flies in from the solved card. Each star's colour shows the subject and its size shows independence.
- **Show me diagrams:** SVG elements **draw themselves** (stroke-dashoffset), labels fade in after their lines, and number-line jumps arc across.

## 6. Performance and quality tiers

| Tier | When | What is on |
|---|---|---|
| **Full** | Desktop or a strong phone (`deviceMemory ≥ 4` and `hardwareConcurrency ≥ 6`) | Everything |
| **Medium** | Default on phones | No cursor glow, no dot-grid hover, aurora at 20 fps, orb rendered at ≤ 600px, fewer confetti pieces |
| **Lite** | `deviceMemory ≤ 2`, `saveData`, or **FPS watchdog** below 45 fps for 3 s | No `backdrop-filter` (solid glass), static aurora gradient, orb at 30 fps, no tilt, magnetic or parallax; flips become fades |

- **Settings:** "Visual effects: Auto / Full / Lite", stored in `localStorage`.
- At most **two** WebGL contexts at once (orb and aurora). My Sky pauses the aurora while open.
- Pause every `requestAnimationFrame` loop when `document.hidden`, or when the element is off-screen (IntersectionObserver).
- Animate only `transform`, `opacity`, `filter`, `clip-path` and `background-position`. Use `will-change` only while an animation is running.
- No long tasks over 50 ms on interaction. Measure with Performance → Interactions.

## 7. Reduced motion (`prefers-reduced-motion: reduce`)

- All 3D (tilt, flips, arcs, coins, parallax, magnetic) becomes a 150 ms opacity fade.
- Words stream in instantly. Karaoke highlight stays (it is useful), without movement.
- No confetti, particles or cursor glow. The orb renders one frame per state change (built).
- Flip cards show both faces stacked instead of flipping.

## 8. Accessibility

- Every effect is decoration. The information never depends on motion or colour alone. Mistakes have text, stars have `aria-label`, and the ladder has numbers.
- Keyboard: Tab order follows the visual order. Space-to-talk must not fire while a button or input has focus (already handled).
- Contrast: text ≥ 4.5:1 on its glass. Check with the aurora at its brightest mood.
- Touch targets ≥ 44×44px.
