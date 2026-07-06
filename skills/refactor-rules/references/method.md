# refactor-rules — full method, rule catalog & detection heuristics

The job: infer the **project's own** structural rules from the patterns the code
already follows, write them into a rules manifest, and enforce that manifest as a
before/after checklist so a modernization step introduces no new structural
violation. This is descriptive-then-prescriptive: we describe what the code does,
confirm intent with a human, then hold future changes to it.

## Core principle: dominance, not existence

A rule is recorded only when its pattern is **dominant** — the established norm,
not a coincidence. Use these thresholds:

- **Strong rule (record as `ERROR`):** ≥ 90% of relevant sites conform AND ≥ 5
  sites exist. Example: 47 of 49 controllers go through a service.
- **Convention (record as `WARNING`):** 70–90% conform, or 3–4 sites at ≥ 90%.
- **Tendency (record as `SUGGESTION`):** 50–70% conform, or a clear-but-thin
  pattern (2 sites).
- **Not a rule:** < 50% conform, or only 1 site. Do not record. A single example
  is never a rule.

When in doubt, record at a *lower* severity and let the human upgrade it. Never
invent a rule the code does not already follow, and never import a rule from
"best practice" that the project itself does not honor — this skill extracts the
project's rules, not the industry's.

## Rule categories to scan

### 1. Dependency injection (`DI`)
- **What to look for:** constructor parameters typed as collaborators;
  framework annotations (`@Autowired`, `@Inject`, `@Component`, `@Service`,
  provider/module registration); factories. Counter-evidence: direct `new
  ServiceX()` / `new RepoY()` inside business classes.
- **Typical rules:** "Every service collaborator is constructor-injected; no
  direct `new` of another service/repository in business code." "No field
  injection — constructor only."
- **Detection:** count business classes that receive collaborators via
  constructor vs. those that `new` them inline. Violation = an inline `new` of a
  type that is elsewhere injected.

### 2. Naming
- **What to look for:** suffix/prefix conventions (`*Service`, `*Controller`,
  `*Repository`, `*Dto`, `*Mapper`, `use*` hooks, `I*` interfaces), file-vs-class
  name agreement, casing (camelCase/PascalCase/snake_case per language),
  directory-name ↔ symbol agreement.
- **Typical rules:** "Service classes end in `Service` and live under
  `service/`." "React hooks start with `use` and are camelCase."
- **Detection:** for each role folder, measure the fraction of members matching
  the suffix/case pattern. Violation = a member in the folder breaking the
  pattern.

### 3. Module / package boundaries
- **What to look for:** the import graph. Which packages import which. Public API
  surfaces (barrels / `index.ts`, `package-info`, exported symbols) vs. internals.
- **Typical rules:** "`core/` may not import from `web/` or `infra/`
  (dependencies point inward)." "Feature modules talk only through each other's
  public barrel, never deep-import internals." "No circular dependency between
  packages."
- **Detection:** build a coarse import graph (grep imports, map to top-level
  package). A rule violation = an edge that crosses a forbidden boundary or a
  cycle. Circular-dependency detection is its own rule and always `ERROR` when the
  project is otherwise acyclic.

### 4. Layering
- **What to look for:** the canonical stack (`controller → service → repository →
  db`, or `handler → usecase → gateway`). Which layer a type is allowed to
  reference.
- **Typical rules:** "Controllers never reference a repository/DAO directly."
  "Repositories never import a controller or a web/HTTP type." "Domain layer has
  no framework imports."
- **Detection:** classify each file into a layer (by folder + suffix), then check
  its imports against the allowed-downward set. Violation = an upward or
  skip-a-layer reference.

### 5. Error / return conventions
- **What to look for:** `Result`/`Either`/`Optional` vs. raw `null`; checked vs.
  unchecked exceptions; a shared error type; centralized error handling.
- **Typical rules:** "Public service methods return `Optional`/`Result`, never
  raw `null`." "Errors are thrown as the project's `AppError`, not generic
  `Error`."

### 6. Immutability / purity
- **What to look for:** `final`/`readonly`/`val` fields on value objects; absence
  of setters on DTOs; pure-function tendencies in a `util/`/`lib/` folder.
- **Typical rules:** "Value objects are immutable." "Utilities are pure (no I/O,
  no shared mutable state)."

## Producing the manifest

For each recorded rule, capture: `id` (`R01`…), plain-English statement,
`severity`, `detection` (the concrete signal you used, so it's re-runnable),
`conforming` count, `violating` count. Fill `templates/output.md`. Order rules
`ERROR` → `WARNING` → `SUGGESTION`.

Then **confirm with the human**. Present the manifest plainly. Any rule they say
is unintended is dropped (not silently kept). A rule they say is stricter than
detected can be upgraded in severity. Record vetoes with their reason in the
manifest's confirmation section — future runs should not re-propose a vetoed rule.

## Enforcement (before / after)

1. **Before:** for each rule, record the current `violating` count → the
   baseline. This runs *before* the modernization step touches anything.
2. **After:** re-run the identical detection *after* the step. For each rule,
   `newViolations = max(0, after − before)` plus any brand-new violating site.
3. **Verdict:**
   - Any new `ERROR` violation → `drift`. STOP the step, surface to the review
     gate, do not silently continue.
   - New `WARNING`/`SUGGESTION` only → `legal`, but attach the list so the review
     gate sees it.
   - No new violations → `legal`, clean.
4. **Harness signal:** emit `{ "delta": "legal" | "drift", "newViolations":
   [ { "rule": "R03", "file": "...", "detail": "..." } ] }`. This is the same
   `legal`/`drift` vocabulary `orchestrate.mjs advance --delta` consumes, so the
   result flows straight into the chain state without translation.

## What this skill must NOT do
- Do not edit code to fix a violation. Enforcement is advisory; fixing is the
  lane's job, gated by review.
- Do not record aspirational rules the code doesn't follow.
- Do not treat a one-off as a rule.
- Do not reformat or restate identifiers/paths — keep them verbatim.
