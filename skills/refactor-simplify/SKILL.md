---
name: refactor-simplify
description: "Use this skill for a quality-only simplification pass over changed code — improving reuse, removing dead code, fixing altitude (over/under-abstraction), and sharpening clarity — while preserving behavior EXACTLY. It applies the fixes. Trigger phrases include \"simplify this\", \"clean this up\", \"reduce the boilerplate\", \"this is over-engineered\", \"remove the dead code\", \"de-duplicate this\", \"make it clearer\", \"too many layers here\". It does NOT hunt for bugs, security issues, or performance problems — quality only; use refactor-review-gate / refactor-security / refactor-performance for those. This is a quality pass that runs in the do-the-work phase (or as a review-phase cleanup) of the refactor-chain pipeline. Behavior-preserving by contract — it edits code, but only in verified, reversible increments that keep behavior identical."
---

# Quality-Only Simplification Pass — refactor-chain · do-the-work / review

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (a cleanup step) or review (a pre-gate polish) · **Prerequisite:** there is code to simplify and a green baseline (`refactor-safety-net`) · **Next:** `refactor-verify` proves behavior held; then the review gate.
**Adaptivity / conditional:** repo-agnostic. Behavior-preserving by contract — it *applies* fixes, unlike the advisory reviewers.

## Purpose
Make the changed code simpler and clearer **without changing what it does and without hunting for bugs.** This is a focused quality pass with exactly four lenses: **reuse** (stop reinventing what already exists), **dead-code removal** (delete what nothing reaches), **altitude** (put each piece at the right level of abstraction — collapse needless layers, or add the one that's genuinely missing), and **clarity** (names, shape, and flow that read straight through). It *applies* the simplifications in small, verified, reversible steps — it is not advisory. It deliberately stays in its lane: it does **not** look for correctness bugs, security holes, or performance regressions. If it notices one in passing, it notes it and leaves it for the reviewers; it does not fix it here.

## When to use
- The change works but reads as bloated, duplicated, or over-built. Triggers: "simplify this", "clean this up", "reduce the boilerplate", "this is over-engineered".
- There's obviously dead or duplicated code. Triggers: "remove the dead code", "de-duplicate this", "we have this helper twice".
- The abstraction level is off. Triggers: "too many layers here", "this indirection is pointless", "just inline it".
- As the polish step before the review gate, to shrink the diff to its clearest form.
- Precondition: a green baseline so every simplification can be proven behavior-preserving.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm making this simpler and clearer — same behavior, guaranteed. I'm **not** bug-hunting or security-checking; that's a different pass. Your code keeps working exactly the same."
- "Found 4 easy wins: one helper you already have (reuse it), a dead branch nothing calls (delete it), a wrapper that just forwards (inline it), and a variable named `data` that's really the `invoice` (rename it)."
- "One decision for you: this three-layer indirection could collapse to one function. It's a bigger move — want me to do it, or leave it?"
- "Doing them one at a time, verifying behavior after each. If any step changed behavior, I undo it immediately — undo is always one step away."
- "That indirection I removed: the tests still pass, so behavior is unchanged. On to the next one."
- "I did spot something that *looks* like a possible bug on line 90 — I did **not** touch it (out of my lane); I've noted it for the review gate."

## Method
1. **Confirm the baseline is green.** A simplification is only safe if you can prove behavior didn't move. Check `refactor-verify` / `orchestrate.mjs status` shows `baseline: true`. No baseline → get one first (`refactor-safety-net`).
2. **Scan the changed code through the four lenses** (`scripts/checklist.mjs` carries them): **reuse** (duplicated logic; a hand-rolled thing the stdlib/existing helper already does), **dead code** (unreachable branches, unused exports/params/vars, commented-out blocks, feature flags that are always one value), **altitude** (pass-through wrappers, one-implementation "interfaces," premature generality — and the rarer *missing* seam where one clarifying function would help), **clarity** (names that state mechanics not intent, deep nesting, long boolean chains, a function doing two things). See `references/method.md` for the full catalogue and the "is this in my lane?" test.
3. **Apply each simplification as a small, reversible step.** One transformation per step: reuse → replace the duplicate with the shared thing; dead code → delete; altitude → inline the needless layer (or extract the one missing function); clarity → rename / flatten / split. Use type-aware rename so the compiler lists every site.
4. **Verify behavior after every step.** Re-run the baseline (`refactor-verify`). Identical pass-set → keep the step. Any drift → **undo that step immediately** and try a smaller version or skip it. Never let a simplification change behavior.
5. **Ask before the big moves.** A large collapse (merging layers, reshaping a public contract) is offered as a one-line choice, not done silently. Small local wins (delete dead branch, rename a local) proceed.
6. **Report what got simpler — and what you left alone.** Fill `templates/output.md`: each simplification (lens → what → where → how behavior stayed identical), the deliberately-skipped bigger moves, and — separately — anything that *looked* like a bug/security/perf issue that you noted and did **not** touch.

## Guardrails
- **Behavior is preserved — the one invariant.** Prove it after every step with the baseline. A change that alters output, side effects, errors, ordering, or timing is a rewrite, not a simplification — undo it.
- **Quality only — NOT a bug hunt.** This skill does not look for correctness, security, or performance defects. If it spots one, it **notes and leaves it** for `refactor-review-gate` / `refactor-security` / `refactor-performance`. Fixing a bug here would smuggle a behavior change into a "cleanup."
- **Simpler, not just different.** Every step must make the code genuinely smaller/clearer. Don't trade one style for an equal one; don't add abstraction speculatively (YAGNI).
- **Right altitude, both directions.** Remove needless layers *and* resist the urge to over-abstract; the rare correct move is adding the one seam that clarifies, not a framework.
- **Stay in the diff.** Simplify what's in scope thoroughly; note unrelated smells elsewhere without dragging them in.

## Verify
- Plain-language: "The code is shorter and clearer and does exactly the same thing — proven by the tests passing after each change. Anything that looked like a real bug I left untouched and flagged."
- Technical: the baseline pass-set is identical after every step (`refactor-verify` clean); each simplification is a discrete reversible commit tagged with its lens (reuse/dead-code/altitude/clarity); the diff is strictly smaller or clearer with no behavior delta; no correctness/security/perf "fixes" are present; anything spotted out-of-lane is listed as a note, not a change; `scripts/checklist.mjs` ran.

## Guidelines engine (default mandatory)

Before and after the pass, run the conformance engine: `node <plugin>/scripts/lib/guidelines.mjs extract|audit --target <project>` — simplification must move the codebase TOWARD its own observed conventions, never away. The final `eval` must stay at 100% PASS (or a recorded exception); see `refactor-rules` for the manifest and templates.

## Resources
- `references/method.md` — the four-lens catalogue, the "in my lane vs not" test, the safe-move mechanics, and the altitude (over/under-abstraction) rules.
- `examples/before-after.md` — a worked pass: bloated code before, simplified after, with the behavior-preservation proof and the out-of-lane note.
- `scripts/checklist.mjs` — zero-dep Node script that prints the four-lens simplification checklist as JSON.
- `templates/output.md` — the simplification report scaffold the skill fills in.

## Chain position
Runs in **do-the-work** as a cleanup step, or in **review** as the polish before the gate. It pairs with `refactor-code-principles` (the SOLID/layering consolidation) but is narrower: pure simplification, no architecture theory. Every step is proven by `refactor-verify` against the `refactor-safety-net` baseline. It hands a smaller, clearer diff to `refactor-review-gate`, and hands any out-of-lane observations (possible bugs/security/perf) to the reviewers rather than acting on them.
