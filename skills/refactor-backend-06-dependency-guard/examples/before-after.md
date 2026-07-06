# Worked example — repairing a controller → DAO shortcut (DEP-2)

## Before

`orders-controller` module, `shop.orders.controller.OrderExportController`:

```java
@RestController
@RequestMapping("/orders/export")
public class OrderExportController {

    @Autowired
    private OrderDao orderDao;          // DEP-2: controller injects a DAO directly

    @Autowired
    private ReportClient reportClient;  // EXC-1: @FeignClient — SKIP, legitimate

    @GetMapping("/{id}")
    public Map<String, Object> export(@PathVariable String id) {
        String sql = "SELECT * FROM ORDERS WHERE ID = ?";
        Map<String, Object> row = orderDao.queryForOne(sql, new Object[]{id});
        return reportClient.render(row);
    }
}
```

Scan labels: `orderDao` → **DEP-2 FAIL** (name ends `Dao`); `reportClient` → **SKIP**
(exclusion gate fires before any rule — `@FeignClient`).

## Pre-flight checklist (from the plan)

- DAO: `OrderDao`, package `shop.orders.dao` → service package `shop.orders.service`
- Interface `IOrderDelegateService`, impl `OrderDelegateServiceImpl`, in the **service module**
- Methods called by the controller: `queryForOne(String, Object[])` — copied verbatim
- No rename / split / merge / retype; SQL stays in the controller

## After

New files in `orders-service` module:

```java
// shop/orders/service/IOrderDelegateService.java
public interface IOrderDelegateService {
    Map<String, Object> queryForOne(String sql, Object[] params);
}

// shop/orders/service/impl/OrderDelegateServiceImpl.java
@Service
public class OrderDelegateServiceImpl implements IOrderDelegateService {
    @Autowired
    private OrderDao orderDao;

    @Override
    public Map<String, Object> queryForOne(String sql, Object[] params) {
        return orderDao.queryForOne(sql, params);   // pure forwarder — no logic added
    }
}
```

Controller after the swap:

```java
    @Autowired
    private IOrderDelegateService orderDelegateService;

    @GetMapping("/{id}")
    public Map<String, Object> export(@PathVariable String id) {
        String sql = "SELECT * FROM ORDERS WHERE ID = ?";   // SQL never moved
        Map<String, Object> row = orderDelegateService.queryForOne(sql, new Object[]{id});
        return reportClient.render(row);
    }
}
```

## Why, rule by rule

- The signature `queryForOne(String, Object[])` is copied character-for-character
  (IF-1). Wrapping it as `queryOrderById(String id)` would move SQL semantics into the
  service and change the refactor into a rewrite — forbidden.
- Had this controller also injected a generic `BaseDAO` declaring the same
  `queryForOne(String, Object[])`, both would merge into the one delegate and the
  colliding methods would become `orderDaoQueryForOne` / `baseDaoQueryForOne` (IF-2);
  non-colliding methods keep their names.
- `reportClient` is untouched and reported as SKIP with the exclusion reason — the
  gate runs before the rule table, so remote clients are never false positives.
- Completeness loop: after this batch, grep of the controller module for
  `import.*\.dao\.` returns zero hits, V-3 confirms the interface declares every
  called method, and the module compiles before the next batch starts.
