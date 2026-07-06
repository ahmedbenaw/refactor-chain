# Method — layered architecture restructure (full rules)

These are the deep rules behind SKILL.md. They apply to any Maven or Gradle
multi-module Java project. Examples use Maven vocabulary; translate
`dependencyManagement` → `platform`/version catalogs for Gradle.

## 1. Survey (read-only)

For every `pom.xml` / `build.gradle(.kts)` in the tree, record:

- coordinates (`groupId:artifactId:version`), `packaging`, declared `<parent>`
  and its `relativePath`
- the full `<dependencies>` list — this becomes the module's **dependency
  baseline**, used at the end to prove nothing was silently dropped
- whether the root inherits from a parent that is *not present in this repo*
  (the trigger for the self-contained root build in §5)
- layout style: flat (all leaves are root siblings) vs. already grouped

Deliverable: a module inventory table (see `templates/output.md`).

## 2. Classification into layer containers

Default container vocabulary (projects may rename; the roles are fixed):

| Container            | Role                                   | Typical name signals                          |
|----------------------|----------------------------------------|-----------------------------------------------|
| `platform/`          | project-wide shared foundation          | `*-common`, `*-util`, `*-core`, `*-starter`   |
| `{domain}/{domain}-domain/`      | the domain's business capability modules | `*-api`, `*-model`, `*-service`, `*-server`, feign/clients |
| `{domain}/{domain}-composition/` | runnable assembly / bootable apps        | `*-app`, `*-boot`, `*-springcloud`, deployment adapters |
| `{domain}/{domain}-delivery/`    | edge / BFF / experience modules          | `*-bff`, `*-web`, `*-gateway-facing`          |

Rules:

- Classification is by **module name pattern first**, declared dependencies
  second (a module depended on by many domains is foundation even if its name
  is vague). Record the deciding signal for each module.
- Every domain gets `-domain` and `-composition` containers; create
  `-delivery` only when at least one qualifying module exists — never create
  empty placeholder trees.
- Remote-client modules (feign/api clients) are **capabilities**, not
  delivery — they sit in `{domain}-domain/`.
- Ambiguous modules go into the plan flagged `NEEDS-DECISION`; ask, don't guess.

### Tiny-domain absorption

A candidate domain with **two or fewer leaf modules** is absorbed rather than
given its own tree, provided all of:

1. its leaves depend on (or are depended on by) exactly one larger domain, and
2. no leaf is an independently deployed application.

Absorbed leaves move into the host domain's matching container. Every
absorption is listed in the plan with its justification and is reversible
before confirmation.

## 3. Confirmation gate

Print the complete plan — every directory move, every new aggregator build
file, every absorption — using `templates/output.md`. Remind the user to have
a clean git state or backup. **No filesystem change before explicit approval.**

## 4. Skeleton and moves

1. Create containers top-down: root → `platform/` → each `{domain}/` → its
   three sub-containers. Each container gets an aggregator POM
   (`packaging=pom`) whose `<modules>` will list its children.
2. Move leaves with `git mv`/`mv` (preserves encoding and history).
3. Fix each moved leaf's `<parent>`: point at its new container aggregator
   with the correct `relativePath`.
4. Completeness check: every leaf from the survey is present exactly once in
   the new tree; then **delete the emptied source directories** — leaving
   ghost copies is a hard failure.

## 5. Self-contained root build

Goal: the project resolves and builds with no out-of-repo parent.

1. **Collect**: union of all leaf dependencies from the baselines.
2. **Classify** each dependency:
   - *internal-reactor* — its `artifactId` is a leaf in this repo → manage at
     `${project-version-property}`
   - *in-house platform* — same organization group but outside this repo →
     manage at the shared version property; keep a deliberately different
     version if one was pinned
   - *third-party* — everything else → if a framework BOM (Spring Boot /
     Spring Cloud / etc.) already manages it, **omit it**; otherwise carry its
     originally declared version into `dependencyManagement`
3. **Emit** the root POM: framework parent (or BOM-only if the project prefers),
   `<properties>` for the project version and BOM versions (mutually
   compatible pairs), `<modules>` for the top-level containers,
   `dependencyManagement` containing the BOM imports (`type=pom`,
   `scope=import`) first, then internal, in-house, third-party groups, and any
   repository definitions the project actually needs.
4. **Strip redundancy**: remove explicit `<version>` from every leaf
   dependency that is now managed at the root. A leaf keeps a version only
   when it intentionally diverges — record why.

## 6. Compile-verify-fix loop

1. **Import pre-scan** (before the first compile): grep each leaf's
   `src/main/java` for `import` lines, drop project-internal and `java.*`
   packages, and map the remaining package prefixes to artifacts. Add
   predicted-missing dependencies (root DM first, version-less in the leaf)
   before ever running the build — this collapses most fix iterations.
2. **Full compile**; collect `[ERROR]` lines grouped by module.
3. **Diagnose by category**:
   - *missing in-house artifact* — "package … does not exist" for an
     organization-internal package → add that artifact to the leaf POM
   - *missing framework module* — prefer the narrow artifact (`spring-web`,
     `spring-jdbc`, `spring-context`, `spring-tx`) over a fat starter in
     api/library modules; watch scopes (`provided` for servlet-api,
     `compile` when test-lib types leak into production code)
   - *missing third-party* — declare version in root DM, version-less in leaf
   - *renamed/retired artifact* — "not found in repository" errors: check
     whether the coordinate was renamed upstream (e.g. an old artifact split
     or renamed in a later major version) and update **both** root DM and
     leaf references to the modern coordinate
4. **Fix order**: root `dependencyManagement` first, then leaf additions,
   then recompile *that module* (`-pl … -am`) in reactor order
   (api → service → app), diffing against its dependency baseline.
5. **Exit criteria**: full compile zero errors; `package -DskipTests`
   succeeds; warnings tolerated.
6. **Optional start check**: find the main class in a composition module,
   confirm config files exist, run it. Common start failures and fixes:
   missing datasource → exclude the auto-config; unreachable registry →
   disable discovery; proxy/enhancer `NoClassDefFoundError` → a dependency
   `<exclusion>` removed a type referenced by a configuration class — remove
   the exclusion or add the artifact explicitly; duplicate bean names across
   jars → give one an explicit bean name. If infrastructure isn't available,
   record the start check as skipped in the report.

## 7. Encoding and edit discipline

- Edit files with precise in-place string replacement; never rewrite a whole
  file (that can drop a BOM or change encoding).
- Directory moves via shell `mv`/`git mv` only.
- Never convert encodings; a GBK file stays GBK, UTF-8-with-BOM keeps its BOM.

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
