# Layered dependency guard — full method

Deterministic rulebook behind `refactor-backend-06-dependency-guard`. Same tree + same
rules ⇒ same report, same plan, same result. Check and fix share every algorithm here,
so a check finding is exactly a fix action.

## 1. Scope and module detection

Read the build files (`pom.xml` modules or Gradle `settings.gradle` includes) and map
which modules hold controller, service, DAO, and model code. Common conventions —
`<module>-controller` / `<module>-service` / `<module>-model`, or a single module with
`controller` / `service` / `dao` / `model` packages — are detected, never assumed.
Record the mapping in the report header; DEP-6 uses it as its placement contract.

## 2. Exclusion gate — remote clients (checked before every rule)

An injected type is a legitimate remote call, marked SKIP with a reason, if **any**
of the following holds:

| ID | Signal |
|----|--------|
| EXC-1 | Type carries `@FeignClient` (or the project's equivalent remote-client annotation) |
| EXC-2 | Type name ends `Client`, `Feign`, or `Api` and it is an interface |
| EXC-3 | Interface methods carry request-mapping annotations (`@RequestMapping`, `@GetMapping`, …) |
| EXC-4 | Type lives in a remote-client / API module or a `.client.` / `.feignclient.` package |
| EXC-5 | Interface extends another controller interface (remote-contract inheritance) |

Also SKIP: a controller class referenced **only** as a class literal for logging
(`FooController.class` passed to a logger factory) — that is not a field injection.

## 3. Rule table — deterministic first-match labeling

Rules are evaluated in this exact order against the **injected type's characteristics**
(never the call scenario); the first match assigns the ID. FAIL must be fixed; WARN is
advisory.

| ID | Severity | Match condition |
|----|----------|-----------------|
| DEP-1 | FAIL | Controller injects another controller. A type is a controller if its name ends `Controller`, OR it carries an active `@RestController`/`@Controller`, OR its package contains `.controller.` — any one suffices, even if it also carries `@Service`. |
| DEP-2 | FAIL | Controller injects a data-access type: name ends `Dao`/`DAO`/`Mapper`, or annotated `@Repository`/`@Mapper`. |
| DEP-3 | FAIL | Controller injects a concrete implementation: type name ends `ServiceImpl`, or package contains `.impl.`, or a concrete `*Service` class where an interface exists. |
| DEP-4 | WARN | Persistence entity types appear in controller fields, parameters, or return types (exposes storage shape). |
| DEP-5 | WARN | Import of a concrete class from a sibling business module that is not exposed through a shared API/interface module. |
| DEP-6 | FAIL | A controller/service/DAO/model class resides outside the module the detection map assigns to its layer. |

## 4. Repair engine

Fix order is fixed: **DEP-6 first** (placement moves, so later edits target final
locations), then DEP-1, DEP-2, DEP-3, then DEP-4/DEP-5 advisories.

### 4.1 DEP-1 — controller-to-controller coupling (decision tree, first hit stops)

```
0. Injected type passes the exclusion gate?            → SKIP (reason recorded)
1. Reference is logger-only (class literal, no field)? → SKIP
2. Target controller has a service interface covering
   every method the caller invokes?                    → Strategy A: swap the field type
3. Interface exists but misses some invoked methods?   → Strategy A + append the missing
                                                          declarations (signatures copied
                                                          from the implementation verbatim)
4. Invoked methods contain composite logic (session
   handling, multi-service orchestration)?             → Strategy B: extract a private
                                                          helper in the calling controller,
                                                          route it through services, drop
                                                          the controller injection
5. None of the above                                   → SKIP, flagged for a human
```

Strategy A changes only the field type, field name, and import — never call sites'
method names, parameters, or shape. Forbidden: wrapping a controller call in a new
"business" service method; adding methods to unrelated services.

### 4.2 DEP-2 — delegate-service synthesis (controller → DAO shortcut)

Create a thin pass-through service between the controller and the DAO:

1. **Placement.** New interface + impl go in the **service module**, never the
   controller module. Package = the DAO's business-domain subpackage with `service`
   substituted for `dao` (e.g. `config.user.dao` → `config.user.service`). If one
   controller injects DAOs from several domains, place the service under the
   controller's own domain. Never invent scenario-named packages.
2. **Naming.** Interface = `I` + DAO name minus `Dao/DAO` + `DelegateService`
   (`UserDao` → `IUserDelegateService`); impl = interface minus `I` plus `Impl`.
   No scenario prefixes.
3. **Merging.** All DAOs injected by **one controller** merge into that controller's
   single delegate service. Never reuse a delegate service across controllers — each
   controller gets its own, even for the same DAO.
4. **SQL never moves.** Only the DAO **method-call statements** route through the
   delegate; SQL strings and concatenation stay in the controller. The delegate method
   is a pure forwarder: `return dao.method(args);`.
5. **Pre-flight checklist (blocking).** Before creating anything, list in the plan:
   DAO class + package, derived service package, derived interface/impl names, every
   DAO method the controller calls with its full original signature, and confirmation
   that no rename/split/merge/retype occurs. Any unknown ⇒ stop and re-analyze.

### 4.3 Interface-design rules (apply to 4.1–4.4)

- **IF-1 Exact signatures.** Method name, parameter types (including raw vs. generic),
  return type, and `throws` are copied character-for-character from the source
  implementation or DAO. Type tightening (`Object` → `Map<…>`, `List` → `List<Foo>`)
  is forbidden — casts belong in the controller.
- **IF-2 Collision prefixes (deterministic).** When one delegate merges multiple DAOs
  and two DAOs declare the **same signature**, prefix each colliding method with its
  DAO field name (`userDao` → `userDaoQueryForOne`; generic base DAO → `baseDao…`).
  Non-colliding methods keep their original names — prefixing them is forbidden, as is
  prefixing only some collisions or using invented prefixes.
- **IF-3 Method ordering (deterministic).** Group methods by source DAO in the order
  the controller first injects them; within a group, order by the **minimum line number
  of the first call site** in the controller. Interface extraction for DEP-3 orders by
  first call site across the union of all calling controllers. Impl mirrors the
  interface order.
- **IF-4 Minimal surface.** Grep **all** controllers that inject the implementation;
  the interface declares exactly the union of methods actually called — never the
  impl's full public surface. Overloads are declared individually.
- **IF-5 No merge/split/rename.** One source method = one interface method, always.

### 4.4 DEP-3 — impl-injection switch

Every `import …service.impl.…` in a controller with a used field **must** be fixed —
no selective skipping. Only an injected-but-never-called field may be SKIPped.
Fix: change the field type to the interface (extracting one per IF-1…IF-5 if absent),
update the import, keep the field name.

## 5. Completeness loop

- **Batch checkpoints.** After every 3–5 FAIL fixes: interface-completeness check
  (V-3) + incremental compile (V-4). Never defer compilation to the end — missing
  interface methods compound into an avalanche of errors.
- **V-1 impl-residue sweep:** grep controller modules for `import.*service\.impl\.` — zero non-SKIP hits.
- **V-2 DAO-residue sweep:** grep controller modules for `import.*\.dao\.` / `Mapper` imports — zero non-SKIP hits.
- **V-3 interface completeness:** for each swapped field, grep every controller for
  `field.` call sites and confirm each invoked method (every overload) is declared.
- **V-4 incremental compile** of the touched modules; **V-5 full build** at the end.
- **V-6 placement:** every layered class matches the DEP-6 module map.
- Count reconciliation: fixed + SKIPped = reported. Then the chain verify gate.

## 6. Why step 06 runs here

Steps 03–05 normalize DAO/model, service, and controller structure. By step 06 every
service interface either exists or has a deterministic home, so DEP-1/DEP-3 swaps and
DEP-2 synthesis always have a target — repairs cannot dead-end on missing structure.

## Stack mapping (registry-driven)

This step's concepts are architectural, not language features. Detection, build,
and test commands come from the language registry (`scripts/lib/languages.mjs`);
apply the concept through your stack's native equivalent:

| Concept | Java/Kotlin (Spring) | C#/.NET | Go | Python | Ruby/PHP | Rust |
|---|---|---|---|---|---|---|
| Module / unit of build | Maven/Gradle module | project in a solution | Go module/package | package | gem/package | crate (workspace) |
| Controller layer | `@RestController` | Controller class | HTTP handler | view/handler | controller | axum/actix handler |
| Service layer | `@Service` iface+impl | service class + DI | service struct | service module | service object | service module |
| Data access (DAO/repo) | Repository/Mapper | DbContext/repository | repository struct | repository/ORM model | ActiveRecord/Eloquent | repo + sqlx/diesel |
| Entity/model | JPA entity / POJO | entity class | struct | dataclass/model | model | struct |
| Dependency injection | Spring DI | built-in DI | constructor wiring | explicit imports/DI lib | container | constructor wiring |

A concept that has no equivalent in the detected stack is reported **N/A —
skipped** by the check, never forced. Adding a language to this lane is a
registry data edit (`lane: "backend"`), not code.
