---
name: refactor-scope-fence
description: "Use this skill throughout the do-the-work phase to keep every edit inside the current step's declared scope — the path prefixes in `state.steps[cursor].scope`. The globally-registered PostToolUse guard hook already emits an advisory scope-drift flag when an edit lands outside those prefixes; this skill defines what to do with that flag. Trigger phrases include \"while I'm here I'll also fix\", \"this other file is broken too\", \"quick unrelated cleanup\", a ⚑ scope-drift flag appearing after an edit, or any temptation to widen a step mid-flight. Adjacent problems get FLAGGED and PARKED (state notes plus the write-up), never silently fixed; a mid-chat checkpoint offers pursue-as-new-step or park. A standing contract of the do-the-work phase — repo-agnostic, always on while a chain step is executing."
---

# Scope Fence — one step, one scope, nothing sneaks in — refactor-chain · do-the-work

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work — a standing contract over every executing step · **Prerequisite:** an active chain with a current step (`state.json` exists, `state.steps[cursor]` set) · **Next:** the step's own verify, then advance.
**Adaptivity / conditional:** repo-agnostic; active whenever a chain step is executing. The drift *signal* comes free from the guard hook; this skill supplies the discipline.

## Purpose
Every chain step declares its territory: `state.steps[cursor].scope`, a list of path
prefixes. Inside the fence, work proceeds; outside it, nothing gets edited — no matter
how broken, ugly, or tempting the adjacent code is. "While I'm here" is how a rename
becomes a rewrite, how diffs become unreviewable, and how a green baseline stops
meaning anything. Adjacent problems are treasure, not chores: they get **flagged and
parked** (a note in state plus a line in the write-up) so they become deliberate future
work instead of silent scope creep.

## When to use
- Always, while any chain step is executing edits — this is a standing contract, not an
  occasional check.
- The guard hook prints a `⚑ scope-drift` flag after an edit (see Method step 1 for
  exactly what fires it).
- You catch yourself thinking "while I'm here…", "this is a two-second fix", "this
  other bug is *right there*".
- The user asks mid-step to also handle something outside the current step's paths —
  that's the mid-chat checkpoint, not an automatic yes.

## What I'll tell you (plain-language / ADHD-friendly)
- "This step's territory is `src/components/` — I'll stay inside it. Anything broken elsewhere gets written down, not touched."
- "I spotted a real bug in `src/api/client.ts` while working. It's outside the fence, so I've parked it with a note — it won't be forgotten, and it won't sneak into this diff."
- "Quick decision, one question: you asked me to also fix the login redirect. That's outside this step. Do we (a) park it for later, or (b) add it as its own new step with its own verify? I'd park it."
- "That ⚑ flag you saw isn't an error — it's the fence telling us an edit landed outside this step's paths. I'm checking whether it belongs."
- "One step, one scope, one reviewable diff. You are here: step 3 of 7, fence = `src/components/`."

## Method
1. **Know how the fence signals.** The globally-registered PostToolUse guard
   (`~/.claude/skills/refactor-chain/scripts/guard.mjs`, on `Edit|Write|MultiEdit`) is
   dormant unless `<cwd>/.refactor-chain/state.json` exists. When a chain is active it
   records each edit via `orchestrate.mjs record-edit`, then — if the current step
   declares `scope` (an array of path prefixes) and the edited file matches **none** of
   them (substring test) — appends an advisory `⚑ scope-drift` flag naming the file and
   the declared scope. It never blocks the edit; the discipline is yours.
2. **Read the fence before editing.** At step start, state the current step's `scope`
   from `state.steps[cursor]` out loud ("this step's territory is …"). If a step has no
   declared scope, derive one from the plan and record it — an unfenced step is a fence
   bug, not a license.
3. **On drift — classify, don't just comply.** A flagged edit is either (a) a mistake
   → revert it and redo inside the fence; (b) genuinely required by this step (the
   scope was declared too narrow) → the **checkpoint** in step 5 decides; or (c) an
   adjacent problem you drifted into → revert and **park** it.
4. **Park adjacent problems, always.** Anything broken/ugly/wrong outside the fence:
   one-line note appended to the current step's `notes` in state (what, where, why it
   matters) — this is exactly what the guard's flag asks for — and it flows into
   `refactor-write-up`'s parked-items section. Silent fixing is forbidden even when
   the fix is one character. Format in `references/method.md`.
5. **Mid-chat checkpoint for real scope pressure.** When the pull is legitimate (a
   discovered dependency, a user request), stop and ask one question with a
   recommendation: **pursue as a new step** (append a properly-scoped step with its own
   verify) or **park** (note it; current step unchanged). Never the third option —
   quietly widening the current step. Heuristic: blocks this step's success criteria →
   new step; merely nearby → park.
6. **Sweep at step end.** Before verify/advance, list this step's flagged drifts:
   each is reverted, promoted to a new step, or parked with a note — none unaccounted.
   Fill `templates/output.md` (the scope ledger).

The `guard.mjs` PostToolUse hook not only surfaces the ⚑ drift message but **hard-flags it into `state.notes`** (via `orchestrate.mjs flag-drift`), so every drift is durably visible to the write-up and the improvement retro — it cannot be silently forgotten.

## Guardrails
- **Behavior-preserving AND diff-preserving:** the step's diff contains only files
  matching the declared scope, or a checkpoint decision explaining why the scope grew.
- The guard flag is advisory — treating it as noise is the failure mode this skill
  exists to prevent. Every flag gets classified (mistake / required / park).
- Parking is not rejection: every parked item must survive into state notes and the
  write-up, or it was silently dropped — as bad as silently fixed.
- The checkpoint is a real question to the user with a recommendation, never a silent
  default in either direction.

## Verify
- Plain: "Everything this step touched was inside its declared territory — and everything tempting outside it is written down with a name and a place, waiting its turn."
- Technical: every file in the step's diff matches a `state.steps[cursor].scope`
  prefix (or a recorded checkpoint decision widened it); every `⚑ scope-drift` flag
  emitted this step maps to a revert, a new step, or a parked note in state; the scope
  ledger in the write-up lists all parked items.

## Resources
- `references/method.md` — fence mechanics, drift classification, parked-note format, checkpoint script.
- `examples/before-after.md` — worked example: a "while I'm here" spiral vs. the same run fenced.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the scope ledger scaffold.

## Chain position
A standing contract over the **do-the-work** phase of every lane. It is fed by
`refactor-plan-gate` (which declares each step's scope) and by the guard hook's drift
flags; it feeds `refactor-write-up` (the parked-items section), the plan (new steps
from checkpoints), and `refactor-memory` (parked items are memory-worthy). It keeps
each step's diff small enough that `refactor-code-principles` + the review gate — which
still close every lane — review what the step claimed, no more.
