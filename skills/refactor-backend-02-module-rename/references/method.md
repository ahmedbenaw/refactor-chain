# Method — semantic module rename (full rules)

Deep rules behind SKILL.md. Vocabulary is Maven; the same rules apply to
Gradle (`settings.gradle` include list ↔ `<modules>`, version catalog ↔
`dependencyManagement`).

## 1. The mapping is data, not law

The skill ships an *example* convention:

| Pair | Old | New | Meaning |
|---|---|---|---|
| P-1 | `{module}-server` | `{module}-controller` | HTTP edge / controller layer |
| P-2 | `{module}-server-com` | `{module}-service` | business implementation layer |

Any project may substitute its own pairs. Everything below — ordering,
matching, exclusion, propagation — is mapping-independent.

## 2. Scan and idempotence

For each business module's capability container, check which old names exist:

- old name present → schedule the rename
- new name already present, old absent → **skip with a note** (previously
  renamed; re-running the skill is safe and changes nothing)
- both present → stop and ask; that's a conflict, not a rename

## 3. Ordering rules (all three matter)

1. **Dependency order** — rename the depended-upon module first (P-2's
   service before P-1's controller when the controller depends on the
   service). No intermediate state may contain a reference to a name that no
   longer exists on disk.
2. **Longest-match-first** — when one old name is a prefix of another
   (`x-server` ⊂ `x-server-com`), process the longer one first in every
   text-replacement pass, or the shorter rule corrupts the longer name.
3. **Exact artifactId matching** — a replacement fires only when the entire
   element value equals the old name: `<artifactId>x-server</artifactId>`
   matches; `<artifactId>x-server-springcloud</artifactId>` must not.

## 4. Exclusion list (deployment adapters)

Modules that share the old prefix but are *platform/deployment adapters* are
never renamed and never rewritten. Build the list up front by globbing the
composition containers; typical shapes:

- `{module}-server-springcloud` and other `{module}-server-{platform}`
  adapters (cloud-vendor or runtime-specific assemblies)
- any module the user marks keep-as-is in the plan

Their POMs still get *dependency reference* updates when they depend on a
renamed module — exclusion covers their own identity, not their references.

## 5. Propagation surface (complete list)

| Surface | Change |
|---|---|
| directory | `mv {old}/ {new}/` under the capability container |
| module's own POM | `<artifactId>` → new name; `<parent>` **unchanged** (container not renamed) |
| container POM | `<module>` entries → new names |
| root POM | `dependencyManagement` artifactIds → new names |
| all POMs project-wide | every `<dependency>` on an old name → new name (exact match) |
| Java `package` lines | old package segment → new segment, longest-first (see §6) |
| Java `import` lines | same mapping, project-wide |
| source directories | physical move under `src/main/java` to match new packages |
| config files | usually none; check path-bearing keys (e.g. MyBatis mapper locations); do NOT change the registered service name unless explicitly requested — it affects service discovery |

## 6. Package/import rewrite

If source packages embed the old suffix (e.g. `….orders.server.com.…`,
`….orders.server.…`), map them the same way, longest segment first:

```
step 1:  .{module}.server.com.   →  .{module}.service.
step 2:  .{module}.server.       →  .{module}.controller.
```

Exclusions:

- adapter package namespaces (e.g. `….{module}.server.springcloud.…`) keep
  their packages — but their `import` lines that point at renamed capability
  classes DO get updated
- framework-owned packages that coincidentally contain the token (e.g.
  `org.springframework.*.server.*`) are never touched

Scope discipline: apply `package`-line rewrites only inside the renamed
modules' own source trees; apply `import`-line rewrites project-wide. After
rewriting, move the affected directory subtrees so path == package again.

## 7. Verification checklist

| # | Check | How |
|---|---|---|
| V1 | directories renamed | glob the capability containers |
| V2 | own artifactIds updated | read each renamed POM |
| V3 | container module lists updated | read container POMs |
| V4 | root dependencyManagement updated | read root POM |
| V5 | zero old artifactId residue | project grep `<artifactId>{old}</artifactId>` over `**/pom.xml` → empty |
| V6 | package == path | walk renamed modules' source trees |
| V7 | zero old package residue | grep `import .*\.{module}\.server(\.com)?\.` over `**/*.java` → only excluded adapters |
| V8 | build passes | full compile, zero errors |

## 8. Edit discipline

- In-place, exact string edits; never rewrite whole files (encoding/BOM
  preservation).
- Directory renames via `mv`/`git mv`.
- One rename pair fully propagated and verified before starting the next when
  the pairs interact; otherwise batch by dependency order.

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
