---
name: refactor-backend-09-code-optimize
description: "Use this skill when running a code-quality pass on the service and repository classes of a backend project in any registry-detected stack — hardening string-concatenated SQL into parameterized queries, adopting structured logging, cleaning redundant and dead code, and tightening resource handling. Triggers on phrases like \"optimize service code\", \"fix SQL injection\", \"add logging\", \"clean up dead code\", \"code quality pass\". This is step 9 of 9 in the layered-backend governance lane of the refactor-chain bundle. Works on any backend codebase in any registry-detected language; no product-, organization-, or language-locked rules."
---

# Service & Repository Quality Pass — refactor-chain · backend lane · step 09/09

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work · **Prerequisite:** refactor-backend-08-common-extract · **Next:** refactor-code-principles (default final pass).
**Adaptivity / conditional:** repo-agnostic — works on any layered backend project in any registry-detected stack. The logging framework and injection-hardening idioms adapt to what the project already uses (SLF4J/Lombok `@Slf4j`, JdbcTemplate, MyBatis, JPA, …).

## Purpose
The last hands-on step of the backend lane: a severity-ranked quality pass over the classes that hold business and data-access logic — `@Service` and `@Repository` (and equivalent) classes. It repairs SQL-injection exposure (parameterize concatenated values, whitelist dynamic table names, pattern-validate dynamic column names), adopts structured logging (one class-level logger, entry and exception logging where it earns its keep), cleans redundant and dead code, and fixes leaky resource handling. It has a **check** mode (report only) and a **fix** mode (confirmed repairs). Class names, method signatures, existing log statements, and the algorithmic flow of business logic are untouchable.

## When to use
- After common extraction (08), as the lane's final code-touching step.
- You say things like: "optimize service code", "fix SQL injection", "security pass on DAOs", "add logging", "clean up dead code", "code quality pass".
- Review findings show concatenated SQL, silent catches, `System.out` debugging, commented-out code blocks, or unclosed resources in the service/repository layers.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm polishing the engine room — safer queries, useful logs, less clutter. What your code *does* stays identical."
- "You are here: step 9 of 9, the last working step before the review gates."
- "This query glues user input straight into SQL. I'm switching it to a placeholder — same query, same results, no injection risk."
- "I'll fix one file first and show you the style; you approve it before I continue with the rest."
- "Progress: 8 of 23 files done; next checkpoint report after file 10."
- "That comment explains *why* the tax rounds up — comments like that stay. Only commented-out dead code goes."
- Want the exact rule tables and severity ranking? Say "show technical details" — it's in `references/method.md`.

## Method
1. **Scope & filter.** Find candidate classes: `@Service`/`@Repository`-annotated implementations (typically `*ServiceImpl`, `*DaoImpl`, repository classes). Exclude interfaces, mapper interfaces, controllers, configuration classes, and DTO/model types. Files over the size ceiling (default 1000 lines, configurable) go on a recorded skip list instead of being half-edited.
2. **Analyze & rank.** Classify each file's findings by the severity ladder: **P1 security** (SQL injection) → **P2 observability** (logging) → **P3 hygiene** (redundancy, dead code, resources). Findings carry rule IDs (`SQL-1…3`, `LOG-1…3`, `OPT-1…5` in `references/method.md`).
3. **Check mode.** Emit the report from `templates/output.md`: per-file findings, severity, proposed change, skip list. Stop here unless fix is requested.
4. **Fix mode (confirmed).** Repair in priority order per file:
   - **SQL hardening:** concatenated *values* → parameterized placeholders; dynamic *table names* → closed whitelist check; dynamic *column names* → strict identifier-pattern validation. Never rewrite the query's logic.
   - **Logging:** one class-level logger via the project's existing idiom; method-entry logs on non-trivial public service methods; exception logging with context in catch blocks; no logs in trivial getters/delegates; never duplicate or alter an existing log line.
   - **Cleanup:** legacy synchronized buffers → local `StringBuilder` where safely local; single-use redundant variables inlined; nested conditionals flattened when provably equivalent; empty-collection checks unified on one idiom; commented-out **code blocks** deleted; try-with-resources for leakable resources.
   - **Comments are preserved:** explanatory comments, TODOs/FIXMEs, and license headers always stay — only dead code in comment form is removed.
5. **Style checkpoint.** After the first fixed file, show the diff and confirm the style before auto-continuing; then a progress summary every 5–10 files.
6. **Report.** Change report listing every file processed, every rule applied, and every file skipped with the reason.

## Guardrails
- Behavior is preserved (refactor only): red lines — no class renames, no signature changes, no edits to existing log statements, no change to business-logic flow or ordering of effects.
- SQL repairs change the *binding mechanism*, never the query semantics; a whitelist/validation rejection path must fail loudly, not silently substitute.
- Redundancy cleanup only where equivalence is provable locally; when in doubt, report instead of edit.
- Functional comments and TODOs survive; deleting a commented-out block requires it to parse as code, not prose.
- Oversized files are skipped and reported, never partially edited.

## Verify
Plain language: "queries take input safely, problems will show up in the logs, the clutter is gone — and everything behaves exactly as before."
Technical: grep the touched scope for remaining value concatenation into SQL strings (zero non-reported hits); every touched class has exactly one logger and compiles; change report reconciles processed + skipped = candidates; project builds and the baseline test set passes; then the chain verify gate. `node scripts/checklist.mjs` prints the machine-readable step list.

## Resources
- `references/method.md` — full rule tables (SQL-1…3, LOG-1…3, OPT-1…5), severity ladder, selection filters, red lines.
- `examples/before-after.md` — a repository class hardened and cleaned end to end.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — check-report and change-report scaffolds.

## Chain position
Runs as step 09 of the layered-backend governance lane, after refactor-backend-08-common-extract has settled shared code. On success the orchestrator (`~/.claude/skills/refactor-chain/scripts/orchestrate.mjs`) advances to `refactor-code-principles`, the lane's default final pass, followed by the review gate.
