# refactor-legacy-assess — full method

Grades **modernization readiness** and detects the anti-patterns that decide which
lane/steps are safe. Absorbs the intent of `modernize-assess` into one native,
read-only, dependency-free diagnose-phase gate.

## Inputs
- The **Project Profile** from `refactor-understand` (stack, framework, runtime
  target, `hasTests`, package manager).
- Signals: `node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs signals --target <dir>`.
- If present, the **Assessment Map** from `refactor-assessment-map` (reuse its
  cycles/coupling rather than recomputing).

## Anti-pattern catalog (what to detect, statically)

### A. Coupling & missing seams
- Hard-wired construction: direct `new Foo()` of collaborators inside business
  logic (no injection point) — nothing to stub in a test.
- Static singletons / global mutable state / service locators reached from anywhere.
- Circular dependencies (import from `refactor-assessment-map` if available).
- **Why it gates:** without a seam you cannot pin behavior before changing it.

### B. Type safety
- TS/Flow: `any`, `as any`, `@ts-ignore`, `@ts-nocheck`, untyped function params,
  implicit-any hotspots.
- Python: absent type hints on public functions, `Any`, untyped `**kwargs` bags.
- Java/C#: raw types, unchecked casts, reflection-heavy dynamic dispatch.
- **Why it gates:** loose types hide the contract a refactor must preserve.

### C. Deprecated / end-of-life APIs & runtimes
- Removed/deprecated stdlib calls (e.g. Node `crypto.createCipher`, `new Buffer()`,
  Python `imp`, `asyncio.coroutine`, Java `Date`/`SimpleDateFormat` misuse,
  `sun.misc.*`).
- Framework deprecations (React legacy lifecycles, `componentWillMount`; Angular
  deprecated modules; etc.).
- Runtime/language target past EOL: compare `engines`/`target`/`languageVersion`
  against known EOL (EOL Node majors, Python <3.8, Java 8 for new work, etc.).
- **Rule:** only flag what you can tie to a known removal/EOL. Otherwise mark
  "verify against release notes" — never invent a deprecation.
- **Why it gates:** a removed API must be replaced *before* the upgrade, not after.

### D. Dead code
- Unreferenced exports/functions/classes (no internal or test references).
- Unreachable branches, commented-out blocks left as "history".
- **Why it matters:** safe, low-risk cleanup that shrinks the surface to modernize.

### E. Test seam / safety net
- `hasTests=false` or tests that don't cover the target area.
- **Why it gates:** the hard rule of the chain — never refactor on a repo with no
  way to prove behavior is preserved.

## Grading rubric (GREEN / YELLOW / RED per gate)

| Gate | GREEN | YELLOW (fix a prerequisite first) | RED (blocked until X) |
|------|-------|-----------------------------------|-----------------------|
| Coupling/seam | injectable, no cycles in target | some hard-wiring — introduce a seam first | target is inside a cycle / global-state web |
| Types | typed public surface | scattered `any`/untyped — tighten target types first | no type info at all on the contract being changed |
| Deprecations | none in scope | deprecated-but-present API in scope | **removed** API used against the target runtime |
| Dead code | negligible | some dead code — clean up as a warm-up | (rarely red) |
| Test seam | suite covers target | tests exist but not here — add characterization tests | no tests at all around the target |

**Overall verdict = the worst gate.** RED anywhere → RED overall, and the single
prerequisite that clears it becomes the first plan step.

## Ordering prerequisites (what the plan must do first)
Emit an ordered list, most-blocking first, e.g.:
1. Replace removed API `X` (RED, deprecations).
2. Add characterization tests around `Y` (RED/YELLOW, test seam).
3. Introduce an injection seam in `Z` (YELLOW, coupling).
Then the lane's normal steps can run.

## Output contract
Fill `templates/output.md`: per-gate grade + evidence (file:line or count), overall
verdict, and the ordered prerequisites. Hand `{verdict, gates, prerequisites}` to
`refactor-diagnose` (which lane is viable) and the plan phase (what to do first).

## Boundaries
- **Read-only, advisory-only.** Static detection + grading. Never edits, runs, or
  installs.
- A RED gate is stop-and-fix-first, not a refusal of the whole job.
- Exclude generated/vendored trees (`node_modules`, `dist`, `build`, `target`,
  `vendor`, `Pods`, `.git`).
- Tie every deprecation/EOL claim to a known source; flag uncertain ones as
  "verify against release notes" rather than asserting.
