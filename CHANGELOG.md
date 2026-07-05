# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.3.1] — 2026-07

### Fixed (Lattner-style discipline-pack review vs. source skills)
- **Provenance:** reworded a phrase in `refactor-ruthless-editor` that matched the source skill's signature title verbatim — restores the clean-room "expression original" guarantee.
- **Fidelity — plan-gate:** restored the fifth plan field, **out of scope**, dropped in the rewrite. It is the boundary `refactor-scope-fence` enforces — its absence weakened the plan-gate↔scope-fence handshake.
- **Fidelity — live-truth:** added the source's **cheapest-sufficient-check / no-ceremony** principle (verify at the lowest sufficient level; don't re-probe what the open file already shows), preventing over-verification.

## [4.3.0] — 2026-07

### Added — discipline pack is now harness-ENFORCED (not just documented contracts)
- **plan-gate blocks baseline:** `orchestrate.mjs baseline` refuses to run until a mini-plan is recorded (`init --plan-note` or `baseline --plan-note`). No safety net without a written plan.
- **adversarial-verify gates advance:** `orchestrate.mjs advance` refuses `--delta legal` without `--adversarial` — a step's "it worked" claim cannot be recorded until it survived the attack pass.
- **scope-fence hard-flags drift into state:** `guard.mjs` now persists every out-of-scope edit to `state.notes` (via the new `orchestrate.mjs flag-drift` subcommand), so drift is durably visible to the write-up and the improvement retro.
- **spec-kit × discipline-pack matrix:** the interop reference now specifies every discipline skill's behavior across all three modes (Integrate / Co-author / Adopt), with the behavior-preservation baseline as the non-negotiable floor in every mode.

## [4.2.2] — 2026-07

### Fixed
- **Residual "java" lane label after the backend rename.** The backend-lane checklist scripts still *emitted* `lane: "java"` (a functional bug in their JSON output), and "java" survived as a lane label in the README/ARCHITECTURE lane lists (a duplicate bullet), diagnose examples/method/output, plan-gate, review-gate, and security. All corrected to the canonical lane set (**backend / web / ui / code / debug**); a new `stale-lane` audit gate prevents recurrence. (The Java *language* — registry id, keyword, fixtures — is unchanged; only the renamed *lane* label was stale.)

### Added
- ARCHITECTURE now documents the concurrency model: async at the edges (event-driven hooks, resumable state, parallel subagent orchestration, independent-unit fan-out), ordered at the core (the verify-gated step chain).

## [4.2.1] — 2026-07

### Added
- Local-only working-notes convention: files matching `*.local.md` are gitignored and skipped by the audit, so contributors can keep local notes/ledgers in the tree without shipping or failing the audit.

## [4.2.0] — 2026-07

### Added
- **Automation recommendations** — `claude-automation-recommender` is now genuinely adopted into `refactor-improve`: at retro time, mechanizable recurring patterns surface as concrete standing-automation recommendations (git hook / CI check / formatter-linter config / script), recommendation-only, human-approved.
- Audit gate `stale-action-version` — flags any `refactor-chain@vN` reference that doesn't match the current major, so the `@v3`-after-a-v4-bump class of miss can't ship again.

### Fixed
- Grammar: "a improvement retro" → "an improvement retro" (fallout from the kaizen rename).
- Stale "jvm lane" prose in the diagnose matrix, reasoning-protocol example, and a plan-gate example → "backend lane" (fallout from the generic-backend rename).

## [4.1.0] — 2026-07

### Added
- **spec-kit Mode 2 — Co-author:** the spec-kit interop is now three modes (Integrate / Co-author / Adopt), selectable per run at the mid-chat decision checkpoint. Co-author treats the spec as a living document: spec-vs-code conflicts become real three-way decisions (fix code / amend spec / record divergence), adversarial-verify attacks both directions, and approved spec amendments sync back into `.specify/`.
- Prominent author line at the top of the README.

### Fixed
- GitHub Action usage examples referenced `@v3` after the v4 bump — corrected to `@v4` across README, ARCHITECTURE, release notes, and the verify reference. Published a moving `v4` major tag so `@v4` resolves.

## [4.0.0] — 2026-07

Breaking renames per our own semver policy (a command rename is MAJOR):

