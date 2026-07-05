# Worked example — one EXTRACT migration and one RETAIN refusal

## Before

```
orders-service/src/main/java/com/acme/orders/
├── util/
│   └── DateUtil.java            # pure static helpers, no module imports
└── config/
    └── OrderMapperScanConfig.java   # drives a mapper scan of com.acme.orders.dao

billing-service/src/main/java/com/acme/billing/
└── util/
    └── DateUtil.java            # a copy-paste of the same helper

acme-common/                     # shared module, registered in the parent build file
└── src/main/java/com/acme/common/
    └── (no util package yet)
```

## Classification pass (four gates, first hit wins, grep evidence only)

| File | Gate that fired | Grade | Evidence |
|------|-----------------|-------|----------|
| `DateUtil.java` (orders) | Gate 3 — reach | **EXTRACT** | referenced by `orders-service` and `billing-service` → 2 modules ≥ threshold; no service/DAO imports; no module beans injected |
| `OrderMapperScanConfig.java` | Gate 1 — red line | **RETAIN** | it configures a persistence scan of `com.acme.orders.dao`; moving it would change what gets scanned and break startup |

## The EXTRACT migration in detail (`DateUtil.java`)

Family order places `util` after `constant/enums/exception`. The seven-step loop:

1. Read `orders-service/.../util/DateUtil.java`.
2. Target path: `acme-common/.../util/DateUtil.java`. The family package name `util` is
   preserved, so the declaration does not change.

   ```java
   // before AND after — byte-identical
   package com.acme.common.util;   // (already, or normalized to the common namespace)
   ```

3. `cp` to the target, preserving encoding.
4. Grep every importer across all modules.
5. Package unchanged → no import edits required.
6. Delete the source file.
7. Verify: target package matches path ✔, references resolve ✔, source gone ✔.

The duplicate `DateUtil.java` under `billing-service` is reconciled by the same rule — the
common copy wins, the stray is removed, importers point at the one shared class.

## The RETAIN refusal in detail (`OrderMapperScanConfig.java`)

Gate 1 fires immediately: this class is a persistence-scanner configuration. It is an
absolute red line and is **never** moved. The report records it as RETAIN with the reason
"persistence-scanner config — moving it would break the module's data access at startup."
No further gates are evaluated.

## After

```
acme-common/src/main/java/com/acme/common/
└── util/
    └── DateUtil.java            # one shared copy

orders-service/src/main/java/com/acme/orders/
└── config/
    └── OrderMapperScanConfig.java   # stayed put (RETAIN)

billing-service/                 # its DateUtil.java copy is gone; now depends on common
```

Build rewiring: `orders-service` and `billing-service` gain a dependency on `acme-common`;
`acme-common` gains only the third-party libraries `DateUtil` actually imports.

## Verification

- Moved file's package matches its new path ✔
- Every import of `DateUtil` resolves ✔ · source paths gone ✔ · empty dirs cleaned ✔
- Build compiles across modules ✔
- Idempotence: a re-run reports an empty migration list ✔

## Why

One shared copy of a dependency-free helper removes the copy-paste drift across modules,
while the red-line refusal keeps a scanner config where it must stay — the pass moves what
is safe and provably refuses what is not.
