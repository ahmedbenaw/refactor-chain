# API & naming conventions — full method

The exhaustive rules behind `refactor-backend-07-api-naming`. Everything here is
framework-agnostic in intent; Spring annotations (`@GetMapping`,
`@RequestMapping`, `@Autowired`, …) are used as the worked example because they
are the most common case. Map the same ideas onto Jakarta REST (`@Path`,
`@GET`), Micronaut, or whatever the repo actually uses.

## 1. Scan scope

Include production sources by layer path:

| Layer | Typical globs |
|-------|---------------|
| Web | `**/controller/**/*.java`, `**/web/**/*.java`, `**/resource/**/*.java` |
| Service | `**/service/**/*.java`, `**/facade/**/*.java` |
| Persistence | `**/dao/**/*.java`, `**/repository/**/*.java`, `**/mapper/**/*.java` |
| Model | `**/model/**/*.java`, `**/entity/**/*.java`, `**/dto/**/*.java`, `**/vo/**/*.java` |

Exclude: `**/test/**`, `**/target/**`, `**/build/**`, `**/generated*/**`,
`package-info.java`, `module-info.java`, inner/anonymous classes, and any class
whose file name differs from the declared public type.

## 2. The six checks (fixed order)

Severity: **FAIL** must be addressed; **WARN** is advisory. Classification
(fixable vs constrained) is decided by the flow in section 3, never by feel.

### N-01 Endpoint path conventions (WARN)
- Compose full path = class-level mapping prefix + method-level path; count
  non-empty segments. Compare the segment count and vocabulary against the
  project's stated path convention (e.g. `/{area}/{module}/{action}/{detail}`
  with a fixed action-verb set like `query|add|modify|delete|import|export`).
  Structural deviations are **constrained** — a URL change breaks callers.
- Flag method-level mappings with no explicit HTTP method (ambiguous).
- Flag path segments over the length cap (default 40 chars), controllers with
  more than the endpoint cap (default 15), unresolvable property-placeholder
  paths, and missing class-level prefixes. Path variables (`{id}`) count as one
  segment.
- If the team's convention requires POST-compatibility on delete/update
  endpoints, flag `@DeleteMapping`/`@PutMapping` as **fixable** (see fix F-1).
  `@PatchMapping` is always constrained — report only.

### N-02 Class naming (WARN)
- PascalCase required everywhere; leading lowercase and underscores are fixable.
- Layer suffixes: web classes end `Controller`; service interfaces `Service`
  (an `I` prefix is acceptable); service implementations `ServiceImpl`;
  persistence interfaces `Dao`/`Repository` (+`Impl` for implementations);
  mappers `Mapper`; DTO/VO/Query per their directories. Suffix mismatches in
  web/service/persistence layers are fixable; model-layer renames are
  constrained (serialization surface).
- Abbreviation blacklist (fixable, whole-suffix match): `Ctrl`→`Controller`,
  `Action`→`Controller` (web layer), `Svc`→`Service`, `SvcImpl`→`ServiceImpl`,
  `Repo`→`Dao`/`Repository`, `Mgr`→`Manager`, trailing `Util`→`Utils`,
  `Info` in dto/vo directories → `DTO`/`VO`.
- Skip suffix checks (still check PascalCase) for utility, config, constants,
  enums, handler, interceptor, filter, listener, aspect, and converter
  directories; exception classes should end `Exception`.
- Length caps per layer (defaults: Controller 40, Service 37, ServiceImpl 41,
  Dao 33, DaoImpl 37, Mapper 36, Entity 36) are advisory and constrained.

### N-03 Property naming (WARN)
- Fields must be lowerCamelCase. Detection skips `static final` constants
  (checked against `^[A-Z][A-Z0-9_]*$` instead), `serialVersionUID`, and
  logger fields.
- Underscored field names: **fixable** in internal classes, **constrained** in
  DTO/VO classes (JSON compatibility) — unless a serialization alias annotation
  (e.g. `@JsonProperty`) already pins the wire name, in which case report as
  "already compatible".
- `xxxID` / `xxx_id` should be `xxxId` — constrained (accessor names change).
- Boolean fields without the project's chosen prefix (`is…`) — constrained.
- Single-character field names — fixable.

### N-04 Request-parameter conventions (WARN, all constrained)
- Underscored parameter names; non-standard pagination names (`page`, `size`,
  `limit`, `pageNo`, `currentPage`, `rows` vs the project standard, e.g.
  `pageNum`+`pageSize`); missing validation annotations (`@NotNull`,
  `@NotBlank`, `@Valid`, …) on required non-primitive parameters.
- Skip framework parameters: servlet request/response, `Model`,
  `BindingResult`, `MultipartFile`, security principals, `Pageable`.