### Changed (BREAKING)
- **Generic backend lane:** `refactor-java-01…09` → `refactor-jvm-*` → **`refactor-backend-01…09`**, lane id **`backend`**. Generic in name AND function: lane membership is registry-driven (`lane: "backend"` in `scripts/lib/languages.mjs` — Java, Kotlin, Scala, C# today; extending it is a data edit), all nine skills reframed language-agnostic, each method gaining a cross-stack mapping table (Spring / .NET / Go / Python / Ruby / PHP / Rust). Concepts absent in a stack report N/A, never forced.
- **Principles engine:** `refactor-code-solid` → **`refactor-code-principles`** — SOLID is one catalog entry of 26; recommendations harness-native per stack.
- **Terminology:** "kaizen" → plain language (improvement retro / improvement loop / history prior).

## [3.0.0] — 2026-07 *(superseded same-day by 4.0.0; the renames above landed after the v3 cut)*

### Changed
- **Engine rename:** `refactor-code-solid` → **`refactor-code-principles`** — the principle-driven structural engine (SOLID is one entry in a 26-principle catalog). Same behavior-preservation contract; every lane's final step updated.
- **Terminology:** "kaizen" nativized to plain language throughout — improvement retro, improvement loop, history prior.
- **Lane rename:** the Java governance lane is now the **JVM lane** — `refactor-java-01…09` → `refactor-backend-01…09`, lane id `java` → `jvm`. Same nine skills, same order, generic governance for any Maven/Gradle/JVM project. (Deliberate breaking rename decided at release; the `java` *language* id is unchanged.)

### Added
- Language registry: Delphi/Object Pascal/Pascal Script and curl/HTTP-script collections (registry now covers the full 41-language plan list; case-insensitive variant coverage test).
- Harness-native principle recommendations: `diagnose classify` emits `{agnostic, stackMapped}` from the principles registry; persisted in `state.diagnosis` for the plan-phase decision window (`tests/principles.test.mjs`, 57 checks).
- Native spec-kit backing: `.specify/` detection (dot-dir walk fix), `conditional.specKit`, a plain-language Integrate-vs-Adopt note in classify, and the interop contract in `docs/ARCHITECTURE.md`.
- `docs/USAGE.md` — the complete usage guide: all 69 commands, worked use cases, macOS/Linux/Windows notes.
- Repo linting: `.editorconfig` + dependency-free `eslint.config.js` (core rules) with a CI lint gate.
- Preservation regression suite (`tests/preservation.test.mjs`, 142 frozen-inventory checks) and an installer↔manifest hook-parity audit check.
- `orchestrate init --plan-note` records the plan-gate mini-plan into state.

- **Universal language taxonomy** — registry-driven detection for 40+
  languages (JS/TS, Java, Kotlin, Scala, C, C++, C#, Go, Rust, Zig, Python,
  Ruby, PHP, Perl, Lua, Swift, Objective-C, Dart, Erlang, Elixir, Haskell,
  OCaml, Lisp, Prolog, Ada/SPARK, COBOL, Fortran, R, MATLAB, SQL, Nix,
  WebAssembly, shell, and more). Adding a language is a data edit, not a code
  change; each entry carries detection markers, test-framework candidates,
  lane routing, and platform hints.
- **Principles registry + plan-time decision window** — an agnostic baseline
  plus family-mapped engineering principles, recommended per detected stack;
  the user accepts, mixes, or deliberately overrides with risks stated
  plainly and the decision recorded.
- **Guidelines engine + conformance gate** — extract a codebase's observed
  conventions, audit them against a top-1% baseline, and require 100% PASS at
  the review gate (explicit, recorded user exceptions are the only bypass).
- **Per-project memory + 6th hook** — a SessionEnd hook captures durable
  facts (run position, retro outcome, flagged scope drift) into
  `.refactor-chain/memory/sessions.jsonl`; SessionStart replays a one-line
  recall. Never transcripts, never secrets.
- **`doctor` subcommand** — environment self-check: Node version, git
  availability, space-free harness path, state integrity, hook registration.
- **Discipline skills** — plan-gate, adversarial-verify, live-truth,
  scope-fence, ruthless-editor, memory, guidelines-contract, and ci-agent.
- **GitHub Action** — a composite, report-only refactor-readiness action
  (`uses: ahmedbenaw/refactor-chain@v4`): deterministic analysis by default,
  opt-in agent mode via the caller's own agent CLI, optional PR comment.
- **Tests, audit, and CI** — a `tests/` suite (`tests/run-all.mjs`), a
  repo-wide audit script (`scripts/audit.mjs`), and a CI workflow that runs
  them on every push and pull request.

### Changed

- Governance lanes reauthored as **generic, industry-standard, and
  framework-adaptive** guidance rather than any single organization's
  conventions.
- **Gradle projects now route to the JVM lane** (Android apps still route to
  the mobile UI lane).
- Detection is now **registry-driven** end to end: lanes, platforms, and test
  frameworks resolve through the language registry instead of hard-coded
  checks.

### Removed

- All third-party-derived content, replaced by original equivalents authored
  for this project.
- Organization-specific rulesets.

### Fixed

- Generic projects no longer receive organization-specific guidance.

## [2.0.0] — 2026-06

Initial public release.

### Added

- The end-to-end pipeline: understand → diagnose → plan → baseline →
  do-the-work → secure/review → docs → ship → improve, with a deterministic,
  resumable, self-healing state machine.
- **48 skills** across five lanes (Java governance, web structure, UI/visual,
  generic structural, and debug) and **61 plain-language commands**.
- **5 hooks** (SessionStart resume, UserPromptSubmit intake, PreToolUse
  risk-guard, PostToolUse self-heal guard, Stop ship-gate), all dormant
  unless a chain is active in the project.
- **3-layer installer** — POSIX shell / PowerShell wizard, a Node wizard
  (`rcx.mjs`), and a self-contained Go binary — covering Claude Code, Claude
  Cowork, Codex, and eleven editors, with backups, verification, and
  self-troubleshooting.
- **5-platform binaries** published on the Releases page.

[3.0.0]: https://github.com/ahmedbenaw/refactor-chain/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v2.0.0
