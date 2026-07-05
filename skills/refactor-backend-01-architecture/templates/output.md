# Layered Architecture Restructure — plan & report scaffold

Fill every placeholder. Part A is presented BEFORE any change (confirmation
gate); Part B is emitted after execution.

---

## Part A — Move plan (requires user approval)

**Project:** `{root artifactId}` · **Build:** {Maven|Gradle} · **Modules found:** {N}
**Backup reminder given:** {yes} · **Git state:** {clean|dirty — warned}

### Module inventory

| Module | Packaging | Current path | Signal | Target container | Note |
|---|---|---|---|---|---|
| `{artifactId}` | jar | `{path}` | `{name pattern / dependency evidence}` | `{container path}` | {— \| NEEDS-DECISION \| absorbed into {domain}} |

### Tiny-domain absorptions

| Candidate domain | Leaves | Host domain | Justification |
|---|---|---|---|
| `{name}` | {n} | `{host}` | {sole coupling to host / not independently deployed} |

### New aggregator build files to create

| Path | Role |
|---|---|
| `{container}/pom.xml` | {platform \| domain \| composition \| delivery} aggregator (`packaging=pom`) |

### Root build changes

- Parent/BOM strategy: {framework parent `x.y.z` | BOM-only}
- BOM imports: {list}
- Internal modules managed at: `${{version-property}}`
- Third-party versions carried into dependencyManagement: {list or "none"}

> Reply "go" to execute, or flag any row to adjust. Nothing moves until you approve.

---

## Part B — Completion report

**Result:** {SUCCESS | PARTIAL — see follow-ups}

### Executed

- Modules moved: {n} · Aggregators created: {n} · Old directories removed: {n}/{n}
- Leaf `<version>` tags stripped (now root-managed): {n}

### Compile-verify-fix loop

| Round | Scope | Errors | Category | Fix |
|---|---|---|---|---|
| {1} | {full \| module} | {n} | {missing in-house / framework / third-party / renamed artifact} | {what was added/changed} |

### Dependency baseline diff

| Module | Lost | Added | Verdict |
|---|---|---|---|
| `{module}` | {none} | {list} | {OK \| REVIEW} |

### Verification

- [ ] Aggregator `<modules>` match directories on disk
- [ ] No stale `artifactId` references (global search clean)
- [ ] Full compile: 0 errors
- [ ] `package -DskipTests`: success
- [ ] Application start check: {passed | skipped — no infrastructure}
- [ ] Harness gate advanced (`orchestrate.mjs advance`)

### Follow-ups

- {open item or "none"}
