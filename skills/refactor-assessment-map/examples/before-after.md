# refactor-assessment-map — worked example

## Before: a tangled service (what the user points at)

```
checkout-svc/            (Node/TS, from the Project Profile)
├── src/
│   ├── orders.ts        # 640 LOC, imports inventory, db, auth, mailer
│   ├── inventory.ts     # 410 LOC, imports orders (!), db
│   ├── db.ts            #  90 LOC, imported by almost everything
│   ├── auth.ts          # 220 LOC, imported by orders, api, admin
│   ├── mailer.ts        #  70 LOC, imports config
│   ├── reports.ts       # 300 LOC, imports db only
│   └── api.ts           # 180 LOC, imports orders, auth
```

User asks: *"where should we even start refactoring this?"*

## Mapping (read-only)

**Dependency edges (parsed from imports):**
```
orders     → inventory, db, auth, mailer
inventory  → orders, db
api        → orders, auth
admin      → auth
reports    → db
mailer     → config
```

**Fan-in / fan-out / instability:**
| module | fan-in (Ca) | fan-out (Ce) | I = Ce/(Ca+Ce) |
|--------|------------:|-------------:|---------------:|
| db     | 4 | 0 | 0.00 (very stable, load-bearing) |
| auth   | 3 | 0 | 0.00 |
| orders | 2 | 4 | 0.67 (god module) |
| inventory | 1 | 2 | 0.67 |

**Cycle detected:** `orders ↔ inventory` (they import each other) — circular
dependency; refactoring either in isolation is unsafe until it's broken.

**Hotspots (complexity × churn × fan-in):** `orders.ts` (640 LOC, 71 commits,
fan-in 2, in a cycle, god module) is the clear #1.

## After: the Assessment Map (handed to plan)

**Load-bearing (highest fan-in):** `db.ts` (4), `auth.ts` (3) — stable; touch with care.

**Tangles:** `orders ↔ inventory` circular dependency — break this first (extract a
shared `orders-inventory` boundary or an event/interface) before anything else.

**God module:** `orders.ts` — high fan-out (4) and high complexity; split it.

**Ranked targets:**
| # | target | why | risk |
|---|--------|-----|-----:|
| 1 | break `orders ↔ inventory` cycle | blocks all safe extraction; both are hot | high |
| 2 | split `orders.ts` god module | 640 LOC, top churn, fan-out 4 | high |
| 3 | isolate `auth.ts` behind an interface | fan-in 3, security-sensitive | medium |

**Quick win (safe warm-up):** `reports.ts` — imports only `db`, in no cycle, low
fan-in. Refactor it first to prove the verify loop with near-zero blast radius.

## Why this matters downstream
- The plan phase now has a **defensible order**: warm up on `reports.ts`, then
  break the cycle, then split `orders.ts` — not "start somewhere".
- `refactor-diagnose` gets confirmation this is a code-structure job with a known
  worst offender, sharpening its lane confidence.
- The cycle flag prevents the classic failure of "refactored `orders`, but
  `inventory` still imports the old shape and everything breaks".
