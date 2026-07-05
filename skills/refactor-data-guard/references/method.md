# refactor-data-guard — full method & check catalogue

Data is behavior. This guard makes "row-level and schema-level behavior is preserved"
an explicit, machine-checked assertion in the verify phase, not an assumption.

## 0. Applicability gate (never skip)

The guard is **dormant by default**. It only runs when the current step edited a
data-layer file. Determine this from two sources, unioned:

1. `<target>/.refactor-chain/state.json` → `lastEdit.file` (the hook records every edit).
2. `git diff --name-only` + `git diff --name-only --cached`.

A file is data-layer if it matches any of:

| Category | Patterns |
|---|---|
| Migrations | `migrations/`, `alembic/`, `flyway`, `liquibase`, `knexfile*`, `db/migrate/` |
| Schema | `schema.sql`, `schema.prisma`, `schema.rb`, `*.sql`, DDL files |
| Seeds / fixtures | `seeds/`, `seed.*`, `fixtures/`, `factories/` |
| ORM models / access | `models/`, `entities/`, `entity/`, `dao/`, `repository/`, `repositories/`, `prisma/` |

If nothing matches → emit `{applicable:false}` and return. **Do not touch a database
on a non-data step.**

## 1. The three assertions

The guard captures a **shape snapshot** before the step and compares after. The snapshot
has exactly three sections; each is a hard gate.

### A. Row-count assertion
Per user table (exclude framework/migration bookkeeping tables like `schema_migrations`,
`flyway_schema_history`, `alembic_version`), record `COUNT(*)`. On a **structural** refactor
(rename, extract, re-layer) counts must be **identical**. A count change is only allowed when
the step's plan explicitly said "backfill / delete / seed N rows" — and then only by exactly
that amount.

### B. Schema-shape assertion
Capture the DDL shape: for each table, its columns (name, type, nullability, default) and its
constraints (primary key, unique, foreign keys, check). Compare structurally, not textually
(column *order* and whitespace don't matter; column *set* and types do). Every difference must
map to an intended migration in the step plan. A dropped column, a widened/narrowed type, or a
vanished constraint that wasn't planned = drift.

### C. Referential-integrity assertion
For every declared foreign key, probe for orphans:
`SELECT COUNT(*) FROM child c LEFT JOIN parent p ON c.fk = p.pk WHERE c.fk IS NOT NULL AND p.pk IS NULL`.
Before must equal after, and both should be 0 unless the baseline already had known orphans
(record that as an accepted baseline). A foreign key that was dropped by the refactor (so the
probe can no longer run) is itself drift unless planned.

## 2. Capture commands per stack (all read-only)

Prefer the project's own tooling so you read exactly what the app sees.

| Stack | Schema shape | Row counts | FK list |
|---|---|---|---|
| Postgres | `pg_dump --schema-only --no-owner` | `SELECT relname, n_live_tup FROM pg_stat_user_tables` or `COUNT(*)` per table | `information_schema.table_constraints` where `constraint_type='FOREIGN KEY'` |
| MySQL | `mysqldump --no-data` | `information_schema.tables.table_rows` (approx) or `COUNT(*)` (exact) | `information_schema.key_column_usage` |
| SQLite | `.schema` (or `sqlite_master`) | `SELECT COUNT(*)` per table | `PRAGMA foreign_key_list(<table>)` |
| Prisma | `prisma migrate status` + `prisma db pull` to a scratch schema, diff | scripted `count()` per model | relations in `schema.prisma` |
| TypeORM | `typeorm schema:log` | `count()` per entity | `@ManyToOne`/`@JoinColumn` metadata |
| JPA / Hibernate | `hbm2ddl` dump or `SHOW CREATE TABLE` | `COUNT(*)` per `@Entity` table | `@JoinColumn` / `information_schema` |
| Rails / ActiveRecord | `db/schema.rb` (the committed shape) | `Model.count` per model | `foreign_key` lines in `schema.rb` |

Never use a command that writes: no `migrate`, `db:reset`, `truncate`, `seed`, `push --accept-data-loss`.
If only a destructive path exists to read shape, report "could not verify" — do not run it.

## 3. Intended vs unintended classification

A delta is **intended** only if it is named in the current step's plan/notes (e.g. "rename
`orders.user_id` → `orders.customer_id`"). Match renames by shape: a dropped column + a new
column of the same type with matching row values is a rename, not a drop+add — but still confirm
against the plan. Everything not in the plan is **unintended** and blocks.

## 4. Outcome wiring

- All clear / all intended → write the passing Data-Safety Report, then let the step advance:
  `node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs advance --delta legal --target <dir> --note "data-guard: shape preserved"`.
- Any unintended delta → do **not** advance. Roll back to the step checkpoint
  (`git stash apply <sha>` from `state.json.checkpoints`) and signal:
  `orchestrate.mjs advance --delta drift` (the harness refuses to advance on drift) or
  `orchestrate.mjs fail --reason "data-guard: <table>.<col> lost FK"` to enter self-heal.
- DB unreachable / tooling missing → report "could not verify", block, ask the human. Never
  pass by default.

## 5. Snapshot file

Written to `<target>/.refactor-chain/data-snapshot.json`:

```json
{
  "capturedAt": "ISO-8601",
  "database": "postgres@localhost:5432/app_dev",
  "tables": { "users": { "rows": 4812, "columns": [...], "constraints": [...] } },
  "foreignKeys": [ { "child": "orders", "column": "customer_id", "parent": "customers", "orphans": 0 } ]
}
```

The "before" is the snapshot present at step start; the "after" is a fresh capture at verify
time. The diff of the two, minus intended deltas, must be empty.
