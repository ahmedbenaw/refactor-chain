# DAO & model-layer tidy-up — full method

This is the exhaustive rulebook behind `refactor-backend-03-dao-model`. Everything here is
deterministic: the same source tree plus the same rules always produce the same report
and the same fix plan. Whenever a file is genuinely ambiguous, stop and report it rather
than deciding by feel. The overriding contract is **behavior preservation** — this step
moves and renames existing files; it never edits logic, signatures, class names, or build
dependencies.

## 1. Scope resolution (decided once)

Freeze the search root before anything else:

1. Start at the `pom.xml` / `build.gradle` of the module that owns the target file.
2. Walk up `<parent>` (or Gradle `rootProject`) links until the topmost in-repo build
   file — one with no parent, or whose parent points at a remote repository.
3. That build file's directory is the search root for the entire run.
4. If an aggregator build file at the repo root lists several module directories, the
   root widens to the aggregator's directory.

Excluded from every scan and grep: `target/`, `build/`, `.git/`, `.idea/`, and any local
build-cache directories. This scope is fixed in the scan phase and never re-decided
mid-run — reference searches use the same root so a move can never miss an importer.

## 2. Self-contained domain exemption

A directory is an independent mini-domain, and is skipped entirely, when **all** hold:

- it carries at least two of the trios `entity`/`model`, `mapper`/`dao`, `service` inside
  itself (i.e. it is a small vertical slice, not a shared layer);
- it is not one of the four standard layer directories (`controller/`, `service/`,
  `dao/`, `model/`);
- it is not a nested configuration directory.

Such a directory is reported as INFO and left untouched. Its files are neither moved nor
renamed. The only edits allowed inside it are `import` lines that must change because a
file elsewhere moved.

## 3. Classification table (filename + position only)

File contents are **never** read to classify. Classification is a pure function of the
filename and the directory the file already sits in. First matching row wins:

| Priority | Condition | Class | Destination |
|----------|-----------|-------|-------------|
| 1 | already under `dao/impl/` | implementation | stay |
| 2 | already under `dao/mapper/` | mapper interface | stay |
| 3 | already under `dao/entity/` | entity | stay |
| 4 | filename ends `Impl.java` | implementation | `dao/impl/` |
| 5 | filename ends `Mapper.java` | mapper interface | `dao/mapper/` |
| 6 | filename ends `Entity.java` | entity | `dao/entity/` |
| 7 | filename starts `I` + 2nd char uppercase | DAO interface | stay at `dao/` root |
| 8 | fallback | implementation (presumed) | `dao/impl/` |

Reading a file body to override this table is forbidden — it is the single guarantee that
two runs on the same tree agree.

## 4. Check items

Each item is rated **FAIL** (must fix), **WARN** (should fix), or **INFO** (note only).

| ID | Check | Severity |
|----|-------|----------|
| D-1 | `imp`→`impl` naming, including compound variants (`serviceImp/`, `daoImp/`). | FAIL |
| D-2 | DAO implementations live under `dao/impl/`; interfaces stay at `dao/` root. | FAIL / WARN |
| D-3 | `*Mapper.java` under `dao/mapper/`, `*Entity.java` under `dao/entity/`. | FAIL / WARN |
| D-4 | Four-layer completeness — `dao/` has the sub-directories the present files need. | WARN |
| D-5 | MyBatis mapper XML sits beside its interface (resources path ↔ mapper package). | WARN |
| D-6 | Model classes consolidated into the shared model module. | WARN / INFO |
| D-7 | Independent mini-domain detected (see §2). | INFO |

Check mode stops after emitting the report (`templates/output.md`). Nothing is changed.

## 5. Fix plan and confirmation

1. **Idempotency pre-check.** List what is already compliant; those items produce zero
   moves.
2. **Enumerate.** Every directory rename, every file move, every created directory,
   spelled out with source and destination.
3. **Confirm.** Present the plan; execute nothing until the user explicitly approves.

## 6. Execution order (fixed for idempotence)

a. **`imp`/`*Imp` → `impl`** directory renames, updating the `package` line of every file
   inside and every `import` that referenced the old path.

b. **DAO relocation** per the §3 table: `*Impl.java` → `dao/impl/`, `*Entity.java` →
   `dao/entity/`, `*Mapper.java` → `dao/mapper/`, `I`-prefixed interfaces stay put,
   everything else defaults to `dao/impl/`.

c. **Mapper / entity separation**, gated by a three-state location pre-check per class:

   | State | Meaning | Action |
   |-------|---------|--------|
   | only-elsewhere | the class exists only outside its home sub-package | migrate it in |
   | already-home | it already sits under `dao/mapper/` or `dao/entity/` | skip |
   | both | copies exist in the home package and a stray package | keep the in-home copy, delete the stray, repoint every importer to the home path |

   Never migrate a class *outward* from its home; never create a new mapper package
   outside `dao/`.

d. **Model consolidation** into the shared model module — files are copied to the model
   module's matching package path; `package` declarations stay byte-identical, so not one
   `import` changes.

e. **Create missing standard directories** — directories only, never placeholder files.

## 7. Move protocol (every single file)

1. Read the entire original file.
2. **Conflict pre-check** at the destination with a glob for the same basename.
3. Create the file at the destination (copy, preserving encoding and any BOM).
4. Verify the written content.
5. Delete the original.

Conflict policy is three-way and deterministic:

| Destination | Content | Action |
|-------------|---------|--------|
| absent | — | move normally |
| present | identical (ignoring `package` line + AI-marker comments) | drop the source duplicate, repoint imports to the destination |
| present | different | **stop this file**, mark it CONFLICT in the report, wait for a human |

## 8. Compile-neutral model guarantee

The model consolidation is compile-neutral *by construction*. The `package` line of every
moved model class and every `import` that references it are inviolable. Files change
location on disk; fully-qualified names do not. Break this and the guarantee dies, so the
verify phase diffs the `package` lines before and after and requires an empty diff.

## 9. Hard negative scope

- No build-file (`pom.xml` / `build.gradle`) dependency edits — if a move seems to demand
  one, note it in the report and stop; do not touch the dependency block.
- No new services, DAO interfaces, or implementation classes invented — this step only
  moves and renames files that already exist.
- No controller or business-logic edits; the only permitted controller change is an
  `import` line forced by a DAO file that moved.
- Classification is filename + position only; reading contents to classify is forbidden.
- New or updated imports use concrete class names (never wildcards), keep a stable
  ordering, and prefer simple names over inline fully-qualified references.
- Explicit confirmation precedes any change; a moved original is deleted only after its
  copy verifies.

## 10. Verification (V1–V5)

1. **V1** — no `imp` residue: zero misspelled directories, zero old-path import hits.
2. **V2** — DAO placement correct: impls under `dao/impl/`, interfaces at `dao/` root.
3. **V3** — mapper/entity split holds: `*Mapper.java` and `*Entity.java` in their homes.
4. **V4** — model classes centralized in the shared model module.
5. **V5** — model `package` lines byte-identical before and after (empty diff).

Then compile. A re-run of the check must report everything compliant (idempotence).
Only after V1–V5 and a clean compile does the orchestrator's verify gate advance the lane
to step 04.

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
