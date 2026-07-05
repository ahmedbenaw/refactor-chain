# Sequential reasoning protocol (shared)

Used by `refactor-diagnose`, `refactor-plan-gate`, and `refactor-adversarial-verify`
whenever a conclusion matters more than the speed of reaching it. The protocol makes
thinking auditable: numbered steps, revisions on the record, branches tracked, and
confidence stated — so a later reader (human or chain) can see not just the answer
but the road, including the wrong turns.

## The form

Reason in **numbered thought steps**. Each step is one move: an observation, an
inference, a check to run, or a decision. One idea per step — if a step needs the
word "and also", it is two steps.

```
1. [observe] state.json says lane=web, confidence 0.55 — low enough to distrust.
2. [infer] pom.xml at the root suggests Java; web lane may be a misclassification.
3. [check] ls src/ → src/main/java + src/main/webapp exist. Mixed repo.
4. [decide] treat as backend lane with a web sublane. (confidence: medium)
```

## Revising — never rewrite history

New evidence does not edit an earlier step; it adds a step that **names what it
revises**: `7. [revise — revises step 4] the webapp dir is dead code (no build
reference); pure backend lane.` The superseded step stays visible. A chain of thought
that can be silently rewritten cannot be trusted or debugged — and revisions are
where diagnose learns and adversarial-verify draws blood.

## Branching — parallel possibilities, tracked

When two explanations or plans are live at once, fork explicitly and give each
branch a label: `5a. [branch: stale-cache] …` / `5b. [branch: race] …`. Steps inside
a branch carry its label. Close every branch on the record — merged, confirmed, or
killed with the step that killed it (`8. [close 5a] cache cleared, bug persists —
stale-cache is dead`). An unclosed branch at the end of reasoning is an unknown that
belongs in the plan's unknowns list, not a loose thread.

## Confidence notes

Mark any step whose conclusion later work will lean on: `(confidence: high | medium
| low — <one clause why>)`. Low-confidence steps are the priority targets — for the
next `[check]` step during diagnosis, and for attack during adversarial verification.
A conclusion built on an unmarked pile of low-confidence steps is the protocol's
definition of a guess.

## When to stop

Stop when one of these is true, and say which:

- **Converged** — the last check confirmed the leading branch and no live branch
  contradicts it.
- **Good enough to act** — remaining uncertainty is cheaper to resolve by doing the
  next chain step (with the fence and safety net behind you) than by more thinking.
- **Budget** — roughly a dozen steps without convergence means the missing piece is
  evidence, not reasoning; go run a command (live-truth) instead of another lap.

Never stop by trailing off. The final step is always `[decide]` or `[park]`, with a
confidence note.

## Per-phase emphasis

- **diagnose:** heavy on `[check]`; every signal claim verified live; branches for
  competing lane classifications.
- **plan-gate:** branches for candidate step orders; low-confidence steps become the
  plan's unknowns, each with a resolution path.
- **adversarial-verify:** the attacker runs its own numbered trace trying to break
  the original's weakest (lowest-confidence) steps; a defense that requires rewriting
  history fails.
