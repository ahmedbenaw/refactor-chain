# Service-layer structure — full method

This is the exhaustive rulebook behind `refactor-backend-04-service`. Everything here is
deterministic: the same source tree plus the same rules must always produce the same
report and the same fix plan. If a rule is ambiguous for some file, stop and report the
ambiguity rather than deciding by feel.

## 1. Target layout

```
service/
├── <interfacePkg>/          # every service interface (default name: facade/; api/ also common)
│   └── UserService.java     # or IUserService — the I-prefix is not required
└── impl/
    └── UserServiceImpl.java
```

The interface-package name is a project convention. Detect an existing convention first
(if most interfaces already live in `facade/` or `api/`, keep it); otherwise propose
`facade/` and let the user confirm. The implementation package is always `impl/`.

## 2. Scan coverage (mandatory, no shortcuts)

Scan **all** of the following per module, then merge and de-duplicate:

| Pattern | Why |
|---|---|
| `**/service/*.java` | service roots |
| `**/service/**/*.java` | business sub-packages under service |
| `**/*/service/*.java` | service folders nested under feature/config/view trees |
| `**/service/**/impl/*.java` | scattered per-feature impl folders |

Prohibited: scanning only the service root; starting any move before the whole scan is
merged; skipping a business sub-directory because it "looks empty".

## 3. Classification tree (first match wins — no holistic judgment)

For each `.java` file found:

1. `interface` + `@FeignClient` (or equivalent remote-client annotation) → **remote client, leave in place**.
2. `interface` + name ends in `Service` (with or without an `I` prefix) → **service interface → interface package**.
3. `interface`, anything else → **leave in place** (not a service interface).
4. `class` + name ends in `ServiceImpl` → **implementation → `impl/`** (annotation not required).
5. `class` + `@Service` + implements a `*Service` interface → **implementation → `impl/`**.
6. `class` + `@Service` + implements no service interface → **leave in place**, note in the report ("consider extracting an interface").
7. `class` + name ends in `Service` (not `Impl`) + no `@Service` → **leave in place**, note in the report.
8. `class` + name ends in `Service` (not `Impl`) + `@Service` → **implementation → `impl/`**, note "consider renaming to *ServiceImpl".
9. Everything else (enums, constants, utils, exceptions, DTOs) → **leave in place**; covered by SVC-5 reporting only.

Edge cases:

| Case | Handling |
|---|---|
| Abstract base (`Abstract*Service`) | goes to `impl/` — it is implementation scaffolding |
| Interface and implementation defined in one file | do not move; report it |
| Interface shared across modules | classify normally, but flag the move for impact review before executing |

## 4. Check rules

| ID | Check | Severity |
|---|---|---|
| SVC-1 | Interface/implementation separation. An implementation class sitting in the `service/` root is FAIL; interface and impl mixed in the same directory is WARN. | FAIL / WARN |
| SVC-2 | Interface package exists under `service/` and contains **every** service interface. Missing package, or incomplete coverage, is FAIL. | FAIL |
| SVC-3 | Interface ownership. A service interface in the `service/` root or a business sub-package is FAIL; a non-service file inside the interface package is WARN. | FAIL / WARN |
| SVC-4 | Implementation ownership. Impls scattered across per-feature `impl/` folders, impls outside `service/impl/`, or leftover misspelled dirs (`imp/`, `serviceImp/`, `svc/`) are FAIL. | FAIL |
| SVC-5 | Non-service files (constants, enums, exceptions, utils, models, remote clients) mixed into the interface package or `impl/` are WARN — reported, never moved by this step. | WARN |

FAIL items are handled by the fix phase; WARN items are advisory; INFO is informational.

## 5. Fix flow

**Phase 1 — scan & analyze.** Build the migration list: source path, target path, file kind.

**Phase 1.5 — conflict pre-check (blocking).**
- Collect the basenames of all interface candidates and all impl candidates.
- A name already present at the destination, or duplicated among candidates (same class
  name from two business sub-packages), is a **hard stop**: report full paths, module,
  and cause; the user picks rename / merge / skip. Never decide unilaterally.
- Find wildcard imports over source packages (`import …service.<oldSubPkg>.*`) and plan
  their rewrite (see §7).

**Phase 2 — plan.** Emit the fix-plan table from `templates/output.md`.

**Phase 3 — confirmation.** Nothing executes until the user explicitly approves.

**Phase 4 — execute.** Order is fixed for idempotence:
1. create the interface package and `impl/` if missing (never adopt `imp/`-style dirs);
2. move all interfaces, alphabetically by module then filename;
3. move all implementations, same ordering;
4. update references (see §6–§8) after **each** file, not in bulk at the end;
5. handle edge cases noted in Phase 1;
6. delete directories that are now empty (only if zero `.java` files remain and no
   non-service content is left behind).
No parallel file processing. One file at a time.

**Target-path formula (flattening).** Whatever the nesting depth:
`service.<anything>.Name` → `service.<interfacePkg>.Name` (interfaces) and
`service.<anything>[.impl].NameImpl` → `service.impl.NameImpl` (implementations). All
intermediate segments are discarded.

**Per-file move flow (copy-not-generate).**
1. Read the entire original file.
2. Change **only** the `package` declaration line.
3. Write to the target path, preserving the original encoding (keep a UTF-8 BOM if one
   existed — copy-then-edit is safer than rewrite).
4. Grep the whole workspace for importers of the old fully-qualified name.
5. Edit each importer's `import` line.
6. Delete the original file.
7. Grep again to confirm zero references to the old path remain.

## 6. Reference-update search scope

- The current module's `src/main/java`, **and** every module that depends on it.
- Search from the project root across all `src/main/java` trees.
- File kinds: `.java`, `.xml`, `.yml`, `.yaml`, `.properties` (Spring XML bean `class=`
  attributes and component-scan packages hide here).
- Test sources (`src/test/java`) are not modified in this step but must be listed in
  the report if they reference moved classes.

## 7. Wildcard imports

After moving, grep for `import …service\.<oldSubPkg>\.\*`:
- If **all** service files left that package: replace the wildcard with explicit imports
  of the new paths; keep the wildcard only if non-service classes remain there and are used.
- If non-service files remain: keep the original wildcard and **add** explicit imports
  for the moved classes' new paths.
- Finally verify no accidental `service.<interfacePkg>.*` / `service.impl.*` wildcard was introduced.

## 8. Framework/bean references

| Reference | Action |
|---|---|
| `@Qualifier("name")`, `@Resource(name=…)` | bean names default from the class name — usually unchanged; verify only |
| `@Resource(type=X.class)` with a fully-qualified name | update |
| Spring XML `class="…"` | update |
| `@ComponentScan(basePackages=…)` naming an old sub-package | update |

Search key: the old fully-qualified class name across the file kinds in §6.

## 9. Idempotence & completeness

- Re-running the fix on an already-fixed tree must produce zero planned moves.
- Residual sweep after Phase 4: grep for `interface\s+\w*Service\s*` outside the interface
  package and `impl/`; anything found is a missed file — report and migrate it.
- Final completeness report: interfaces moved, implementations moved, residuals (must be
  0), and the list of sub-directories scanned.

## 10. Four-way verification (Phase 5)

1. **Structure** — the two packages exist and hold exactly the classified files.
2. **References** — zero project-wide hits on old paths; wildcard handling verified.
3. **Content** — each moved file differs from its original only on the `package` line.
4. **Counts** — before/after totals of interfaces and implementations match exactly.

Only after all four pass does the orchestrator's verify gate advance the lane to step 05.

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
