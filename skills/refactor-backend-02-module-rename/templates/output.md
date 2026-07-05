# Semantic Module Rename — plan & report scaffold

Part A is presented BEFORE any change (confirmation gate); Part B after.

---

## Part A — Rename plan (requires user approval)

**Project:** `{root artifactId}` · **Mapping source:** {project convention | example convention}

### Rename table (execution order = row order)

| # | Old module | New module | Container | Why this order |
|---|---|---|---|---|
| 1 | `{old}` | `{new}` | `{container}` | {depended-upon first / longest-match-first} |

### Skips (idempotence)

| Module | Reason |
|---|---|
| `{name}` | already renamed — no action |

### Exclusions (identity untouched; references still updated)

| Module | Reason |
|---|---|
| `{module}-server-{platform}` | deployment adapter |

### Propagation surfaces to be touched

- [ ] directories · [ ] own `artifactId` · [ ] container `<modules>`
- [ ] root `dependencyManagement` · [ ] project-wide `<dependency>` refs
- [ ] `package`/`import` lines + physical source moves
- Config check: {mapper-location-style paths found: list | none}; registered service name: LEFT UNCHANGED

> Reply "go" to execute. Nothing changes until you approve.

---

## Part B — Completion report

**Result:** {SUCCESS | PARTIAL}

### Executed

| Pair | Directory | artifactId | Container list | Root DM | Dep refs updated | Packages moved |
|---|---|---|---|---|---|---|
| `{old}`→`{new}` | done | done | done | done | {n} POMs | {n} files |

### Verification

- [ ] V5 zero old artifactId residue (`**/pom.xml` grep empty)
- [ ] V7 zero old package residue outside exclusions (`**/*.java` grep)
- [ ] package == path in renamed modules
- [ ] compile passes (0 errors)
- [ ] re-run would skip everything (idempotent state reached)
- [ ] Harness gate advanced (`orchestrate.mjs advance`)

### Notes / follow-ups

- {item or "none"}
