# Worked example — a layering rule catches a violation mid-refactor

## Setup

A Spring Boot service, `orders-api`. `refactor-understand` reported: Java 17,
Spring Boot, folders `controller/`, `service/`, `repository/`, `dto/`. The chain
is about to run the backend lane to modernize `OrderController`.

## Step 1 — extract rules (read-only)

`refactor-rules` scans and infers the dominant patterns:

- **Layering:** 18 of 18 `@RestController` classes call a `@Service`; **0** call a
  `@Repository` directly. → dominant, `ERROR`.
- **DI:** 41 of 43 collaborators are constructor-injected; 2 use field injection.
  → convention, `WARNING`.
- **Naming:** every repository ends in `Repository`, every DTO in `Dto`. →
  dominant, `ERROR`.

Resulting `rules-manifest.md` (excerpt):

| ID | Rule | Severity | Detection | Conforming | Violating |
|----|------|----------|-----------|-----------:|----------:|
| `R01` | Controllers must go through a service; never reference a `*Repository` directly. | `ERROR` | `@RestController` class imports/uses a `*Repository` type | 18 | 0 |
| `R02` | Collaborators are constructor-injected, not field-injected. | `WARNING` | `@Autowired` on a field | 41 | 2 |
| `R03` | Repositories end in `Repository`; DTOs end in `Dto`. | `ERROR` | member in `repository/` or `dto/` breaking the suffix | 30 | 0 |

Human confirms all three. No vetoes.

**Baseline recorded:** `{ "R01": 0, "R02": 2, "R03": 0 }`.

## The change (by the backend lane)

While "simplifying" `OrderController`, a step inlines a lookup for speed and
writes:

```java
// BEFORE (rule-conforming)
public OrderView get(long id) {
    return orderService.view(id);            // controller → service ✔
}
```

```java
// AFTER (introduced a violation)
@Autowired OrderRepository orderRepository;  // R02: field injection
public OrderView get(long id) {
    var o = orderRepository.findById(id)     // R01: controller → repository ✘
                           .orElseThrow();
    return OrderView.of(o);
}
```

The tests still pass — behavior is identical — so a behavior-only gate would wave
this through. But it silently broke the project's architecture.

## Step 2 — enforce (after)

`refactor-rules` re-runs the identical detection:

**After:** `{ "R01": 1, "R02": 3, "R03": 0 }`.

**Delta:**
- `R01` (`ERROR`): `0 → 1` — a controller now calls a repository directly. **New
  ERROR violation.**
- `R02` (`WARNING`): `2 → 3` — one new field injection.

**Verdict:** `drift`. The skill emits:

```json
{
  "delta": "drift",
  "newViolations": [
    { "rule": "R01", "file": "controller/OrderController.java",
      "detail": "OrderController now uses OrderRepository directly; must go through OrderService" },
    { "rule": "R02", "file": "controller/OrderController.java",
      "detail": "field injection of OrderRepository; use constructor injection" }
  ]
}
```

## Why this matters

The behavior tests were green, so nothing else in the chain would have flagged
this. `refactor-rules` caught that the change violated the project's *own*
architecture. It did **not** edit anything — it reported the drift to the review
gate. The fix (route through `OrderService`, constructor-inject) is then made and
re-verified, at which point the after-counts return to `{ "R01": 0, "R02": 2,
"R03": 0 }` and the delta is `legal`.
