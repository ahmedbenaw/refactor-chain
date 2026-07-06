# Worked example — conducting a review-class task

## Before (the method run by hand)

The v4.6.6 hardening wave was run manually: a person invoked a 20-skill chain, said "go second pass", "go third pass", assigned spec-kit commands per task, and augmented with skills from other plugins. It worked — 8 blockers found and fixed — but nothing in the plugin encoded it, so it could not be re-run or generalized.

## After (the Conductor)

```
# 1. Conduct the task — emit the chain of skills as data (read-only)
node "$DIR/orchestrate.mjs" conduct --target . --task audit --phase gate --caps review,security,architecture
# → { spine, chain:[...→refactor-review-gate], perTask:{rootCause, guards, reviewLens, boardLens,
#     specKit:[/analyze], externalSkills:[/tech-debt, /code-review, ...]},
#     dispatch:{ parallel:[lens:architecture, lens:security, ..., /tech-debt], sequential:[...] },
#     fastPath:false }

# 2. Dispatch: parallel[] concurrently (lenses + external skills), sequential[] in order.

# 3. Run the multi-pass review loop until dry (>=3 rounds for this review-class target)
node "$DIR/orchestrate.mjs" review-loop-plan --target . --review-class
#   dispatch finders (board prompts) → record each lens (concurrency-safe, per-lens files)
node "$DIR/orchestrate.mjs" review-loop-aggregate --target .
#   → { rounds:1, dryRounds:0, shouldContinue:true }   (below the floor — keep going)
#   ... rounds 2 and 3 ...
node "$DIR/orchestrate.mjs" review-loop-aggregate --target . --final
#   → refused until rounds>=3 AND 2 dry rounds; then loopComplete:true

# 4. Artifacts: SPEC.md + sprint-plan.md shaped from the ledger; history.jsonl appended.
```

## The fast path (trivial work)

```
node "$DIR/orchestrate.mjs" conduct --target . --lane debug --case whats-wrong
# → fastPath:true — a single verify-and-refute pass, not the >=3 loop.
```

## What changed

The method is now deterministic, resumable, async-first (host-dispatched), and mode-aware. The same chain a person ran by hand is emitted as data and reproduced byte-for-byte.
