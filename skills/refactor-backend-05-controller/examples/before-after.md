# Worked example — splitting a controller layer by API audience

Project convention chosen: `external/` + `internal/`. Legacy marker segment: `config`.

## Before

```
shop-web/src/main/java/com/acme/shop/
├── config/
│   ├── catalog/controller/CatalogController.java     # @RestController (L14)
│   ├── checkout/controller/CheckoutController.java   # @RestController (L19)
│   ├── ssoplatform/SsoTokenController.java           # @RestController (L11), directly under the biz pkg
│   ├── icontroller/IMenuController.java              # plain interface, no annotation
│   └── audit/controller/AuditController.java         # //@RestController — commented out
├── view/ReportViewController.java                    # @Controller (L9), outside any controller pkg
├── bpm/BpmController.java                            # no annotation at all
└── feign/PricingClient.java                          # @FeignClient
```

## Admission gate (annotation truth — audit trail)

| File | Verdict | Evidence |
|---|---|---|
| CatalogController | ADMIT | L14 `@RestController` |
| CheckoutController | ADMIT | L19 `@RestController` |
| SsoTokenController | ADMIT | L11 `@RestController` |
| ReportViewController | ADMIT | L9 `@Controller` |
| IMenuController | EXCLUDE EX-5 | no Spring annotation (interface definition) |
| AuditController | EXCLUDE EX-3 | annotation commented out (`//@RestController`) |
| BpmController | EXCLUDE EX-5 | name says controller; code says nothing |
| PricingClient | EXCLUDE EX-1 | `@FeignClient` remote client |

Scan reconciliation: area sums 4 = full-sweep 4 ✔ (excluded files are not counted).

## Classification (three levels, first hit stops)

| Class | Level | Rule hit | Target |
|---|---|---|---|
| SsoTokenController | L2 | keyword `sso` → internal auth domain | `…controller.internal.auth` |
| CatalogController | L3 | default external; group = segment after `config` → `catalog` | `…controller.external.catalog` |
| CheckoutController | L3 | group `checkout` | `…controller.external.checkout` |
| ReportViewController | L3 | no marker, no controller segment → last segment `view` | `…controller.external.view` |

Note what did **not** happen: `CatalogController` was not deemed "internal-ish";
`view` was not merged with anything; nothing was renamed.

## One migration in detail (`SsoTokenController`, 212 lines)

```java
- package com.acme.shop.config.ssoplatform;
+ package com.acme.shop.controller.internal.auth;
```

Written with encoding preserved → new file 212 lines (Δ0 ≤ 2 ✔). Tracking map updated
two importers, plus this file's own import of `CheckoutController`'s *planned* target —
even though CheckoutController had not moved yet. Original deleted; residual grep: 0 hits.

## After

```
com/acme/shop/controller/
├── external/
│   ├── catalog/CatalogController.java
│   ├── checkout/CheckoutController.java
│   └── view/ReportViewController.java
└── internal/
    └── auth/SsoTokenController.java
```

`IMenuController`, `AuditController`, `BpmController`, `PricingClient` stayed exactly
where they were, each with a recorded reason.

Verification: external refs 0 residual ✔ · internal cross-refs 0 residual ✔ · global
import grep clean ✔ · line-count deltas all ≤ 2 ✔ · planned 4 = moved 4 ✔.

## Why

Audience-split packages make step 06's dependency rules checkable ("externals may not
inject each other") and give reviewers an instant read on blast radius. Determinism —
annotation truth plus formula-only grouping — is what makes the check repeatable and the
fix safe to re-run.
