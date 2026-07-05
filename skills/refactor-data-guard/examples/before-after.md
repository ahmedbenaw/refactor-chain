# Worked example — a column-rename migration that silently dropped a foreign key

## Context
The `refactor-backend-03-dao-model` step renamed `orders.user_id` to `orders.customer_id`
to match the domain language. The step edited:

- `src/main/resources/db/migration/V42__rename_orders_user_id.sql`
- `src/main/java/app/order/OrderEntity.java`

Unit tests were green after the change, so the ordinary verify check said "pass".
Because a migration file was touched, **refactor-data-guard activated**.

## Applicability gate

```
$ node scripts/checklist.mjs --applicable /repo
{
  "skill": "refactor-data-guard",
  "applicable": true,
  "reason": "data-layer file(s) touched this step",
  "touched": ["src/main/resources/db/migration/V42__rename_orders_user_id.sql"]
}
```

## Before snapshot (captured at step start)

| table | rows | note |
|---|---|---|
| `customers` | 1,204 | |
| `orders` | 8,977 | |

Foreign keys:

| child | column | parent | orphans |
|---|---|---|---|
| `orders` | `user_id` | `customers` | 0 |

## After capture (at verify time)

| table | rows | note |
|---|---|---|
| `customers` | 1,204 | unchanged |
| `orders` | 8,977 | unchanged |

Foreign keys:

| child | column | parent | orphans |
|---|---|---|---|
| `orders` | `customer_id` | *(none)* | n/a |

## Diff & classification

- **Row counts:** identical → PASS.
- **Column rename `user_id` → `customer_id`:** named in the step plan → INTENDED.
- **Foreign key `orders.customer_id → customers`:** the migration renamed the column with
  `ALTER TABLE orders RENAME COLUMN user_id TO customer_id;` but **never re-added the FK
  constraint** the old column had. The constraint silently vanished. This is NOT in the plan
  (the plan said "rename the column", not "drop the relationship") → **UNINTENDED → DRIFT**.

## Outcome

The guard blocked the advance:

```
$ node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs advance --delta drift --target /repo
{ "ok": false, "blocked": "behavior drifted — roll back this step, do not advance",
  "hint": "git stash apply <checkpoint>" }
```

Plain-language message to the user:

> Hold on — renaming the column dropped the link between `orders` and `customers`
> (the foreign key is gone). The data would still *look* fine in the tests, but new bad
> rows could sneak in. I rolled this step back. The fix is to add the constraint back in the
> same migration: `ALTER TABLE orders ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id);`

After the migration was corrected and re-run, the after-capture showed the FK restored on the
new column name, the diff reduced to the single intended rename, and the step advanced with
`--delta legal`. Data behavior preserved.
