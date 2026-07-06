# refactor-assessment-map — full method

Builds the debt map that tells refactor-chain *where* to work. Absorbs the intent
of `modernize-map` (dependency/coupling mapping) and `architecture` (structural
assessment) into one native, read-only, dependency-free step.

## Inputs
- The **Project Profile** from `refactor-understand` (stack, source roots, framework).
- Raw signals: `node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs signals --target <dir>`.
- Optional: git history for churn (`git -C <dir> log --format= --name-only`).

## The three views

### 1. Dependency graph (what imports what)
Parse import/require/use statements per source file → a directed graph of
`module → module` edges. Per node record:
- **fan-in** (afferent, `Ca`): how many modules depend on this one.
- **fan-out** (efferent, `Ce`): how many modules this one depends on.
- **instability** `I = Ce / (Ca + Ce)` (0 = maximally stable, 1 = maximally unstable).

Per-language import parsing (static, best-effort — no execution):
- **JS/TS:** `import ... from '...'`, `require('...')`, dynamic `import('...')`.
  Resolve relative paths; treat bare specifiers as external (exclude from internal graph).
- **Python:** `import x`, `from x import y`; map dotted modules to files.
- **Java:** `import com.pkg.Class;` + package declarations; class → package edges.
- **Go:** `import` blocks; module-path → internal package edges.
- **C#:** `using Namespace;`; namespace → namespace edges.
- Ignore comments/strings; count each edge once per file.

### 2. Coupling assessment (what's tangled)
- **Cycles:** detect strongly-connected components (Tarjan/DFS). Any SCC with >1
  node is a circular dependency — flag it; these block safe extraction.
- **God modules:** high fan-in AND high fan-out (top decile of both) — everything
  routes through them; highest blast radius.
- **Unstable-but-depended-on:** high `Ca` with high `I` — many things depend on
  something that itself keeps changing. Prime refactor target.
- **Package boundaries:** note where layering is violated (e.g. a `controller`
  importing a `repository` directly, skipping the service layer).

### 3. Hotspot ranking (what hurts most)
A hotspot is where complexity and change frequency overlap:
- **Complexity proxy (no run needed):** LOC + max nesting depth + branch/decision
  count (`if`/`for`/`while`/`case`/`&&`/`||`/`?`). Higher = harder to change safely.
- **Churn (if git available):** commits touching the file:
  `git -C <dir> log --format= --name-only | grep -v '^$' | sort | uniq -c | sort -rn`.
- **Hotspot score:** `complexity × churn × (1 + normalized fan-in)`.
- No git → drop churn, use `complexity × (1 + fan-in)` and state the limitation.

## Ranking targets
For each candidate file/module compute:

```
risk = coupling_weight × complexity × blast_radius
  coupling_weight = 1 + cycles_touched + (in_god_module ? 1 : 0)
  blast_radius    = normalized fan-in (how much breaks if this changes)
```

Sort descending. Also surface **quick wins**: low-coupling *leaf* modules
(fan-out low, not in any cycle) — safe warm-ups that build momentum and prove the
verify loop before touching scary code.

## Output contract
Fill `templates/output.md`:
- Top-N files by fan-in (the load-bearing ones).
- All detected cycles (the tangles).
- God modules / layer violations.
- Ranked target table with the metric behind each rank.
- 1–3 quick wins.
Hand the ranked target list to `refactor-diagnose` and the plan phase.

## Boundaries
- **Read-only, advisory-only.** Never edits, never runs, never installs. Static
  parsing + file stats + (optional, read-only) git log.
- Exclude generated/vendored trees: `node_modules`, `dist`, `build`, `target`,
  `vendor`, `Pods`, `.git`.
- Every ranking claim must trace to a counted metric (fan-in, LOC, churn). If a
  parser can't resolve a file, record it as "unparsed" rather than guessing edges.
- Large repos: bound the walk depth and report coverage ("mapped 412 of ~430
  source files") so the user knows the map isn't total.
