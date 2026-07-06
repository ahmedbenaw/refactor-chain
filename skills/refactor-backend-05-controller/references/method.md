# Controller-layer structure — full method

Deterministic rulebook behind `refactor-backend-05-controller`. Same tree + same rules ⇒
same report, same plan, same result. The check and fix flows share every algorithm below,
so a check finding is exactly a fix action.

## 1. Target layout

```
controller/
├── <external>/            # endpoints serving outside consumers (default: external/)
│   └── <businessGroup>/   # one folder per package-derived group
└── <internal>/            # framework/platform endpoints (default: internal/)
    └── <domain>/          # closed list per project, e.g. auth/, monitor/, api/
```

Audience names are project conventions (`external`/`internal`, `custom`/`common`,
`open`/`admin`, …). Detect an existing pair and keep it; otherwise propose the default
and confirm with the user. Below, `<EXT>`/`<INT>` mean whichever pair is in force.

## 2. Admission gate — annotation truth

A file is a controller **iff** it carries an active class-level `@RestController` or
`@Controller`. File name, directory, and "looks like" evidence are inadmissible.

### Regex table (use these exact patterns; do not improvise)

| ID | Detects | Pattern |
|---|---|---|
| GATE-RX-1 | active `@RestController` | `^\s*@RestController` |
| GATE-RX-2 | active `@Controller` (word-bounded, so `@ControllerAdvice` is not matched) | `^\s*@Controller\b` |
| GATE-RX-3 | line-commented annotation | `^\s*//.*@(Rest)?Controller` |
| GATE-RX-4 | block-commented annotation | `^\s*\*.*@(Rest)?Controller` |
| GATE-RX-5 | remote client | `^\s*@FeignClient` |
| GATE-RX-6 | other stereotypes | `^\s*@(Service|Component|Repository)\b` |
| GATE-RX-7 | remote-client package | `package\s+.*\.(rpc|feignclient|client)\.` |
| GATE-RX-8 | package declaration | `^package\s+` |

### Gate algorithm (fixed order)

```
gate(file):
  pkg = package path (GATE-RX-8)
  if pkg matches remote-client segments (GATE-RX-7)        -> EXCLUDE EX-2
  if GATE-RX-5 hits                                        -> EXCLUDE EX-1   # checked before anything else
  rest = GATE-RX-1 hits not also matched by RX-3/RX-4
  ctrl = GATE-RX-2 hits not also matched by RX-3/RX-4
  if rest nonempty -> ADMIT (@RestController, line N)
  if ctrl nonempty -> ADMIT (@Controller, line N)
  if RX-3/RX-4 hit                                         -> EXCLUDE EX-3   # annotation commented out
  if RX-6 hits                                             -> EXCLUDE EX-4   # only @Service/@Component/@Repository
  otherwise                                                -> EXCLUDE EX-5   # no Spring annotation at all
```

Also exclude fully-commented backup files (entire class body commented → EX-6).

### Audit trail (mandatory)

Every admitted file: record the annotation and its line number ("L18: @RestController").
Every excluded file: record the EX-n reason. Both tables go in the report. Classic traps
this prevents: a name-only `FooController.java` with no annotation (EX-5), a `@Service`
class named `*Controller` (EX-4), `//@RestController` backups (EX-3), Feign interfaces (EX-1).

## 3. Count-reconciled scanning

Scan area by area; each pass outputs its own tally before the next starts:

1. **Legacy area A** (e.g. each sub-directory of a `config/`-style tree) — cover both
   placements: `…/<biz>/controller/*.java` and `…/<biz>/*.java` directly.
2. **Legacy area B** (any second such tree), same logic.
3. **`controller/` and everything else** — existing `<EXT>`/`<INT>` content, residual
   sub-dirs, view/install/workflow trees, then a **fallback full sweep** of
   `src/main/java` for active controller annotations, diffed against areas 1–3 so
   nothing outside the enumerated dirs is missed.
4. **Cross-validation (blocking):** `N = N1 + N2 + N3` must equal `Nfull` from the full
   sweep. Mismatch → identify the diff files, re-scan, do not proceed.
   - `N1 = 0` while area A has content → CRITICAL warning, stop and re-check.
   - suspiciously low totals versus directory counts → WARNING, confirm coverage.

Migration list: for each admitted controller compare current package to computed target
→ `MIGRATE` or `SKIP`. Totals must reconcile: `N = M + K`.

## 4. Three-level classification (first hit stops)

- **L1 — exact class-name table.** Project-local, append-only, empty by default. Add an
  entry only when L2 cannot express a needed placement; entries never change once added.
- **L2 — keyword table → internal domains.** A closed, ordered list per project mapping
  case-insensitive keywords (matched in class name or package) to `<INT>/<domain>`.
  Typical entries: single-sign-on keywords → `<INT>/auth`; monitoring/health keywords →
  `<INT>/monitor`; interface-definition controllers matching `^I[A-Z].*Controller\d*$`
  → `<INT>/api`. Anything not in the list is *not* internal, however framework-ish it
  looks (cache admin, log viewers, sync jobs → external).
- **L3 — default external.** `{<EXT>, extractBusinessGroup(pkg)}`.

### Business-group extraction formula

