# Data-Safety Report — <step-skill> @ <checkpoint/commit>

- **Target:** `<project path>`
- **Database:** `<engine>@<host>/<db>`
- **Step:** `<refactor-* step that touched the data layer>`
- **Captured before:** `<ISO timestamp>` · **Captured after:** `<ISO timestamp>`
- **Result:** ✅ PASS (shape preserved) | ⛔ DRIFT (blocked) | ⚠️ COULD NOT VERIFY

## 1. Applicability
- Data-layer files touched this step:
  - `<file>` — <migration | schema | seed | model>
- Guard status: **ACTIVE** (a data file was touched)

## 2. Row counts (per user table)

| Table | Before | After | Δ | Verdict |
|---|---:|---:|---:|---|
| `<table>` | <n> | <n> | 0 | ✅ unchanged |
| `<table>` | <n> | <n> | +<k> | ✅ intended backfill / ⛔ unintended |

## 3. Schema shape

| Change | Object | Intended? | Verdict |
|---|---|---|---|
| rename column | `<table>.<old>` → `<table>.<new>` | yes (in plan) | ✅ |
| drop column | `<table>.<col>` | no | ⛔ drift |
| type change | `<table>.<col>` `<old type>`→`<new type>` | ? | <verdict> |

## 4. Referential integrity

| Child | Column | Parent | Orphans before | Orphans after | FK present after | Verdict |
|---|---|---|---:|---:|---|---|
| `<child>` | `<col>` | `<parent>` | 0 | 0 | yes | ✅ |
| `<child>` | `<col>` | `<parent>` | 0 | — | **no** | ⛔ FK dropped |

## 5. Verdict & action
- **Intended deltas:** <list, or "none">
- **Unintended deltas:** <list, or "none">
- **Decision:** advance `--delta legal` | block `--delta drift` + roll back to checkpoint `<sha>` | ask human
- **Message to user (plain language):**
  > <one or two sentences: what the data did, whether it's safe, what happens next>

## 6. Snapshot references
- Before: `<target>/.refactor-chain/data-snapshot.json`
- After: `<capture path or inline>`
