---
name: refactor-reimagine
description: "Use this skill when someone wants a BOLDER idea for how the code could be structured — not a safe cleanup, but a proposed target architecture or redesign (\"what would this look like if we did it right\", \"reimagine this module\", \"propose a better architecture\", \"is there a cleaner design\", \"give me a north-star for this code\", \"how would you re-architect this\"). It produces an ADVISORY design proposal — options, trade-offs, a recommended target, and a migration sketch — and NEVER changes code. Behavior-preserving refactoring stays the default; this skill only proposes, and any bolder move happens only if the user explicitly opts in and then hands the approved step to refactor-transform. This is the advisory branch of the do-the-work phase in the refactor-chain pipeline. Opt-in and advisory-only by definition."
---

# Reimagine — Advisory Target Architecture — refactor-chain · do-the-work (advisory)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (advisory branch) · **Prerequisite:** refactor-understand + (ideally) refactor-assessment-map · **Next:** nothing runs automatically — if and only if the user opts in, an approved step is handed to `refactor-transform`.
**Adaptivity / conditional:** **advisory-only and opt-in.** This skill proposes; it never edits code. It is off the default path — the chain does behavior-preserving refactoring unless the human explicitly asks to reimagine.

## Purpose
Behavior-preserving refactoring makes existing code cleaner without changing what
it does or how it's shaped at the large scale. Sometimes that's not enough — the
*shape itself* is the problem (a god-object, a tangled layering, a missing
boundary). This skill steps back and proposes a **bolder target design**: two or
three candidate architectures, honest trade-offs, a recommended one, and a
*sketch* of how you'd migrate there incrementally. It is a thinking tool and a
proposal document. **It writes a proposal, not code.** Nothing changes unless the
human reads it, picks a direction, and explicitly opts in — at which point each
approved step is executed by `refactor-transform` under the usual
checkpoint→apply→verify safety loop.

## When to use
- The user wants a strategic redesign, not a tidy-up. Trigger: "reimagine this
  module", "propose a better architecture", "how would you re-architect this",
  "what's the north-star design".
- A cleanup keeps hitting a structural wall and someone asks "is there a cleaner
  design underneath". Trigger: "what would this look like if we did it right".
- Explicitly NOT for: "just clean this up", "modernize safely", "don't change the
  design" — those stay on the default behavior-preserving path.

## What I'll tell you (plain-language / ADHD-friendly)
- "This one's a thinking exercise, not a change. I will NOT touch your code — I'll
  hand you a proposal and you decide."
- "Here are 3 ways this could be shaped. For each: what gets better, what it
  costs, and what could go wrong. I'll recommend one, but it's your call."
- "The safe default is still 'clean it up without changing the design.' What I'm
  describing is bolder — only worth it if you want it."
- "If you like option B, I'll break it into small, reversible steps and hand each
  one to the transform skill, which checks behavior stays identical at every step.
  We stop the moment you want to stop."
- "Nothing here is committed. Say the word and I'll write it up; say 'not now' and
  we go back to the safe cleanup."
- "Want the deep version — diagrams, seams, a step-by-step migration? Say 'show
  technical details.'"

## Method
1. **State the frame up front.** Tell the user plainly: this is advisory, no code
   changes, behavior-preserving refactoring remains the default.
2. **Ground in reality.** Use `refactor-understand` (what it is) and, if present,
   `refactor-assessment-map` (where the debt/coupling/hotspots are). Name the
   specific structural pain — don't redesign what isn't hurting.
3. **Generate 2–3 candidate target designs.** For each: the shape (in words + a
   simple diagram), what problem it solves, and what it deliberately does NOT try
   to solve. See `references/method.md` for the design-lens catalog (boundaries,
   layering, coupling, cohesion, dependency direction, seams).
4. **Trade-off each honestly.** Benefits, costs, risks, and — critically — the
   **"do nothing / minimal"** option as a baseline. Bolder is not automatically
   better; say when it isn't worth it.
5. **Recommend one, with the reasoning.** Pick the target that best fits the
   team's constraints. Make the recommendation falsifiable ("choose this if X;
   avoid it if Y").
6. **Sketch an incremental migration.** Never a big-bang. A sequence of small,
   independently shippable, behavior-preserving steps — each one something
   `refactor-transform` could execute and verify. Identify the seams that make
   incremental change safe.
7. **Write it up and STOP.** Fill `templates/output.md`. Present it. Ask for an
   explicit opt-in before anything is handed to `refactor-transform`. If the user
   declines, the chain returns to the default path unchanged.

See `references/method.md` for the design lenses, the option-scoring rubric, and
migration-sketch patterns (strangler, branch-by-abstraction, seams).

## Guardrails
- **Advisory-only. This skill never edits code — not one line.** Its entire output
  is a proposal document.
- **Opt-in.** No approved step is executed until the human explicitly says yes.
  Silence, "hmm", or "interesting" is not consent.
- **Behavior-preserving refactoring stays the default.** Reimagining is the
  exception, chosen deliberately, never the assumed goal.
- Always include the minimal/do-nothing option; never present the bold option as
  the only one.
- Execution, if opted into, goes through `refactor-transform` step-by-step — this
  skill never hands over a big-bang rewrite.
- Keep identifiers, module names, and paths verbatim in `backticks`.

## Verify
- Plain-language: "You got a clear proposal with real options and trade-offs, a
  recommendation you can accept or reject, and your code is exactly as it was
  because I didn't touch it."
- Technical: a proposal file exists with ≥2 candidate designs, each with
  benefits/costs/risks; a `do-nothing` baseline is present; a recommendation with
  falsifiable conditions; an incremental (non-big-bang) migration sketch; and an
  explicit opt-in gate before any hand-off. Git working tree is unchanged.

## Resources
- `references/method.md` — design lenses, option-scoring rubric, migration patterns.
- `examples/before-after.md` — worked example (a god-service reimagined 3 ways, with the recommendation and migration sketch).
- `scripts/checklist.mjs` — zero-dep Node script; prints this skill's step checklist as JSON.
- `templates/output.md` — the design-proposal scaffold this skill fills in.

## Chain position
Sits on the advisory branch of do-the-work. Fed by `refactor-understand` and
`refactor-assessment-map`. It feeds **nothing automatically**; only on explicit
opt-in does an approved step flow to `refactor-transform`, which executes it under
checkpoint→apply→verify. `refactor-code-principles` and the review gate run near the end
of every lane — anything actually applied later passes through them.
