# Worked example — tidying a DAO layer and consolidating models

## Before

```
inventory-service/src/main/java/com/acme/inventory/
├── dao/
│   ├── StockDao.java                 # I-less interface at root        → D-2 WARN
│   ├── StockDaoImpl.java             # impl mixed into dao/ root        → D-2 FAIL
│   ├── ItemMapper.java               # mapper at dao/ root              → D-3 FAIL
│   └── ItemEntity.java               # entity at dao/ root              → D-3 FAIL
├── daoImp/                           # misspelled compound directory    → D-1 FAIL
│   └── WarehouseDaoImpl.java
├── model/
│   ├── StockLevel.java               # model class in the feature module → D-6 WARN
│   └── ItemView.java
└── promo/                            # entity + mapper + service inside  → D-7 INFO
    ├── PromoEntity.java
    ├── PromoMapper.java
    └── PromoService.java
```

## Classification pass (filename + position only, first match wins)

| File | Row hit | Decision |
|------|---------|----------|
| `StockDaoImpl.java` | ends `Impl.java` | → `dao/impl/` |
| `WarehouseDaoImpl.java` | ends `Impl.java` (inside `daoImp/`) | dir renamed to `dao/impl/`, file already correct there |
| `ItemMapper.java` | ends `Mapper.java` | → `dao/mapper/` |
| `ItemEntity.java` | ends `Entity.java` | → `dao/entity/` |
| `StockDao.java` | starts `I` + upper? no — but presumed interface by position at `dao/` root | stay at `dao/` root |
| `StockLevel.java`, `ItemView.java` | model classes | copy → shared model module (packages untouched) |
| `promo/` | two-of-three trio, not a standard layer dir | INFO, skipped entirely |

The `daoImp/` directory is renamed to `dao/impl/`; no `Imp`-named directory is reused as a
target. The `promo/` mini-domain is left completely alone.

## One DAO move in detail (`ItemMapper.java`)

```java
// before                                    // after (only this line changed)
package com.acme.inventory.dao;              package com.acme.inventory.dao.mapper;
```

Conflict pre-check at `dao/mapper/ItemMapper.java`: destination absent → move. Then every
importer is repointed:

```java
- import com.acme.inventory.dao.ItemMapper;
+ import com.acme.inventory.dao.mapper.ItemMapper;
```

## One model move in detail (`StockLevel.java`) — compile-neutral

```java
// before AND after — the package line is byte-identical
package com.acme.inventory.model;
```

The file physically moves from `inventory-service/.../model/StockLevel.java` into the
shared model module at `inventory-model/src/main/java/com/acme/inventory/model/StockLevel.java`.
Because the fully-qualified name never changes, **not a single import anywhere is edited**.

## After

```
inventory-service/src/main/java/com/acme/inventory/
├── dao/
│   ├── StockDao.java                 # interface, at root
│   ├── impl/
│   │   ├── StockDaoImpl.java
│   │   └── WarehouseDaoImpl.java
│   ├── mapper/
│   │   └── ItemMapper.java
│   └── entity/
│       └── ItemEntity.java
└── promo/                            # mini-domain, untouched (INFO)
    ├── PromoEntity.java
    ├── PromoMapper.java
    └── PromoService.java

inventory-model/src/main/java/com/acme/inventory/model/
├── StockLevel.java                   # moved here; package unchanged
└── ItemView.java
```

## Verification

- V1 no `imp` residue ✔ · V2 DAO placement ✔ · V3 mapper/entity split ✔
- V4 model classes centralized ✔
- V5 model `package` lines before vs after — empty diff ✔ (zero imports changed)
- Compile ✔ · Re-run of the check plans zero further moves (idempotent) ✔

## Why

Sorting the data layer by a filename-only table means a re-run always agrees with the
first run, and moving model classes without touching a single `package` line lets external
callers keep their exact imports while the classes live in one shared home.
