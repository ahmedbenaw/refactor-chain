# Worked example — class rename + method-compat broadening

A small ordering module with two findings: a blacklisted class suffix and a
delete endpoint that the team's convention wants POST-compatible.

## Finding 1 — `OrderCtrl` → `OrderController` (fixable, N-02)

### Before

`src/main/java/com/acme/shop/controller/OrderCtrl.java`:

```java
package com.acme.shop.controller;

@RestController
@RequestMapping("/run/order")
public class OrderCtrl {
    // endpoints …
}
```

Referenced from a scheduler:

```java
import com.acme.shop.controller.OrderCtrl;

@Component
public class OrderDigestJob {
    @Autowired
    private OrderCtrl orderCtrl;
}
```

### Steps taken

1. Idempotence: name ends `Ctrl` → fix needed.
2. Collision pre-check: `grep -r "class OrderController"` → 0 hits; default
   bean name `orderController` unused → safe.
3. Class declaration edited to `public class OrderController`.
4. `mv OrderCtrl.java OrderController.java` (encoding preserved).
5. References updated — import, field type, and the injection variable
   (`orderCtrl` equals the old name first-lowered, so it becomes
   `orderController`).
6. `grep -r "OrderCtrl" --include='*.java'` → 0 hits.

### After

```java
public class OrderController {
    // endpoints … (bodies untouched)
}
```

```java
import com.acme.shop.controller.OrderController;

@Component
public class OrderDigestJob {
    @Autowired
    private OrderController orderController;
}
```

**Why safe:** no URL, JSON field, or method body changed; only an internal
type name and its references. A custom-named variable (say
`private OrderCtrl legacyOrders;`) would have kept its name — type only.

## Finding 2 — delete endpoint POST-compat (fixable, N-01 / F-1)

### Before

```java
@DeleteMapping(value = "/run/order/delete/byId", produces = "application/json")
public Result<Boolean> deleteById(@RequestParam Long id) { … }
```

### After

```java
@RequestMapping(value = "/run/order/delete/byId",
        method = {RequestMethod.DELETE, RequestMethod.POST},
        produces = "application/json")
public Result<Boolean> deleteById(@RequestParam Long id) { … }
```

Import bookkeeping: `RequestMethod` added; `DeleteMapping` import removed
because the file no longer uses it.

**Why safe:** existing DELETE callers work unchanged — the method set was
broadened, never narrowed, and the URL is identical.

## Constrained finding, reported but not fixed

`UserDTO.user_name` (underscored DTO field) appears in the report's
constrained section with the reason "changes the JSON wire format; pin with a
serialization alias first if you want this renamed" — no edit is made.

## Idempotence proof

Running the skill again on this module reports both former findings as PASS
and produces zero edits.
