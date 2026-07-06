# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.6.2] — 2026-07

### Fixed — the primary installer produced a BROKEN install (scripts never landed)
Testing the installer end-to-end (not just `--dry-run`) surfaced a real ship-blocker: a fresh
`curl | sh install.sh` copied all 57 skills and registered all 6 hooks, but **installed zero
harness scripts** — so every hook pointed at a `boot.mjs`/`orchestrate.mjs` that wasn't there.
- **Root cause:** in `install_claude` the scripts dir was created, then the skills loop
  `rm -rf`'d `skills/refactor-chain` (the orchestrator skill, which has no `scripts/`) and
  re-copied it — wiping the scripts dir — and the subsequent `cp … scripts/` silently failed
  because `cp` won't create a missing destination dir. Same defect in `install.ps1`
  (`Remove-Item` wipe). Fixed by copying skills FIRST, then creating + filling `scripts/`.
  The Node (`rcx.mjs`) and Go (`main.go`) installers were unaffected — their copy helpers
  recreate the destination dir — but `rcx.mjs` was reordered to match for clarity.
- **Prevention:** CI now has an **installer smoke test** — it installs into a temp HOME and
  asserts `orchestrate.mjs` + `board.mjs` are present and every registered hook resolves to a
  real file. This class of bug can no longer ship.

## [4.6.1] — 2026-07

### Fixed — CI (v4.6.0 published with a red `ci` lint step)
The 4.6.0 gate was run as tests + audit + doctor, but **not eslint** — which CI runs. Three
`no-unused-vars` errors in the new board code turned the `ci` workflow red on `main` even though
the functional code and the whole test suite were green. Fixed the unused `selectLenses`
parameter (`_diagnosis`) and two unused imports in `tests/board.test.mjs`. This release was
validated by running **every CI step locally** (syntax-check, tests, audit `--provenance-strict`,
eslint, shellcheck, JSON validation) — not a subset. No functional change.

## [4.6.0] — 2026-07

### Added — the Review Board (`/refactor-board`)