- All constrained: renaming a parameter or adding validation can change
  observable behavior.

### N-05 Response-wrapper conventions (WARN, all constrained)
- If the project has a standard response envelope (any unified result/page
  wrapper type), flag unwrapped returns, raw entity returns (including
  entity-typed generics inside the wrapper), `ResponseEntity` where the
  envelope is standard, and `?`/`Object` generics (suggest concrete types).
- `void` returns (file downloads) and view-name `String` returns pass.

### N-06 Bean-name conflicts (FAIL/WARN)
- Collect every component annotation (`@Service`, `@Controller`,
  `@RestController`, `@Repository`, `@Component`) with its optional explicit
  name. Default name = class name with the first letter lowered, **except**
  when the first two letters are both uppercase (then unchanged) — the standard
  bean-naming rule.
- Duplicate names across the project → FAIL. A trailing-digit twin
  (`FooController` + `FooController2`) → see the decision tree in section 5.
  Conditional beans are recorded as "may not conflict at runtime".
  `@Bean` factory methods and `@Configuration` classes are out of scope.

## 3. Fixable vs constrained — decision flow

For each finding, in order; first hit decides:
1. Does the change alter what an external system sees (URL, HTTP method
   removal, JSON field, request parameter)? → **constrained**.
   (Adding POST compatibility to an existing method keeps the old method
   working, so it passes this gate.)
2. Does it change serialized output or accessor names used by serializers? →
   **constrained**.
3. Could it introduce a runtime behavior change (e.g. new validation)? →
   **constrained**.
4. Otherwise → **fixable** (rename + reference update is sufficient).

## 4. Fix procedures

### F-1 HTTP-method compatibility broadening (only if the convention requires it)
Convert `@DeleteMapping(...)`/`@PutMapping(...)` to
`@RequestMapping(value = …, method = {ORIGINAL, RequestMethod.POST}, …)`.
- Preserve every existing attribute (`value`, `produces`, `consumes`,
  `headers`, `params`), emitting them in that fixed order for determinism.
  Multi-path values are preserved as arrays.
- Never touch the URL, `@GetMapping`, `@PostMapping`, or `@PatchMapping`.
- Import bookkeeping: add `RequestMapping`/`RequestMethod` if missing; remove
  the old mapping import only when the file no longer uses it.
- Idempotence: skip anything already in the target form.

### F-2 Class rename (six steps, strict order)
1. **Idempotence check** — target already met? Skip.
2. **Collision pre-check** — grep the project for the new class name and the
   new default bean name; on any hit, stop and ask the user.
3. **Edit the class declaration.**
4. **Rename the file with `mv`** (preserves encoding/BOM); never rebuild via
   read-and-write.
5. **Update every reference**: imports, field/parameter/return/local types,
   casts, generics, qualifier strings — and injection-point variable names, but
   only when the variable equals the old class name first-lowered; custom
   variable names keep their name and only change type. Method names are
   business logic and are never renamed.
6. **Grep-verify**: old class name and old import → 0 hits; file name equals
   class name.

### F-3 Bean-conflict resolution (decision tree)
- Twin with digit suffix in the **same module** → rename the suffixed class to
  a meaningful name (derive a qualifier from its route or responsibility, e.g.
  `FooExtController`), via F-2.
- Same name in **different modules** → keep class names; give one an explicit
  bean name derived deterministically from its module id (module artifact id,
  common prefix stripped, camel-cased, prepended to the default name). Use the
  component annotation's value attribute — e.g. `@RestController("…")` — rather
  than stacking annotations.
- Digit-suffixed class with **no twin** → drop the suffix (via F-2, with
  collision pre-check).
- A comment documenting why the odd name exists → constrained; never change.

## 5. Determinism & idempotence

- Report ordering: check id → file path → line number; deduplicate on
  (file, line, finding type).
- Naming algorithms are fixed: lower-first (with the consecutive-capitals
  exception), upper-first, suffix-replace (strip known bad suffix, append
  standard one; if no known suffix, append).
- Processing order: module (build-file declaration order), then layer
  (web → service → persistence → model), then path, then line.
- Re-running on clean code must produce an identical report and zero edits.
- On failure mid-pass: stop the current item, keep completed items, report
  progress, await the user. Escalate to the user when a new name already
  exists, a conflict involves 3+ classes, or the class backs a remote-client
  interface.

## 6. Verification checklist

- [ ] Old identifiers grep to zero across `src/main/java`.
- [ ] File names match public class names.
- [ ] Bean-name list is duplicate-free.
- [ ] Re-run check: 0 fixable findings, no new findings.
- [ ] Build compiles; `refactor-verify` behavior comparison passes.
- [ ] Harness gate (`orchestrate.mjs`) advanced to step 08.

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
