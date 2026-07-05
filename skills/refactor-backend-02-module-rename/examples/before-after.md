# Worked example — renaming `orders-server` / `orders-server-com`

Fictional project `com.acme.shop` after step 01. Chosen mapping (the example
convention): `orders-server` → `orders-controller`,
`orders-server-com` → `orders-service`.

## Before

```
orders/orders-domain/
├── pom.xml                      <modules>: orders-api, orders-server, orders-server-com
├── orders-api/
├── orders-server/               depends on orders-server-com
│   └── src/main/java/com/acme/shop/orders/server/…
└── orders-server-com/
    └── src/main/java/com/acme/shop/orders/server/com/…
orders/orders-composition/
└── orders-server-springcloud/   ← adapter: EXCLUDED from rename
```

## Plan (confirmed by the user before execution)

| Order | Old | New | Why this order |
|---|---|---|---|
| 1 | `orders-server-com` | `orders-service` | depended-upon side first; also the longer name, so longest-match-first |
| 2 | `orders-server` | `orders-controller` | dependent side second |

Skips: none. Exclusions: `orders-server-springcloud` (identity untouched;
its dependency on `orders-server` will be updated to `orders-controller`).

## Edits, in order

1. `mv orders-server-com orders-service`; its POM `<artifactId>` →
   `orders-service` (`<parent>` untouched — the container wasn't renamed).
2. `mv orders-server orders-controller`; `<artifactId>` → `orders-controller`.
3. Container POM `<modules>`: `orders-controller`, `orders-service`.
4. Root POM `dependencyManagement`: both artifactIds swapped.
5. All POMs: `orders-controller/pom.xml`'s dependency on `orders-server-com`
   → `orders-service`; `orders-server-springcloud/pom.xml`'s dependency on
   `orders-server` → `orders-controller`. Exact-match only — the adapter's own
   `<artifactId>orders-server-springcloud</artifactId>` is untouched because
   the whole value doesn't equal `orders-server`.
6. Packages, longest first:
   - `package com.acme.shop.orders.server.com.billing;` →
     `package com.acme.shop.orders.service.billing;`
   - `package com.acme.shop.orders.server.web;` →
     `package com.acme.shop.orders.controller.web;`
   - imports project-wide follow the same two-step mapping; the adapter's own
     `….orders.server.springcloud.…` package stays, but its imports of
     renamed classes update.
7. Physical moves: `…/orders/server/com/` → `…/orders/service/`,
   `…/orders/server/` → `…/orders/controller/`.

## After

```
orders/orders-domain/
├── pom.xml                      <modules>: orders-api, orders-controller, orders-service
├── orders-api/
├── orders-controller/
│   └── src/main/java/com/acme/shop/orders/controller/…
└── orders-service/
    └── src/main/java/com/acme/shop/orders/service/…
orders/orders-composition/
└── orders-server-springcloud/   unchanged name; refreshed dependency refs
```

## Verification run

- grep `<artifactId>orders-server</artifactId>` + `orders-server-com` over
  `**/pom.xml` → 0 hits
- grep `import .*orders\.server\.` over `**/*.java` → only the excluded
  adapter's own package remains, as intended
- `mvn compile` → BUILD SUCCESS on first try (ordering rules meant no
  dangling intermediate reference)
- Re-running the skill reports both pairs "already renamed — skipped"
  (idempotence proven).

## Why the ordering mattered

Had `orders-server` been replaced first, the text rule would also have
rewritten the first ten characters of `orders-server-com`, producing the
nonsense name `orders-controller-com` — the classic longest-match failure the
rules exist to prevent.
