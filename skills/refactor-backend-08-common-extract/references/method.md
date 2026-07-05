# Shared-module extraction — full method

This is the exhaustive rulebook behind `refactor-backend-08-common-extract`. It moves shared,
dependency-free code out of feature modules into the project's shared common module. The
contract is **behavior preservation**: files change modules and build files gain
dependencies, but no class, method, signature, annotation, or field is renamed or edited.
Classification is mechanical — grep evidence, never intuition. When a file is genuinely
ambiguous, it is surfaced for a human decision, not guessed.

## 0. In-scope package families

Only these six universal families are candidates. Nothing outside them is touched here —
service, controller, DAO, and model code belong to other steps.

`util` · `cache` · `constant` · `enums` · `exception` · `config`

## 1. Pre-flight (any failure aborts)

- The shared common module (`<project>-common`) exists and is registered in the parent
  build file's module list.
- The user holds a checkpoint (`refactor-safety-net`) so the whole pass can be reverted.

## 2. Scan

Glob the six package families under every feature module and build the candidate list.
Record, for each file, its module, package, and full path.

## 3. Four-gate classification (first hit wins, grep evidence only)

Every candidate is graded **EXTRACT** (moves automatically), **EVALUATE** (user decides),
or **RETAIN** (stays put). The gates are evaluated in order; the first that fires decides.

### Gate 1 — red lines (always RETAIN)

- A persistence-scanner configuration class (anything driving a mapper/entity scan of the
  owning module's packages). Moving it changes what gets scanned and breaks startup.
- A name collision: a class of the same name already exists in the common module. Halt
  this file; the user chooses merge / keep / replace. Nothing is overwritten silently.

### Gate 2 — layer coupling (RETAIN)

The file imports the owning module's service or DAO layer. Shared code must not depend on
a feature module's business layers, so it stays.

### Gate 3 — dependency and reach

- **Injected dependencies.** If the file injects framework-provided components, those on a
  tolerated whitelist (generic infrastructure such as a serialization mapper or a cache
  client) do not disqualify it. Anything injected that is a module-owned bean → RETAIN.
- **Cross-module reference count.** Count the distinct *other* modules that reference the
  class, de-duplicated per module. Threshold is 2: referenced by two or more other modules
  → strong EXTRACT signal; referenced by none outside its module → EVALUATE (it may simply
  be local).

### Gate 4 — config-class specials

For a configuration class, inspect its component-scan / package paths. If it scans a
package that only makes sense inside the owning module, it stays (RETAIN). A config with
no module-specific scan path is EXTRACT-eligible.

## 4. Confirm the migration list

- EXTRACT files are listed as the automatic migration set.
- EVALUATE files are shown with their evidence for a per-file decision.
- RETAIN files are excluded, each with its reason.

The user approves before any file moves.

## 5. Migration — file by file, in dependency order

Move families in this order so a moved file never references a not-yet-moved one:

`constant → enums → exception → util → cache → config`

For each file, run the seven-step loop; never batch:

1. **Read** the source file in full.
2. **Compare** its `package` declaration against the target path in the common module.
3. **Copy** with `cp` (encoding and BOM preserved) — never read-and-rewrite.
4. **Grep** the search scope for every import of the class.
5. **Update imports** only if the package actually changed. In the common convention the
   family package names are kept identical (`util`, `cache`, `constant`, `enums`,
   `exception`, `config`), so the package usually does *not* change and no import needs
   editing.
6. **Delete** the source file.
7. **Verify**: the target file's package matches its new path, every reference resolves,
   and the source path is gone.

## 6. Rewire builds

- Add a dependency on the common module to each source module that still references a
  moved class.
- Add to the common module **only** the third-party libraries its newly-arrived files
  import — nothing speculative.
- Confirm the parent module list still resolves.
- Emit the migration report from `templates/output.md`.

## 7. Reference-search scope

Grep across every module's `src/main/java` (and Spring XML / YAML / properties where a
fully-qualified class name can hide) from the project root. Test sources are not modified
but are listed in the report if they reference a moved class.

## 8. Special cases

| Case | Handling |
|------|----------|
| A moved class is a Spring-managed bean | verify the target module's component scan covers its package; warn if not |
| Name collision in common | halt that file (Gate 1); user picks merge / keep / replace |
| Persistence-scanner config | absolute red line — never moved |
| Empty source directory after moves | clean it up |
| File injects a module-owned bean | RETAIN (Gate 3) |

## 9. Verification

- Each moved file's `package` declaration matches its new path.
- Grep shows every import of every moved class resolves.
- All source paths are gone; empty source directories are removed.
- The build compiles across all modules.
- **Idempotence**: a re-run reports an empty migration list.

The harness verify gate plus `refactor-verify` must pass before the lane advances to
step 09.

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
