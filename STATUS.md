# clawsout Goal-Loop Status

**Goal**: make the best possible podcast generator by improving writing quality.

This file is the heartbeat of the agent loop. Each tick writes a status block here so the next agent can continue without re-reasoning.

## Latest tick

**Tick 5** — v1.2+v1.3 shipped, v1.4 in flight:
- **v1.2 SHIPPED** to main (PR #1, 147e953)
- **v1.3 SHIPPED** to main (PR #2, 02b4cd2)
- Worktree `../clawsout-v1.4` on branch `release/v1.4` created
- v1.4 implementation workflow `wf_8d28344d-512` running — premise-first, HOST_B reactor, contradiction classifier
- Waiting for task-notification

## Pending actions

1. ~~v1.2~~ → SHIPPED ✅
2. ~~v1.3~~ → SHIPPED ✅
3. ~~Create v1.4 worktree~~ → DONE (`../clawsout-v1.4`, `release/v1.4`)
4. **Waiting for**: `wf_8d28344d-512` (v1.4 implementation)
5. When done: push release/v1.4, open+merge PR #3 to main
6. Create `../clawsout-v2.0` worktree, implement v2.0 (4 big items)

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
