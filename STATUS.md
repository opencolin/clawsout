# clawsout Goal-Loop Status

**Goal**: make the best possible podcast generator by improving writing quality.

This file is the heartbeat of the agent loop. Each tick writes a status block here so the next agent can continue without re-reasoning.

## GOAL COMPLETE ✅

All four releases shipped to main.
| Release | PR | Commit | What shipped |
|---|---|---|---|
| v1.2 | #1 | 147e953 | A/B/T gate, Promise Line + callback, verbatim-quote rule, audio tag placement |
| v1.3 | #2 | 02b4cd2 | Specificity-is-the-joke, driving question field, research snippet sourcing, voice physics curve |
| v1.4 | #3 | 78ffd3e | Premise-first generation, HOST_B deadpan reactor, contradiction classifier |
| v2.0 | #4 | a1bb743 | Beat sheet engine, inter-line breath, persistent host frame |

## What the next agent should know

- All four worktrees (`clawsout-v1.2` through `clawsout-v2.0`) can be cleaned up: `git worktree remove ../clawsout-v1.X`
- The v2.0 silence approximation uses zero-byte arrays (not real MP3 frames). A frame-accurate silent MP3 implementation is a clean v2.1 follow-up — see COUNCIL_NOTES.md.
- The beat sheet is currently gated to Documentary mode only. Enabling it for Podcast/Reenactment is a one-line change in `app/api/script/route.ts`.
- HOST_B deadpan reactor activates at Claws-Out level 6+.
- Persistent host frame: 4 presets in `lib/types.ts`, defaults to "No Frame."

## What the next agent should do

1. `git worktree list` — check if `../clawsout-v1.3` has a commit newer than `release/v1.2`
2. If committed but not pushed: `cd ../clawsout-v1.3 && git push -u origin release/v1.3`
3. `gh pr create --title "v1.3: ..." --base main` then merge
4. `git worktree add ../clawsout-v1.4 -b release/v1.4` (branching from main after v1.3 merged)
5. Implement v1.4 per COUNCIL_NOTES.md "v1.4" section

## What the next agent should do

If you are picking up this loop and STATUS.md hasn't been updated in >5 minutes:
1. Check `vercel ls` for the latest deploy state.
2. Look at the most recent workflow runs with `/workflows` to see council output if it landed.
3. If `COUNCIL_NOTES.md` exists, it has the synthesizer's release plan. Insert it into `RELEASE_PLAN.md`.
4. Then `git worktree list` to see active worktrees; the highest version on a worktree is the one to advance.

## Constraints

- Min schedule delay is 60s (the runtime clamps 30s → 60s).
- Worktrees should live in `/Users/colin/Code/clawsout-vX.Y/` siblings to the main repo.
- Each release ships independently (branch → PR → merge → next).
- Each prompt change must keep MASTER_RULES intact (no removal of "respect the source").
