# Worked example — consolidating a scattered service layer

## Before

```
orders-service/src/main/java/com/acme/orders/service/
├── OrderService.java            # interface, in the root          → SVC-3 FAIL
├── OrderServiceImpl.java        # @Service class, in the root     → SVC-1 FAIL
├── billing/
│   ├── BillingService.java      # interface in a business sub-pkg → SVC-3 FAIL
│   └── impl/
│       └── BillingServiceImpl.java  # scattered impl folder       → SVC-4 FAIL
├── imp/                         # misspelled legacy dir           → SVC-4 FAIL
│   └── LegacyReportServiceImpl.java
├── shipping/
│   ├── ShippingRateClient.java  # @FeignClient interface          → excluded (remote client)
│   └── ShippingConstants.java   # constants                       → SVC-5 WARN (stays)
└── (no facade/ directory)                                          → SVC-2 FAIL
```

## Classification pass (deterministic, first match wins)

| File | Rule hit | Decision |
|---|---|---|
| `OrderService.java` | interface + `Service` suffix | → `service/facade/` |
| `BillingService.java` | interface + `Service` suffix | → `service/facade/` |
| `ShippingRateClient.java` | `@FeignClient` interface | stay in place |
| `OrderServiceImpl.java` | class + `ServiceImpl` suffix | → `service/impl/` |
| `BillingServiceImpl.java` | class + `ServiceImpl` suffix | → `service/impl/` |
| `LegacyReportServiceImpl.java` | class + `ServiceImpl` suffix | → `service/impl/` |
| `ShippingConstants.java` | non-service class | stay; SVC-5 WARN |

Conflict pre-check: no duplicate basenames among candidates, destinations empty → proceed.
The `imp/` directory is **not** reused as a target; a fresh `impl/` is created.

## One move in detail (`BillingService.java`)

```java
// before                                   // after (only this line changed)
package com.acme.orders.service.billing;    package com.acme.orders.service.facade;
```

Then every importer is updated:

```java
- import com.acme.orders.service.billing.BillingService;
+ import com.acme.orders.service.facade.BillingService;
```

A wildcard import `import com.acme.orders.service.billing.*;` in `InvoiceJob.java` was
narrowed: `BillingService` moved out but the package still holds other used classes, so
the wildcard stays **and** an explicit import of the new path is added.

## After

```
orders-service/src/main/java/com/acme/orders/service/
├── facade/
│   ├── BillingService.java
│   └── OrderService.java
├── impl/
│   ├── BillingServiceImpl.java
│   ├── LegacyReportServiceImpl.java
│   └── OrderServiceImpl.java
└── shipping/
    ├── ShippingRateClient.java   # remote client, untouched
    └── ShippingConstants.java    # WARN noted for a later step
```

Verification: structure ✔ · references (0 old-path hits) ✔ · content (package line only,
Δlines ≤ 1 per file) ✔ · counts (2 interfaces / 3 impls before and after) ✔.

## Why

Interfaces in one package give every later chain step a stable address: step 06 can swap
impl injections for interface injections without hunting, and callers depend on a package
that never contains concrete classes. Behavior is unchanged — no method body was edited.
