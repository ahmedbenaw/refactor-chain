# refactor-chain v4.0.0 — Generic to the Core

v4 finishes what v3 started: nothing in the pipeline is named or scoped to a single language anymore.

**Breaking renames:** `refactor-java-*`/`refactor-jvm-*` → **`refactor-backend-01…09`** (registry-driven layered-backend lane — Java, Kotlin, Scala, C# today; any stack by a one-line registry data edit) · `refactor-code-solid` → **`refactor-code-principles`** (26-principle catalog, harness-recommended per stack).


The pipeline you know — one door (`/refactor`, `/fix`, `/check`), plain language, behavior-preserving — rebuilt on fully original content and a much bigger engine. Every command from v2 still works identically.

## Highlights

### 100% original content
Every governance lane (Java, Web, UI, code) has been independently reauthored from industry-standard practice. The backend lane now applies to **any** registry-backend stack and the Web lane to any React/Vue/Svelte/Angular project — no org-specific rules anywhere. Repository history was rebuilt clean for this release.

### Universal language registry
40+ languages classified by family → language → variants → frameworks (JS/TS ecosystem, JVM, BEAM, systems C/C++/Rust/Zig/Ada, .NET, Apple/mobile, scripting, functional/logic, legacy COBOL/Fortran, data/infra SQL/Nix/Go — and extensible by data edit, not code). Detection, lane routing, platform (including **embedded**), and test-framework baselines all come from the registry.

### Principle-driven structural engine
`refactor-code-principles` is now a catalog: SOLID plus GRASP, DRY/KISS/YAGNI, Law of Demeter, CQS, Clean/Hexagonal layering, CUPID, functional core/imperative shell, OTP supervision, RAII/ownership, Design by Contract, MISRA-style embedded discipline, DDD, 12-Factor and more — agnostic principles always on, family-mapped ones recommended per detected stack, and **you choose** (accept, mix, or apply an unusual combination deliberately) at a mid-run decision checkpoint.

### Guidelines gate (default mandatory)
A new extract → audit → conform engine infers your codebase's observed guidelines, scores them against a top-1% baseline, fixes gaps through the normal checkpoint→apply→verify loop, and the chain cannot complete below **100% PASS** (or an explicitly recorded exception).

### Discipline pack (8 new skills)
`refactor-plan-gate`, `refactor-adversarial-verify`, `refactor-live-truth`, `refactor-scope-fence`, `refactor-ruthless-editor`, `refactor-memory`, `refactor-guidelines-contract`, `refactor-ci-agent` — plan-before-edit, self-refutation verification, live-state truth, scope fencing, prose cutting, per-project memory, standing LLM guardrails, and CI operation.

### Production hardening
- **6 hooks** (new: SessionEnd memory capture) — all dormant-fast-path, never-throw, never-approve.
- **GitHub Action** (`uses: ahmedbenaw/refactor-chain@v4`) — deterministic readiness/review reports, opt-in agent mode; report-only, never merges.
- **First-class test suite** (`node tests/run-all.mjs`) + `scripts/audit.mjs` + `orchestrate.mjs doctor` + CI quality gates.
- **spec-kit interop** (integrate or adopt, chosen per case) and mid-session decision checkpoints as native behavior.
- ARCHITECTURE / STATE-SCHEMA / SECURITY docs, Keep-a-Changelog.

## Compatibility
- All 61 v2 commands unchanged; 8 new discipline commands added (69 total, 56 skills).
- `state.json` stays schema v3; all changes additive.
- Routing fix: generic Java/web projects now receive truly generic lane guidance.

### Complete usage guide
Every command, worked use cases, and per-OS notes: [docs/USAGE.md](https://github.com/ahmedbenaw/refactor-chain/blob/main/docs/USAGE.md). The harness natively recommends design principles per detected stack and speaks up when it finds a spec-kit project or an embedded target.

## Install
```sh
curl -fsSL https://raw.githubusercontent.com/ahmedbenaw/refactor-chain/main/install.sh | sh
```

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