```
segments = package.split(".")
if a legacy marker segment exists (the project's feature-tree root, e.g. "config"):
    group = lowercase(segments[markerIdx + 1])
    if that next segment is "controller" or missing: group = lowercase(className - "Controller")
else if "controller" ∈ segments:  group = lowercase(segments[controllerIdx - 1])
else:                             group = lowercase(last segment)
```

### Target-package formula

```
modulePrefix = segments before the marker segment      (case A)
             | segments before "controller"            (case B)
             | segments minus the last one             (case C)
target = modulePrefix + ".controller." + <EXT|INT> + "." + subdirectory
```

If `target == current`, mark SKIP.

### Anti-semantics red lines (violating any one breaks determinism)

1. The group **is** the formula output. No renaming, abbreviating, merging, or
   "improving" it for any reason.
2. A group similar to an existing directory still gets its **own** directory
   (`gapuiview` next to `view`, not merged into it).
3. Misspelled package segments are lowercased **as-is**. Spelling belongs to earlier
   chain steps; this step only places files.

Known failure modes to avoid: semantic merging into a lookalike dir; typo "fixes";
treating file names as admission evidence; trusting a commented annotation; classifying
by vibes into `<INT>` when the keyword list has no entry; missing controllers placed
directly under a business package; forgetting the file's own imports after moving it.

## 5. Check rules

| ID | Check | Severity |
|---|---|---|
| CTL-1 | both `<EXT>/` and `<INT>/` exist under `controller/` | FAIL |
| CTL-2 | every controller's package equals its computed target (no partial credit — no WARN tier) | FAIL |
| CTL-3 | a group directory holds >10 controllers, or controllers sit at the `<EXT>`/`<INT>` root | WARN (never auto-split) |
| CTL-4 | a controller lives outside any `controller` package — the scan covers every sub-tree; remote-client exclusions apply | FAIL |
| CTL-5 | non-controller classes under `controller` packages | INFO (stay put) |

## 6. Fix flow

Plan table → explicit confirmation → migrate → verify.

**Migration order (fixed):** `<INT>`-classified files first, then `<EXT>`; alphabetical
by class name within each; one file at a time.

**Per-file 9-step migration (copy-not-generate):**
1. Read the whole file; record `originalLineCount` (chunked read if >2000 lines).
2. Edit **only** the `package` line to the target.
3. Write to the target path, preserving encoding (keep a BOM if present).
   Line-count check: |new − original| ≤ 2, else roll back and redo from step 1.
4. Grep all of `src/main/java` for importers of the old fully-qualified name.
5. Update each importer **and** the moved file's own imports using the tracking map
   (below) — cross-references work in both directions, including references to files not
   yet moved (their planned targets are already in the map).
6. Update `@ComponentScan(basePackages=…)` values naming the old package.
7. Update XML config component-scan/base-package values under resources.
8. Delete the original file.
9. Grep-verify zero references to the old path; re-check the line count.

**Import tracking map.** Built once from the plan before migration starts, then
read-only: `old FQCN → new FQCN` for every MIGRATE row. Every file's step 5 walks the
map mechanically — no reliance on remembering what already moved.

**Progress & batch integrity.** `[X/M]` counters, strictly sequential; progress summary
every 10 files; above 20 files, process in batches ≤ 20 with per-batch summaries
(done-list + remaining-list must sum to M). Declaring completion while `X < M` is a hard
error; the phase gate `M == X` must pass before verification.

## 7. Verification

1. **External references:** every active controller annotation now resolves under
   `controller/<EXT>|<INT>/`; grep of old package patterns finds nothing.
2. **Internal cross-references:** each moved file's imports contain no legacy paths;
   emit the residual table (must be empty) and fix immediately if not.
3. **Global import consistency:** full-tree grep of every old prefix; non-comment,
   non-string hits are failures.
4. **Content fidelity:** per-file line-count delta ≤ 2 (table in the report); any breach
   → rollback and redo.
5. **Cleanup:** delete emptied legacy directories deepest-first — but keep `<EXT>/` and
   `<INT>/` even when empty.

Then the chain verify gate (`refactor-verify` via the orchestrator) runs before step 06.

## Stack mapping (registry-driven)

This step's concepts are architectural, not language features. Detection, build,
and test commands come from the language registry (`scripts/lib/languages.mjs`);
apply the concept through your stack's native equivalent:

| Concept | Java/Kotlin (Spring) | C#/.NET | Go | Python | Ruby/PHP | Rust |
|---|---|---|---|---|---|---|
| Module / unit of build | Maven/Gradle module | project in a solution | Go module/package | package | gem/package | crate (workspace) |
| Controller layer | `@RestController` | Controller class | HTTP handler | view/handler | controller | axum/actix handler |
| Service layer | `@Service` iface+impl | service class + DI | service struct | service module | service object | service module |
| Data access (DAO/repo) | Repository/Mapper | DbContext/repository | repository struct | repository/ORM model | ActiveRecord/Eloquent | repo + sqlx/diesel |
| Entity/model | JPA entity / POJO | entity class | struct | dataclass/model | model | struct |
| Dependency injection | Spring DI | built-in DI | constructor wiring | explicit imports/DI lib | container | constructor wiring |

A concept that has no equivalent in the detected stack is reported **N/A —
skipped** by the check, never forced. Adding a language to this lane is a
registry data edit (`lane: "backend"`), not code.
