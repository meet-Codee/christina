# Hackathon brief

**Event:** ForMa 24h Online Hackathon (with AKSHATH), 30–31 October 2026
**Track:** Education domain, EdTech and learning
**Problem statement:** PS-ED01, Regional Language AI Tutor & Homework Helper

## The problem (from PS-ED01)

Students studying in vernacular or regional mediums struggle to understand complex STEM concepts without local-language explanations. They also lack access to 24/7 personal tutors when stuck on homework.

## The challenge and goal

Build a voice-based AI tutor that explains difficult school concepts step by step in local languages and helps students solve doubts **without just giving away direct answers**.

## Key features required

1. Voice and audio explanations in native regional languages
2. Step-by-step guided hints instead of instant direct solutions
3. Photo upload of handwritten maths and science problems for guided walkthroughs

Suggested stack: Voice AI / TTS, multilingual LLMs, OCR, web or mobile app.

## Judging checklist (from the organisers)

| # | What they check | Where Christina covers it |
|---|---|---|
| 1 | The AI tools you are using | README "AI tools used" table, plus the in-app ⓘ "How Christina works" dialog with live service status |
| 2 | How relevant you are to the problem, and what solution you give | Every PS-ED01 feature, plus extras (see README and `docs/FEATURES.md`) |
| 3 | Video session | 2-minute demo script in README. Record a backup video |
| 4 | Tag the organisers on LinkedIn | Post draft in README. Replace the tags with their real handles |
| 5 | Keep it as simple as possible | One screen, three ways to ask (mic, camera, keyboard), no sign-up |
| 6 | Deploy on Render, Vercel or Netlify | **We use Vercel (or Netlify), not Render.** Steps in README |

## Non-negotiables for the build

- The tutor never gives the final answer. It nudges, teaches the concept, shows a similar example, or gives only the next step.
- It works in at least Kannada, Hindi and Tamil end to end (voice in, voice out, script on screen).
- It runs on free tiers: one free Gemini key is enough, and a Sarvam key is optional.
- The demo works on a phone and on a laptop projector.
