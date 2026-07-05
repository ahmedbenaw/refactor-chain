# refactor-reimagine — full method, design lenses & migration patterns

Advisory-only. This skill proposes a bolder target architecture; it never edits
code. Its whole output is a proposal document. Behavior-preserving refactoring is
the chain's default; reimagining is the opt-in exception. Say so first, every time.

## The frame you must set before anything else

Open with the contract, plainly:
1. "This is a proposal. I will not change any code."
2. "The safe default is a behavior-preserving cleanup; this is bolder and optional."
3. "If you like a direction, I break it into small reversible steps and hand each
   to `refactor-transform`, which verifies behavior stays identical. You can stop
   anytime."

Only proceed to design work after that frame is stated.

## Ground the proposal (don't redesign what isn't hurting)

Pull from:
- `refactor-understand` — what the system is, its stack and entry points.
- `refactor-assessment-map` (if run) — coupling, dependency edges, hotspots
  (files that change most and hurt most), god-objects, cycles.

Name the **specific** structural pain with evidence. "This is old" is not a
reason. "`BillingService` has 41 inbound couplings and churns in 60% of PRs, and
pricing can't be tested without a live DB" is a reason. If the evidence is thin,
the honest proposal is **Option 0: minimal safe cleanup** — and you should say so.

## Design lenses (generate candidates through these)

Look at the pain through each lens and let 2–3 candidate target shapes emerge:

- **Boundaries:** where should a hard seam exist that doesn't? (module, package,
  service, bounded context). What leaks across a boundary that shouldn't?
- **Layering:** is the layer stack honest? Are responsibilities in the right
  layer? Should a layer be added (e.g. a domain layer with no framework imports)
  or collapsed (an anemic passthrough)?
- **Coupling → cohesion:** which things change together but live apart (should be
  together), and which live together but change independently (should be split)?
- **Dependency direction:** do dependencies point the right way (inward toward
  policy, outward toward detail)? Would inverting a dependency remove a knot
  (ports & adapters / hexagonal)?
- **Seams for testability:** where would introducing an interface/boundary make a
  currently-untestable thing testable in isolation?
- **State & data ownership:** who owns which data? Is shared mutable state the
  real coupling?

Common target shapes these produce: extract-by-responsibility (split a
god-object into focused services), ports-and-adapters / hexagonal, a proper
layered architecture, a bounded-context split, CQRS-lite (separate read/write
paths), or an event/message boundary. Choose shapes that fit the *actual* pain,
not fashion.

## Option-scoring rubric

Score every candidate — including **Option 0 (do nothing / minimal cleanup)** as
the baseline — on:

| Criterion | Question |
|-----------|----------|
| Solves core pain | Does it actually remove the named pain? |
| Effort / cost | How much work and churn? |
| Risk | What can go wrong; is it mitigable? |
| Testability gained | Does it make hard-to-test things testable? |
| Reversibility | Can you back out mid-migration? |
| Team familiarity | Does the team already know this pattern? |

Rules:
- Always include Option 0. Never present the bold option as the only choice.
- Bolder is not automatically better. If Option 0 wins on the evidence, recommend
  it.
- Make the recommendation **falsifiable**: "choose X if <condition>; avoid X if
  <condition>." A recommendation with no "avoid if" is a red flag.

## Migration sketch (always incremental, never big-bang)

If a bold option is recommended, sketch how to get there in small,
behavior-preserving, independently shippable steps. Use one of:

- **Strangler fig:** stand up the new shape beside the old, route slices of
  traffic/callers over one at a time, retire the old when empty.
- **Branch by abstraction:** introduce an abstraction over the thing you want to
  change, migrate callers to it, swap the implementation behind it, then remove
  the abstraction if desired.
- **Seam-first extraction:** create the seam (an interface / a boundary) first as
  a pure behavior-preserving step, then move code across it.

Each step must be:
- **Behavior-preserving** — something `refactor-transform` can execute and verify
  with the recorded baseline (identical pass-set).
- **Independently shippable** — the system works after each step.
- **Reversible** — you can stop or roll back after any step.

Never hand `refactor-transform` a "rewrite it all" step. If a step can't be made
behavior-preserving and small, it isn't ready — decompose it further or flag it.

## The opt-in gate

End with an explicit choice. Nothing is executed until the human checks a box:
- proceed with Option X → hand approved steps to `refactor-transform` one at a
  time; or
- not now → discard the proposal, return to the default cleanup.

"Interesting" / "maybe" / silence is **not** consent. Ask again, plainly.

## Hard rules
- Never edit code in this skill.
- Never skip Option 0.
- Never present a big-bang migration.
- Never proceed without explicit opt-in.
- Keep identifiers/module names/paths verbatim in `backticks`.
