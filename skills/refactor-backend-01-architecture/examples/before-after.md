# Worked example — flat Maven build → layered structure

Fictional project: `com.acme.shop`, nine flat modules, root POM inherits from
a corporate parent (`com.acme:corp-parent`) that is not in the repo.

## Before

```
shop/
├── pom.xml                    (parent: com.acme:corp-parent — unresolvable offline)
├── shop-common-util/
├── orders-api/
├── orders-model/
├── orders-service/
├── orders-app/
├── billing-api/
├── billing-service/
├── coupons-api/               (tiny domain: 2 leaves)
└── coupons-service/
```

Problems: roles invisible; `coupons` too small to justify a tree; leaf POMs
repeat versions the corporate parent used to manage; the build only works on
the corporate network.

## Classification decisions

| Module            | Signal                     | Placement                          |
|-------------------|----------------------------|------------------------------------|
| shop-common-util  | `*-util`, used by all      | `platform/`                        |
| orders-api/model/service | capability names     | `orders/orders-domain/`            |
| orders-app        | bootable assembly          | `orders/orders-composition/`       |
| billing-api/service | capability names         | `billing/billing-domain/`          |
| coupons-*         | ≤2 leaves, only billing depends on them → **absorbed** | `billing/billing-domain/` |

No delivery/BFF modules exist, so no `-delivery` containers are created.

## After

```
shop/
├── pom.xml                    (self-contained: spring-boot parent + full dependencyManagement)
├── platform/
│   ├── pom.xml                (packaging=pom)
│   └── shop-common-util/
├── orders/
│   ├── pom.xml
│   ├── orders-domain/
│   │   ├── pom.xml
│   │   ├── orders-api/  orders-model/  orders-service/
│   └── orders-composition/
│       ├── pom.xml
│       └── orders-app/
└── billing/
    ├── pom.xml
    └── billing-domain/
        ├── pom.xml
        ├── billing-api/  billing-service/
        ├── coupons-api/  coupons-service/     ← absorbed
```

## Root POM essence (new)

```xml
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>2.7.18</version>
</parent>
<properties>
  <shop.version>1.4.0</shop.version>
  <spring-cloud.version>2021.0.9</spring-cloud.version>
</properties>
<dependencyManagement><dependencies>
  <dependency>  <!-- BOM import first -->
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-dependencies</artifactId>
    <version>${spring-cloud.version}</version>
    <type>pom</type><scope>import</scope>
  </dependency>
  <!-- internal reactor modules, all at ${shop.version} -->
  <dependency><groupId>com.acme.shop</groupId><artifactId>orders-api</artifactId><version>${shop.version}</version></dependency>
  <!-- … one entry per leaf … -->
  <!-- third-party not covered by a BOM keeps its surveyed version -->
  <dependency><groupId>commons-collections</groupId><artifactId>commons-collections</artifactId><version>3.2.2</version></dependency>
</dependencies></dependencyManagement>
```

Leaf POMs then drop every `<version>` that the root now manages.

## Compile loop transcript (abridged)

1. Import pre-scan predicted `orders-api` needs `spring-web` (uses
   `@RequestMapping`) — added before the first compile.
2. First full compile: `billing-service` failed — "not found in repository"
   for an artifact renamed upstream two major versions ago; updated the
   coordinate in root DM and the leaf.
3. Recompiled `billing-service` alone (`-pl … -am`): green. Baseline diff:
   no dependency lost, two added (both recorded).
4. `mvn package -DskipTests`: BUILD SUCCESS. Old flat directories removed.

## Why this is behavior-preserving

Only POM files moved/changed, plus zero Java lines — package roots were
unaffected by these moves because module directories, not source packages,
were relocated. The application boots identically; it just builds anywhere.
