# Service & repository quality pass — full method

Deterministic rulebook behind `refactor-backend-09-code-optimize`. Check and fix share
these rules; a check finding is exactly a fix action.

## 1. Selection filters

**Include:** classes annotated `@Service` or `@Repository` (or the project's equivalent
stereotypes) — typically `*ServiceImpl`, `*DaoImpl`, `*Repository` implementations.
**Exclude:** interfaces (including mapper interfaces), controllers, configuration
classes (`@Configuration`, `*Config`), DTO/model/entity types, generated code.
**Skip list:** files above the size ceiling (default 1000 lines, configurable) are
recorded and skipped whole — a half-optimized giant is worse than an honest skip.

## 2. Severity ladder (fix order within each file)

1. **P1 — security:** SQL-1…SQL-3.
2. **P2 — observability:** LOG-1…LOG-3.
3. **P3 — hygiene:** OPT-1…OPT-5.

## 3. SQL-injection hardening

| ID | Finding | Repair |
|----|---------|--------|
| SQL-1 | User-supplied **values** concatenated into a SQL string (`"… WHERE ID = '" + id + "'"`) | Replace with the binding mechanism the stack already uses: `?` placeholders + parameter array (JDBC/JdbcTemplate), `#{}` (MyBatis), named parameters (JPA). Query semantics unchanged. |
| SQL-2 | **Dynamic table name** interpolated from input | Validate against a closed whitelist of legal table names declared near the query; on miss, throw — never silently substitute a default. |
| SQL-3 | **Dynamic column name** (sort fields, filter columns) interpolated | Validate against a strict identifier pattern (e.g. `^[A-Za-z_][A-Za-z0-9_]*$`) and, where feasible, a column whitelist; reject loudly on failure. |

Principles: change the *binding*, never the query logic; keep result shapes identical;
concatenation of **constants** is not a finding.

## 4. Structured logging adoption

| ID | Rule |
|----|------|
| LOG-1 | One class-level logger per touched class, using the project's established idiom (Lombok `@Slf4j` if the project uses Lombok; otherwise an SLF4J `LoggerFactory` field). Never mix idioms within a project. |
| LOG-2 | Method-entry log (debug/info per project convention) on non-trivial public service methods — parameters summarized, secrets/PII never logged. DAO methods log at debug only where queries are dynamic. |
| LOG-3 | Every catch block that swallows or wraps an exception logs it with context (operation + key identifiers + the throwable). `printStackTrace()` and `System.out/err` diagnostics are converted. |

Do **not** add logs to: trivial getters/setters, pure delegation one-liners, hot tight
loops. Existing log statements are read-only — never edited, moved, or deduplicated.

## 5. Redundancy, dead code, and resources

| ID | Finding | Repair | Equivalence condition |
|----|---------|--------|-----------------------|
| OPT-1 | Legacy synchronized buffer (`StringBuffer`) used as a local | `StringBuilder` | Variable is method-local and never escapes to another thread. |
| OPT-2 | Single-use redundant variable | Inline | No side-effect reordering; name adds no documentation value. |
| OPT-3 | Nested conditionals with early-exit shape | Flatten / guard clauses | Branch outcomes provably identical. |
| OPT-4 | Mixed empty-collection checks (`size() == 0`, `!= null && …`) | Unify on one idiom (project utility or `isEmpty()`) | Null-handling preserved exactly. |
| OPT-5 | Commented-out **code blocks**; unclosed `Closeable`s | Delete the dead block; wrap resources in try-with-resources | Comment parses as code, not prose; resource lifetime is method-local. |

**Comment preservation (hard rule):** explanatory comments, TODO/FIXME markers,
Javadoc, and license headers always survive. OPT-5 removes only comment content that is
clearly code (statements, braces, semicolons) — narrative comments are never touched.

## 6. Red lines (immutable)

- No class renames. No method-signature changes (name, parameters, return, `throws`).
- No edits to existing log statements.
- No change to the algorithmic flow of business logic — the order and set of
  observable effects is identical before and after.
- When equivalence cannot be shown locally (shared mutable state, reflective access,
  overridden methods), downgrade the fix to a report entry.

## 7. Flow controls

- **Check mode** stops after the report; **fix mode** requires explicit confirmation.
- **Style checkpoint:** after the first fixed file, present the diff and confirm the
  style (log level, message shape, cleanup aggressiveness) before continuing.
- **Progress:** summary every 5–10 files; skip list carried in every report.
- **Reconciliation:** processed + skipped = candidate count, or the run fails.

## 8. Verification

1. Grep touched scope for remaining value-concatenation into SQL strings — zero
   unreported hits.
2. Each touched class: exactly one logger declaration; compiles.
3. Build green; baseline tests pass (behavior preservation evidence).
4. Change report complete; hand off to `refactor-code-principles` and the review gate.

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