A native, portable multi-agent review capability. A deterministic Node conductor selects role-lenses (architecture, harness, correctness, security, docs-truth) from detection, binds each to a named engineer persona whose zero-BS profile is an **enforced rubric** (file:line or it doesn't count; CONFIRMED vs SUSPECTED; over-flagging penalized), and emits the reviewer prompts **as data** so the identical reviewer runs on Claude Code / Cowork / Codex. Each lens is a Lead (finder) + a Coordinator (adversarial verifier) — a finding survives only if it can't be refuted. The host dispatches the prompts as real subagents; the harness records the round (`board-plan` / `board-record` / `board-aggregate` / `board-status`) in `.refactor-chain/board.json`, resumable across compaction.

- `scripts/lib/board.mjs` (conductor), `scripts/lib/personas.mjs` (roster + mandatory rubric), `scripts/lib/panel-aggregate.mjs` (dedupe/rank/decide **extracted from the review gate and shared**, so the two never drift).
- `skills/refactor-board/` + `commands/refactor-board.md`.
- Composes the existing discipline pack (adversarial-verify is the Coordinator mechanism; the guidelines gate still governs any fix a board run proposes) — no reinvention.

### Fixed — the board's own dogfood found these in the new board code
Convened over itself, the board raised nine real defects in its own ~600 lines; each is fixed with a regression that fails without the fix.
- **`applyVerdict` didn't trim the verdict** → a whitespace-padded `" REFUTED "` (routine in LLM JSON) survived instead of being dropped, defeating the "REFUTED is dropped" promise.
- **Verdict index matched with strict `===`** → a string index `"0"` missed the finding and leaked a refuted item; now `Number`-coerced.
- **Coordinator identity was list-position-derived** → passing a `--lenses` subset to `verify-prompt` silently reassigned the adversary; now bound to the lens's global index (subset-invariant).
- **`aggregateLensResults` crashed on a null element**; **`readBoard` had an unguarded `JSON.parse`** (the same crash class fixed in 4.5.0, missed on the new reader); **dedupe truncated the cause at 80 chars** and didn't trim `where`; round increment could go `NaN` on a hand-edited file; `board-record` could hang on an interactive TTY. All guarded.

### Fixed — docs
- Skill/command counts corrected everywhere (`56 → 57`, `69 → 70`) across README, USAGE (link + header + command table), and both manifests; `/refactor-board` added to the USAGE command list.

Full gate green: 9 suites / 472 assertions, audit clean, doctor ok.

## [4.5.0] — 2026-07

A grumpy, zero-BS multi-auditor sweep of the whole tree. Several enforcement
gates shipped in 4.4.0 turned out to be bypassable; they are now real stops,
each with a regression test that fails without the fix. No claim here that a
green suite didn't already cover.

### Fixed — harness enforcement holes (all were live-reproducible)
- **Guidelines gate was bypassable (TOCTOU).** `advance` trusted the cached `state.guidelines` verdict, so a hand-written `{gate:"PASS"}` — or a clean `gate-check` followed by an edit — sailed through. `advance` now re-runs `guidelines.mjs eval` **fresh** at the moment it gates a review-gate step; a stale or forged verdict cannot pass.
- **Retry ceiling was decorative.** A step blocked by exhausted retries could still be advanced to `done`, and `heal` reactivated it past the cap — an unbounded `blocked → heal → fail` loop. `advance` now refuses a `blocked` step, and `heal` refuses once the budget (3) is spent. The bound holds at both ends.
- **`advance` delta guard was a denylist.** Only the literal `--delta drift` was refused; `advance --adversarial` with no delta advanced as "clean". It is now an allowlist — only an explicit `--delta legal` advances.
- **`init --lane debug` built a phantom skill** (`refactor-refactor-debug`, double-prefixed). Forced debug now resolves to a real subtype (`refactor-whats-wrong` by default).

### Fixed — crashes and drift
- **`guidelines.mjs eval`** crashed on a non-array `guideline-exceptions.json` (`.includes` on an object) and wedged the gate; it now coerces to an empty exception set.
- **`audit.mjs`** crashed the entire self-audit on a missing/invalid `plugin.json`; it now emits a `plugin-manifest` finding and continues.
- **Windows installers** (`rcx.mjs`, `installer/go/main.go`, `install.ps1`, `install.sh`) wrote hook commands with OS-native backslashes and an unquoted interpreter path — duplicate hooks, broken uninstall, and the space-veto bug when Node lives under `C:\Program Files\`. Commands are now forward-slash-normalized and both interpreter and script path are quoted, matching `hooks.json`. Removal filters are separator-agnostic so legacy entries are still cleaned.
- **`opt()`** dropped a meaningful empty-string argument (`--note ""`) to its default; it now respects argument position.

### Fixed — version rot and false claims
- `plugin.json` description said "v3" and carried a stale `java` keyword; `hooks.json` said "v2 hooks"; `SECURITY.md` claimed v3.x as current; `installer/INSTALL-SPEC.md` said "5 hooks"; the CHANGELOG was missing every 4.x link anchor and its `[3.0.0]` anchor pointed at a bogus compare range. All corrected.
- The three debug-lane skills told the user "step 2 of 5/6" while the debug lane is two steps (fix → review gate); reworded to the truthful "step 1 of 2".
- **`docs/SKILL-TEMPLATE.md`** still called itself "v2" and predated the discipline pack, the guidelines gate, the `kind:"gate"` convention, and the backend-lane rename; rewritten against current reality with a dead-names table.
- `curl`/`curl-scripts` registry entries double-registered `.hurl`; `.hurl` now belongs to `curl` alone.

### Housekeeping
- Harness pipeline-phase comment corrected to the phases that actually exist (`baseline → lane → gate → docs`); the `usage` string now lists `decision`, `gate-check`, and `flag-drift`.
- Regression tests added for every enforcement hole above (orchestrate suite: 31 → 39 assertions). Full gate green: 6 suites / 379 assertions, audit clean over 419 files.

## [4.4.0] — 2026-07

### Added — the guidelines gate is now HARNESS-ENFORCED (was documented-only)
- **`orchestrate.mjs gate-check`** runs `guidelines.mjs eval`, records the verdict in `state.guidelines`, and **`advance` now refuses to leave the review gate** until the verdict is PASS (100%) or every failing check is a recorded exception. Previously the "100% mandatory" gate lived only in review-gate prose that nothing executed — an adversarial audit caught it. Now a wired stop, e2e-proven with a shipped regression test.
- **`orchestrate.mjs decision`** records a mid-run checkpoint choice into `state.decisions` so decisions are auditable in the write-up. (The *asking* remains agent behavior — a script cannot render a question — now stated honestly rather than claimed as a mechanism.)

### Fixed
- **Provenance:** two distinctive source phrasings survived a prior cleanup and were lifted verbatim into skill descriptions ("Adjacent problems get FLAGGED … never silently fixed"; "author to attacker") — both reworded to original expression.
- **Docs:** softened "100% original content" to "independently reauthored" — an honest claim, since the unlicensed upstream repos are not retained and zero-copy cannot be proven by diff.

## [4.3.2] — 2026-07

### Fixed (multi-agent Lattner review: 6 dimensions vs. source repos)
- **Harness crash (HIGH):** `orchestrate.mjs fail` and `heal` dereferenced `state.steps[cursor]` without a guard — a `fail`/`heal` fired once the chain reached the `docs` phase threw an uncaught TypeError instead of returning structured JSON. Both now bail cleanly with exit 2. Regression-tested.
- **Advance correctness (MED):** `advance` incremented the cursor unbounded past end-of-chain; and its baseline/drift/adversarial gate blocks exited 0 (a CI wrapper keying on exit status would read a refused drift-advance as success). Cursor is now bounded and all gate blocks exit 2, matching plan-gate.
- **Stubbed example (HIGH):** `refactor-web-05-naming/examples/before-after.md` was a 57-byte truncated stub — authored the real end-to-end rename example. A new `stub-resource` audit gate now fails on any suspiciously tiny resource file (existence ≠ substance).
- **Command YAML (MED):** `refactor-publish-checklist.md`'s description was an unquoted, truncated scalar with a bare `: ` that a strict YAML parser could corrupt — quoted and completed. The frontmatter audit gate now covers `commands/`, not just skills.
- **Fidelity restores** (dropped source mechanisms): adversarial-verify regained the "attack the requirements/spec as a hostile lawyer" angle; ruthless-editor regained the "<20% cut = timid, run again" trigger; plan-gate regained the crisp 7-step decomposition threshold.
- **Cosmetic:** rcx.mjs "5 hooks"→"6 hooks" comment; deduped a risk-guard comment; `read -r` in publish.sh.

## [4.3.1] — 2026-07

### Fixed (Lattner-style discipline-pack review vs. source skills)
- **Provenance:** reworded a phrase in `refactor-ruthless-editor` that matched the source skill's signature title verbatim — removes a lifted signature phrase (original expression restored).
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

[4.6.2]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.6.2
[4.6.1]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.6.1
[4.6.0]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.6.0
[4.5.0]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.5.0
[4.4.0]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.4.0
[4.3.2]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.3.2
[4.3.1]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.3.1
[4.3.0]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.3.0
[4.2.2]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.2.2
[4.2.1]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.2.1
[4.2.0]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.2.0
[4.1.0]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.1.0
[4.0.0]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v4.0.0
[3.0.0]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v3.0.0
[2.0.0]: https://github.com/ahmedbenaw/refactor-chain/releases/tag/v2.0.0
