# Worked example — a page-type layout re-cut into domain modules

Framework detected: React, feature layer `src/features/`.

## Before — organized by page type (an anti-pattern)

```
src/features/
├── lists/
│   ├── OrdersList.tsx
│   ├── CustomersList.tsx
│   └── api/ordersApi.ts        # OrdersList imports customers' data here too
├── forms/
│   ├── OrderForm.tsx
│   └── CustomerForm.tsx
└── details/
    ├── OrderDetail.tsx
    └── CustomerDetail.tsx
```

Two problems: modules are cut by page type, not business domain; and `OrdersList.tsx`
reaches directly into another area's API file.

## Boundary decision — quorum matrix

Two domains are actually present: **orders** and **customers**. Scoring each:

| Signal | orders | customers |
|--------|:------:|:---------:|
| Business independence | 1 | 1 |
| Data boundary | 1 | 1 |
| Cohesion | 1 | 1 |
| Team ownership | 1 | 0 |
| Reusability | 0 | 1 |
| **Total (of 5)** | **4** | **4** |

Both score 4 → each is a confident separate module. The page-type buckets (`lists/`,
`forms/`, `details/`) are dissolved; screens move to the domain that owns them.

## Anatomy audit (before)

| Module | MOD-01 views | MOD-02 api | MOD-04 entry | MOD-10 route | Result |
|--------|:------------:|:----------:|:------------:|:------------:|--------|
| lists/ | mixed domains | shared file | none | — | ERROR (not a domain) |

Plus an encapsulation violation: `OrdersList.tsx` imports `customersApi` internals.

## After — organized by business domain

```
src/features/
├── orders/
│   ├── OrdersList.tsx
│   ├── OrderForm.tsx
│   ├── OrderDetail.tsx
│   ├── api/ordersApi.ts
│   ├── types/order.ts
│   └── index.ts                # the only importable surface
└── customers/
    ├── CustomersList.tsx
    ├── CustomerForm.tsx
    ├── CustomerDetail.tsx
    ├── api/customersApi.ts
    ├── types/customer.ts
    └── index.ts
```

## Fixing the encapsulation violation

`OrdersList.tsx` needed a customer lookup. It used to import the customers module's API
file directly. That shared read moves behind the shared services layer:

```ts
// before — reaching into a sibling's internals
- import { fetchCustomer } from '../customers/api/customersApi';

// after — both modules use one shared door
+ import { fetchCustomer } from '@/services/api/customers';
```

The endpoint and payload are unchanged — only the import path is. The orders module no
longer knows anything about the customers module's internals.

## Verification

- Baseline green after the move batch ✔
- Grep for cross-module internal imports (including sibling `api/` files): 0 ✔
- Both modules pass MOD-01…MOD-10 ✔ · routes resolve ✔
- No page-type module remains ✔

## Why

Domain modules with one public entry each give every later step a stable target, and
routing the one shared lookup through `services/api/` means both modules depend on a single
door instead of each other's guts — a boundary that survives future change.
