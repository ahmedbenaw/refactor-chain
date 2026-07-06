# refactor-scope-fence — full method

## Fence mechanics (what already exists — do not reinvent)

- **Declaration:** each chain step may carry `scope: ["path/prefix", …]` in
  `state.steps[cursor]` inside `<target>/.refactor-chain/state.json`. Prefixes are
  plain substrings of the edited file path (the guard uses `editedFile.includes(p)`),
  so `"src/components/"` fences that subtree.
- **Signal:** the global PostToolUse guard
  (`~/.claude/skills/refactor-chain/scripts/guard.mjs`) fires on `Edit|Write|MultiEdit`.
  Fast-path dormant when no `state.json` exists. When active it: (1) records the edit
  via `orchestrate.mjs record-edit --file <f> --target <cwd>`; (2) prints the standing
  reminder (step N/M, health, re-verify); (3) if `scope` is a non-empty array and the
  edited path matches no prefix, appends:
  `⚑ scope-drift: <file> is outside this step's declared scope (<prefixes>) — flag it
  for the write-up instead of expanding the step.`
- **Guarantees:** advisory only — the guard never blocks a tool call and never throws.
  Enforcement is this skill's discipline, not the hook's veto.

## Drift classification (every ⚑ flag gets exactly one)

| Class | What it means | Response |
| --- | --- | --- |
| **Mistake** | Edited the wrong file / overshot | Revert; redo inside the fence |
| **Required** | The step genuinely can't succeed without it (scope declared too narrow) | Checkpoint (below); if approved, record the widened scope + rationale in state |
| **Adjacent** | A real problem, but not this step's problem | Revert any edit; park with a note |

"No response" is not a class. An unclassified flag at step end fails the sweep.

## Parked-note format

Appended to the current step's `notes` in state (via the harness, not hand-editing
beyond the sanctioned note write), one line each:

```
parked: <path> — <what is wrong, one clause> — <why it matters, one clause> [found during step <N> <skill>]
```

Rules:
- Concrete location (path, ideally symbol/line), not "the API layer is messy".
- No fix included — parking records the problem, not a solution sketch.
- Every parked note must reappear in `refactor-write-up`'s parked-items section and is
  a candidate for `refactor-memory` capture at session end. A parked item that appears
  nowhere downstream was silently dropped — audit for this in the sweep.

## The mid-chat checkpoint (scripted)

Trigger: a *legitimate* pull outside the fence — a discovered dependency, a user
mid-step request, a "required" drift classification.

Ask exactly one question, with a recommendation:

> "That's outside this step's scope (`<prefixes>`). Two options:
> **(a) new step** — I append it to the chain with its own scope and verify, and we do
> it deliberately after this step; **(b) park** — I write it down for the write-up and
> we keep moving. I'd pick <a|b> because <one clause>."

Recommendation heuristic:
- Blocks this step's success criteria → **new step** (or, if it invalidates the plan,
  pause and revisit the plan note first).
- Merely nearby / independent → **park**.
- User explicitly asked for it now and it's small → still a new step, never a silent
  widen — a one-edit step is cheap and keeps the diff honest.

Record the answer in the step notes. The forbidden third option is quietly doing the
work inside the current step.

## Step-end sweep

Before the step's verify and `advance`:

1. List every `⚑ scope-drift` flag emitted during the step (the guard recorded each
   edit; the transcript shows each flag).
2. Confirm each has a classification and its response happened (revert landed / new
   step appended / parked note present in state).
3. Confirm the step's diff (`git diff --name-only` vs. the step's start) contains only
   in-scope paths plus checkpoint-approved widenings.
4. Fill the scope ledger (`templates/output.md`).

## Edge cases

- **Step with no scope:** derive one from the plan's step order, record it in the step
  notes, and proceed. Never treat "no fence" as "everything allowed".
- **Shared files** (a barrel `index.ts`, a lockfile) legitimately touched by many
  steps: include them in the scope declaration explicitly rather than tolerating
  recurring flags.
- **Formatting ripples** (a formatter touching out-of-scope files): revert the
  out-of-scope hunks; run formatters scoped to the fence.
