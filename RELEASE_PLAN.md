# clawsout Release Plan — v1.2 through v2.0

**Goal**: make the best possible podcast generator by improving writing quality.

**Method**: PM council deliberated (5 PMs + head-of-production synthesizer, workflow `wf_8c1d2d1c-2eb`). Full rationale in `COUNCIL_NOTES.md`. Each release ships in its own git worktree on a feature branch.

**Picking up from here**: read `STATUS.md` first, then this file, then `COUNCIL_NOTES.md`.

## Current shipped: v1.1 (main)

- Source respect / no manufactured drama
- Lenny technique baseline
- 3-agent Tavily research pipeline
- Save & share via Vercel Blob
- Editable script + regenerate audio
- Voice cloning / dubbing / library voices

## Worktrees

| Version | Branch | Worktree path | Status |
|---|---|---|---|
| v1.2 | `release/v1.2` | `../clawsout-v1.2` | **in progress** |
| v1.3 | `release/v1.3` | `../clawsout-v1.3` | pending |
| v1.4 | `release/v1.4` | `../clawsout-v1.4` | pending |
| v2.0 | `release/v2.0` | `../clawsout-v2.0` | pending |

---

## v1.2 — Enforce the craft rules we already preach

**Theme**: prompt-only gates, zero schema changes, ships today  
**Tagline**: Turn the four most-cited writing rules from passive aspirations into hard, self-audited gates — all inside `lib/prompts.ts`.  
**Total effort**: ~85 min

### Improvements

1. **AND/BUT/THEREFORE self-revision gate** — `lib/prompts.ts` — 20 min — must-have
   - Append a mandatory SILENT final-pass to the end of `SHARED_RULES`: re-read the line sequence, name each beat connector (BUT/THEREFORE/AND-THEN), rewrite every AND-THEN.

2. **The Promise Line + plant-the-callback** — `lib/prompts.ts` — 25 min — must-have
   - THE PROMISE: after the opening image, plant ONE real unanswered question (not a table-of-contents).
   - RUNNERS & CALLBACKS: plant ONE vivid real detail early, reuse it ONCE near the close.

3. **Verbatim-quote vs paraphrase rule** — `lib/prompts.ts` — 20 min — must-have
   - "quote" may only precede words literally in the SOURCE.
   - Research is NEVER rendered as a quote from a named participant.

4. **Audio tags: pause-as-punctuation, front-loaded, one-per-line** — `lib/prompts.ts` — 20 min — should-have
   - Emotion/pace tags at the FRONT. `[pauses]` before reveals, not after punchlines. Max one tag per line.

---

## v1.3 — Structure and sourcing as inspectable artifacts; tone made audible

**Theme**: tracked fields, render unused snippets, bind voice physics  
**Total effort**: ~190 min

1. **Driving question as a tracked JSON field** — `lib/prompts.ts`, `lib/llm.ts`, `lib/types.ts`, `lib/storage.ts` — 70 min — must-have
2. **Per-claim research sourcing** — `lib/prompts.ts` — 35 min — should-have
3. **Specificity-is-the-joke rule** — `lib/prompts.ts` — 30 min — should-have
4. **Tie ElevenLabs voice physics to Claws-Out level** — `lib/tts.ts`, `app/api/tts/route.ts`, `app/page.tsx` — 55 min — should-have

---

## v1.4 — Commit to an argument; let the record disagree fairly

**Theme**: premise-first generation, HOST_B as deadpan reactor, contradiction-classifier  
**Total effort**: ~210 min

1. **Premise-first generation** — `lib/prompts.ts`, `lib/llm.ts`, `lib/types.ts`, `lib/storage.ts` — 90 min — must-have
2. **HOST_B as deadpan reactor + anti-laugh-track** — `lib/prompts.ts` — 45 min — should-have
3. **Surface contradicting research as fair tension** — `lib/research.ts`, `lib/prompts.ts` — 75 min — should-have

---

## v2.0 — From one-pass generator to a directed studio

**Theme**: beat sheet first, synthesize in context, become a show  
**Total effort**: ~1080 min

1. **Two-pass generation: beat sheet then dialogue** — `lib/structure.ts` (new), `lib/prompts.ts`, `lib/llm.ts`, `app/api/script/route.ts`, `app/page.tsx` — 300 min — must-have
2. **Conversational request-stitching + real inter-line breath** — `lib/tts.ts`, `app/api/tts/route.ts` — 240 min — must-have
3. **Persistent host frame** — `lib/types.ts`, `lib/storage.ts`, `lib/prompts.ts`, `app/api/script/route.ts` — 240 min — should-have
4. **Editorial review agents** — `lib/editors.ts` (new), `app/api/script/route.ts`, `app/page.tsx`, `lib/prompts.ts` — 300 min — nice-to-have

---

_Full rationale for every decision in `COUNCIL_NOTES.md`. Loop status in `STATUS.md`._
