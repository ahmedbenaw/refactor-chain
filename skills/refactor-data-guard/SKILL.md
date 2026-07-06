---
name: refactor-data-guard
description: "Use this skill when a refactor step touches the database — schema, migrations, seeds, fixtures, ORM models, or data-access code. It runs data-safety checks (row counts, schema shape, referential integrity) as an EXTRA verify assertion during the verify phase, so a refactor can never silently mutate, drop, or corrupt data while claiming behavior was preserved. It is CONDITIONAL: it only activates when the harness or the current step reports a data-layer touch; on a pure code/UI refactor it stays dormant. Trigger phrases: \"we changed a migration\", \"this touches the schema\", \"did the refactor mess with the data\", \"make sure the tables still match\", \"renamed a column\"."
---

# Data Guard — refactor-chain · verify (conditional)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** verify (conditional) · **Prerequisite:** a step that edited DB/schema/migration/seed/fixture/model files · **Next:** the review gate / next step's `advance`.
**Adaptivity / conditional:** conditional on a data-layer touch signal — activates only when the current step edited files matching schema/migration/seed/fixture/ORM patterns; otherwise it reports "not applicable" and yields immediately.

## Purpose
A refactor is supposed to keep behavior identical, and data *is* behavior. When a step renames a column, reshapes a migration, edits a seed, or rewrites a DAO, the ordinary "tests are green" check can still miss a silent data change — a dropped row, a broken foreign key, a column that quietly changed type. This skill adds one more assertion to the verify step: before you `advance`, it captures the shape of the data (row counts per table, the schema definition, and referential-integrity checks) and compares it to the pre-step snapshot. If anything drifted that the refactor did not intend, it blocks the advance and tells you exactly which table moved.

## When to use
- The just-completed step edited anything under `migrations/`, `db/`, `schema.*`, `*.sql`, `seeds/`, `fixtures/`, or ORM model/entity files.
- Someone asks "did we lose any data?", "does the schema still match?", "is the foreign key still there?".
- The harness diagnosis or `state.json.lastEdit` shows a data-layer file was touched this step.
- Do NOT invoke on a pure UI/naming/logic refactor with no data-layer edit — it will simply report "not applicable".

## What I'll tell you (plain-language / ADHD-friendly)
- "This step touched the database, so I'm adding one extra safety check — I'm only reading the data's shape, not changing it."
- "Before-and-after: `users` had 4,812 rows, still 4,812. Schema matches. Foreign keys intact. You're clear to move on (check 1 of 1)."
- "Hold on — `orders.customer_id` lost its foreign key to `customers`. That's a data-safety change the refactor shouldn't make. I stopped before advancing so nothing ships."
- "Nothing here touches the database, so this check doesn't apply — skipping it, no action needed."
- "Want the plain summary, or the full table-by-table diff (show technical details)?"

## Method
1. **Gate first.** Run `node scripts/checklist.mjs --applicable <target>` (or inspect `state.json.lastEdit` + the step's edited files). If no data-layer file was touched, emit "not applicable" and return — do not run anything against a real database.
2. **Locate the snapshot baseline.** The pre-step snapshot lives at `<target>/.refactor-chain/data-snapshot.json` (written by this skill at the start of any data-touching step, or by `refactor-safety-net` at baseline). If none exists, capture it now as the "before" and note that this is the first guarded step.
3. **Capture the current shape** (read-only): per-table row counts, the schema/DDL shape (columns + types + constraints), and referential-integrity probes (orphan-row checks on declared foreign keys). Use the project's own tooling (its ORM's schema dump, `pg_dump --schema-only`, migration status, or a read-only query) — never a destructive command.
4. **Diff before → after.** Classify each delta as **intended** (the refactor was explicitly meant to add/rename it — confirm against the step's plan) or **unintended** (a silent drop, a lost constraint, a row-count change on a pure structural refactor).
5. **Assert.** If every delta is intended (or zero), record a passing data assertion and let the step `advance`. If any delta is unintended, block: report the exact table/column, roll the step back to the last checkpoint, and hand back to self-heal.
6. Fill `templates/output.md` into a Data-Safety Report and attach it to the step's verify record. See `references/method.md` for the full check catalogue and per-database capture commands.

## Guardrails
- **Read-only against data. Advisory + gating only.** This skill never writes, migrates, truncates, or seeds — it only reads shape and counts. It changes no rows and no schema.
- Behavior (including data) must be preserved. An unintended row-count or integrity change is a hard block, not a warning.
- Never run against a production database. Guard the dev/test database the baseline was captured on; if the target DB is ambiguous, stop and ask.
- If the database is unreachable or the tooling is missing, report "could not verify" (do NOT pass by default) and let the human decide.

## Verify
- Plain: "The data looks exactly like it did before this step — same rows, same shape, same links — except the changes we meant to make." If you can't say that, the guard failed and the step must not advance.
- Technical: `data-snapshot.json` (before) and the fresh capture (after) diff to an empty or fully-intended set; row counts match per table; no new orphan rows on any declared foreign key; schema DDL matches modulo intended migrations. Record the result via `orchestrate.mjs advance --delta legal` (pass) or `--delta drift` (block).

## Resources
- `references/method.md` — full check catalogue (row-count, schema-shape, referential-integrity) with per-database capture commands (Postgres, MySQL, SQLite, Prisma, TypeORM, JPA/Hibernate, Rails).
- `examples/before-after.md` — worked example: a column-rename migration caught losing a foreign key.
- `scripts/checklist.mjs` — prints this skill's steps as JSON and answers the `--applicable` gate.
- `templates/output.md` — the Data-Safety Report scaffold.

## Chain position
Runs inside the **verify** phase, appended as an extra assertion to any step that touched the data layer. It sits between the step's normal green-test check and `orchestrate.mjs advance`: only when its data assertion passes does the step advance to `refactor-code-principles` / the review gate. On drift it triggers the same self-heal path as any failed verify.
