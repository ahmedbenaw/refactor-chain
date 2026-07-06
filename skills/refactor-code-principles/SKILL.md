---
name: refactor-code-principles
description: "Use this skill when working code needs its structure improved without changing what it does — trigger phrases include \"refactor this\", \"clean this up\", \"apply SOLID\", \"decouple these modules\", \"split this god class\", \"untangle this file\", \"introduce dependency injection\", \"reorganize the layers\". It is the principle-driven structural engine of the refactor-chain pipeline — it detects the stack, pulls the recommended software-engineering principle set from the registry, opens THE DECISION WINDOW (a mid-chat checkpoint where the user accepts the recommendation, mixes and matches, or deliberately picks an unconventional combination with risks stated plainly), then applies the chosen principles through the checkpoint→apply→verify loop. It also runs by default as the final consolidating step of every lane. Hard contract - it restructures WORKING code with behavior kept identical; it is NOT for adding features, fixing bugs, or writing test suites."
---

# Principle-Driven Structural Engine — refactor-chain · general lane / final pass

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (general lane), and the default final consolidating step of every lane · **Prerequisite:** a green baseline (`refactor-safety-net`) when run inside a chain; standalone otherwise · **Next:** the review gate.
**Adaptivity / conditional:** repo-agnostic — the principle set adapts to the detected stack via the registry.

## Purpose
Take code that already exists and already works, and restructure it so the next person finds it obvious — guided not by one fixed doctrine but by an explicit, user-approved set of engineering principles. The engine detects what the codebase is (via the diagnose harness), asks the principles registry what normally fits that stack, and then — this is the heart of the skill — **opens a decision window** where the human picks the principle set before a single line moves. The chosen principles become the diagnostic lens and the transform plan. Behavior is the one thing that never changes.

## When to use
- Working code with tangled structure: one unit doing several jobs, logic welded to I/O, duplication, deep coupling, conditionals that grow with every new variant.
- Trigger phrases: "refactor this", "clean this up", "apply SOLID", "split this class", "decouple X from Y", "this file does too much", "introduce DI", "restructure into layers".
- Automatically, appended by the orchestrator as the final consolidating pass after any other lane (backend, web, ui) finishes.
- NOT for: new features, bug fixes, or building test suites. If the code doesn't work yet, this is the wrong skill.

## What I'll tell you (plain-language / ADHD-friendly)
- "Your code keeps working exactly the same — I'm only changing how it's organized, and I prove that after every move."
- "I detected a TypeScript/React stack. Here's the principle set I'd normally apply to it — want that, want to swap pieces, or want to try something unconventional? One choice, then I work."
- "You picked an off-family combo (functional-core on an OO codebase). Totally allowed — here's the honest risk in one line before we start."
- "Step 3 of 7: splitting the order module along its two change-reasons. Checkpoint saved — undo is one command away."
- "That move broke the type-check — I rolled it back and I'm trying a smaller version (attempt 2 of 3)."
- "Done. Here's each change as smell → principle → fix, and what I deliberately left alone."

## Method
1. **Detect the stack.** Run `node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs classify --target <dir>` (or reuse the active chain's diagnosis from `orchestrate.mjs status`). Note the detected languages and families.
2. **Get the recommendation.** Run `node scripts/checklist.mjs --recommend <lang-ids>` — it calls `recommendPrinciples()` from the registry (`~/.claude/skills/refactor-chain/scripts/lib/principles.mjs`) and prints three buckets: the **agnostic baseline** (SOLID, GRASP, DRY/KISS/YAGNI, separation of concerns, cohesion/coupling, Demeter, composition-over-inheritance, CQS, layering, CUPID, Unix, fail-fast, least astonishment), the **family-mapped** principles for this stack, and the **other** (off-family) options.
3. **THE DECISION WINDOW — one mid-chat checkpoint, before any edit.** Present the recommendation as a short multi-choice:
   - **(a) Accept the recommendation** — the registry's set for this stack.
   - **(b) Mix and match** — the user picks from the full menu (each option shown with its one-line pitch).
   - **(c) Deliberately unconventional** — an off-family combination; state each principle's `risks` line plainly and confirm once.
   In **autopilot** mode, take the recommendation without waiting and *say so out loud*: "autopilot — applying the recommended set for <stack>."
4. **Record the choice.** Note the chosen set, who chose it (user or autopilot), and any accepted risks: in chain state via `orchestrate.mjs advance --note "principles: …"` at step completion, and in the write-up using the principle-choice record in `templates/output.md`.
5. **Diagnose through the chosen lens.** Read the target code; for each chosen principle, hunt its smells (catalogued per principle in `references/method.md`) and tag each finding `smell @ file:line → principle`.
6. **Apply through the checkpoint → apply → verify loop.** For each finding: `orchestrate.mjs checkpoint` (or a commit) → perform the principle's safe transform sequence from `references/method.md`, one reversible move at a time → verify (type-check / build / existing tests — the baseline). Clean → keep and continue; drift → roll back that move and retry smaller (self-heal budget applies). One transformation per commit.
7. **Report.** Fill `templates/output.md`: the principle-choice record, then each smell → principle → transform → proof-of-identical-behavior, then the deliberately-not-done list.

## Guardrails
- **Behavior is preserved — the hard contract.** Outputs, side effects, error types and messages, ordering, precision, and timing stay identical. A change that alters behavior is a rewrite, not a refactor; if the target can't be reached through behavior-preserving moves, stop and say so.
- **Working code only.** Not for features, bug fixes, or test authoring. A bug found along the way is noted for the reviewers, never fixed in-line.
- **No edits before the decision window closes.** The principle set is a recorded decision, not an assumption — autopilot decides, but it still announces and records.
- **Principles are a lens, not a license.** Every abstraction must pay for itself (a real second implementation, a genuine seam, a true boundary). If applying a principle makes the code bigger without making ownership clearer, choose the smaller design.
- **Unconventional combos are allowed, never silent.** Risks come from the registry's own `risks` lines plus `references/method.md`; state them before work starts.
- **Stay in scope.** Restructure what was asked, thoroughly; unrelated smells go in the report, not the diff.

## Verify
- Plain-language: "The code does exactly what it did before — every move was checked, and the record shows which principles you approved and why each change happened."
- Technical: type-check/build clean after every move; the baseline pass-set is identical (`refactor-verify` clean, `orchestrate.mjs advance --delta clean`); each commit is one behavior-preserving transformation tagged with its principle; the principle-choice record exists in state notes and the write-up; no silent drift in ordering, error text, null-vs-undefined, precision, or async timing; `scripts/checklist.mjs` steps all satisfied.

## Resources
- `references/method.md` — the full per-principle method: every registry principle in plain words, its smells, its safe transform sequence, and per-family idiom notes (C headers, OTP, RAII, contracts, DDD, functional core, data-oriented, 12-factor, component purity, POSIX, SQL, Nix).
- `examples/before-after.md` — two worked passes: an OO/SOLID split and a functional-core extraction.
- `scripts/checklist.mjs` — zero-dep Node script; prints the step checklist as JSON and, with `--recommend <ids>`, the registry's recommendation for a detected stack.
- `templates/output.md` — the principle-choice record + per-step report scaffold.

## Chain position
Runs standalone on request, or as the **final consolidating step appended to every lane** by the orchestrator (`buildSteps` always ends the chain with it before the gate). It consumes the diagnosis from `refactor-diagnose`, requires the `refactor-safety-net` baseline inside a chain, proves every move with `refactor-verify`, and hands its report to `refactor-review-gate`. `refactor-simplify` is its narrower sibling (pure cleanup, no principle theory); this skill owns the structural decisions.
