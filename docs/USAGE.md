# refactor-chain — the complete usage guide

Everything you can say, on every OS, with examples. If you only remember one
thing: open your agent and type **`/refactor`** followed by a plain sentence.

- [Quick start](#quick-start)
- [The plain-language contract](#the-plain-language-contract)
- [All 70 commands](#all-70-commands)
  - [The three doors (start here)](#the-three-doors-start-here)
  - [Run control & modes](#run-control--modes)
  - [Pipeline phases (advanced — the doors call these for you)](#pipeline-phases-advanced--the-doors-call-these-for-you)
  - [Code quality & modernization](#code-quality--modernization)
  - [Debugging lane](#debugging-lane)
  - [Backend lane (registry-driven)](#backend-lane-layered-governance-for-any-registry-detected-stack)
  - [Web lane (React / Vue / Svelte / Angular)](#web-lane-react--vue--svelte--angular)
  - [UI lane](#ui-lane)
  - [Conditional guards (fire automatically when relevant)](#conditional-guards-fire-automatically-when-relevant)
  - [Discipline pack (standing contracts)](#discipline-pack-standing-contracts)
- [Worked use cases](#worked-use-cases)
- [OS notes (macOS · Linux · Windows)](#os-notes-macos--linux--windows)
- [The harness CLI (optional, for the curious)](#the-harness-cli-optional-for-the-curious)
- [When something seems off](#when-something-seems-off)

---

## Quick start

```text
/refactor  "Tidy this project up, it grew messy"
/fix       "The login page is broken since yesterday"
/check     "Is this safe to ship?"
```

That's the whole interface. The pipeline detects your language, framework, OS,
and platform; plans in plain words; snapshots before every change; verifies your
app still behaves the same after each step; and asks before anything risky.

Add a mode word if you want to set the pace up front:

```text
/refactor --careful   "…"    # asks one A/B question when unsure, pauses before risky steps
/refactor --autopilot "…"    # proceeds on best guess, asks only before destructive actions
```

## The plain-language contract

Every message tells you: **where you are** (step N of M), **what will and won't
change** ("your app keeps working the same"), and **how to undo** (always one
step away). Failures are calm ("that changed behavior — I undid it and I'm
trying another way, attempt 2 of 3"). Say **"show technical details"** at any
point for the full engineering view.

## All 71 commands

### The three doors (start here)

One plain sentence is enough — the pipeline figures out the rest.

| Command | What it does |
|---|---|
| `/refactor` | Fix or tidy your project — I figure out what's needed and do it safely, one step at a time. |
| `/fix` | Something is broken or slow — find the real cause and fix it, safely. |
| `/check` | Review my changes before shipping — a calm, ranked go/no-go. |
| `/refactor-orchestrate` | The Conductor — run the whole method for a task automatically: a chain-of-skills per step, spec-kit commands per phase, and the multi-pass review loop until dry. |

### Run control & modes

Steer a run that's underway (or choose how much it asks).

| Command | What it does |
|---|---|
| `/refactor-careful` | Switch to careful mode — ask before anything uncertain or risky. |
| `/refactor-autopilot` | Switch to autopilot — proceed on best guess, pause only for destructive actions. |
| `/refactor-status` | Show where we are in the current fix, on one screen. |
| `/refactor-resume` | Pick a paused fix back up where it left off. |
| `/refactor-stop` | Safely park or stop the current fix. |
| `/refactor-undo` | Undo the last step — roll back safely. |

### Pipeline phases (advanced — the doors call these for you)

| Command | What it does |
|---|---|
| `/refactor-understand` | Someone points refactor-chain at a project and you first need to understand 'what is this codebase?' before touching anything — reading m… |
| `/refactor-diagnose` | Turn a refactor-chain request into a concrete, classified plan — it drives the diagnostic harness (diagnose.mjs) to detect the lane/case, O… |
| `/refactor-assessment-map` | Build a map of where the technical debt actually lives before planning a refactor — a dependency/coupling/hotspot map of the current code s… |
| `/refactor-legacy-assess` | Detect the anti-patterns and modernization-readiness gaps that decide which refactor lane and steps make sense — tight coupling, missing/lo… |
| `/refactor-chain` | Run refactor-chain — a self-diagnosing, self-healing 'fix-it' pipeline for a codebase. |
| `/refactor-safety-net` | Right before any refactor touches code, to record a GREEN behavior baseline the whole chain will be judged against. |
| `/refactor-verify` | After every single refactor step and at the final gate to prove the change preserved behavior — re-run the recorded baseline and compare pass-… |
| `/refactor-review-gate` | At the very end of a refactor to run the read-only ship gate — it aggregates the correctness, security, and performance review of the whole ac… |
| `/refactor-board` | Convene the Review Board — a grumpy panel of named engineer personas reviewing a codebase through role-lenses, adversarially verifying every finding, into one ranked go / fix-these-first / no-go ledger. |
| `/refactor-write-up` | At the end of a refactor-chain run to produce the plain-language 'here's what changed' report — a human-readable narrative of what the whole c… |
| `/refactor-artifacts-sync` | At the end of a refactor to bring the project's durable documentation back in sync with the code that just changed — the four standing artifac… |
| `/refactor-audit-trail` | Keep a forensic-grade, tamper-evident record of every change a refactor-chain run made — what changed, when, at which checkpoint, and why —… |
| `/refactor-publish-checklist` | As the final handoff verification right before a refactor is merged or shipped — it confirms every prerequisite is actually satisfied: the rev… |
| `/refactor-ship` | As the deterministic finish of a refactor-chain run — commit the refactor with a clear conventional message, draft a PR summary from the chang… |
| `/refactor-ship-readiness` | A refactor touched a mobile, web, or desktop app that gets published to a store, and you need to catch platform/store-rejection risks bef… |
| `/refactor-improve` | At the very end of a refactor-chain run for the improvement retro — it reads the project's own run history (.refactor-chain/history.jsonl), surface… |

### Code quality & modernization

| Command | What it does |
|---|---|
| `/refactor-code-principles` | Working code needs its structure improved without changing what it does — trigger phrases include 'refactor this', 'clean this up', 'appl… |
| `/refactor-simplify` | For a quality-only simplification pass over changed code — improving reuse, removing dead code, fixing altitude (over/under-abstraction), and… |
| `/refactor-rules` | Refactor-chain needs to know 'what are this project's own rules?' — the structural conventions the code already follows (dependency injec… |
| `/refactor-transform` | Actually APPLY an approved modernization step to the code while proving behavior stays identical — the behavior-preserving transformation a… |
| `/refactor-reimagine` | Someone wants a BOLDER idea for how the code could be structured — not a safe cleanup, but a proposed target architecture or redesign ('w… |
| `/refactor-performance` | Review the refactor's DIFF for code-level performance problems before it ships — reading the changed code (not running a profiler) for algo… |
| `/refactor-security` | The refactor is done and you need a static security audit of the diff before it ships — reading the changed code (not running or attackin… |
| `/refactor-red-team` | Adversarially verify a refactor's core promise — 'behavior was preserved.' It extracts the load-bearing 'this rename/extraction/move kept b… |

### Debugging lane

| Command | What it does |
|---|---|
| `/refactor-whats-wrong` | The user reports a reproducible bug and wants the real cause found and fixed — plain triggers like 'why is this broken', 'it crashes when… |
| `/refactor-web-performance` | A web page or app feels slow to load or janky and the user wants it measured and fixed — plain triggers like 'the page loads slowly', 'it… |
| `/refactor-code-memory` | Memory keeps climbing over time or across repeated actions and the user wants the leak found and fixed — plain triggers like 'the app's m… |

### Backend lane (layered governance for any registry-detected stack)

Nine governance steps, in order.

| Command | What it does |
|---|---|
| `/refactor-backend-01-architecture` | Use this skill when a layered backend project in any registry-detected stack needs to move from a flat pile of modules into a layered module architecture — t |
| `/refactor-backend-02-module-rename` | Use this skill when, after the layered restructure, module names no longer say what modules do and the user asks for semantic renames — trigger phrases inclu |
| `/refactor-backend-03-dao-model` | Use this skill when the data-access layer of a backend service needs tidying — trigger phrases include \'DAO cleanup\', \'DAO layer check\', \'fix the dao pa |
| `/refactor-backend-04-service` | Use this skill when tidying the service layer of a backend project in any registry-detected stack — separating service interfaces from their implementations  |
| `/refactor-backend-05-controller` | Use this skill when organizing the controller layer of a backend web service in any registry-detected stack — splitting controllers into an external-API sub- |
| `/refactor-backend-06-dependency-guard` | Use this skill when checking or repairing layered-architecture dependencies in a backend project in any registry-detected stack — controllers injecting other |
| `/refactor-backend-07-api-naming` | Use this skill when checking or fixing REST API and naming conventions in a backend project — endpoint path structure, HTTP-method usage, class and property  |
| `/refactor-backend-08-common-extract` | Use this skill when extracting shared code out of feature modules into a project's shared common module — utility, cache, constants, enums, exception, and co |
| `/refactor-backend-09-code-optimize` | Use this skill when running a code-quality pass on the service and repository classes of a backend project in any registry-detected stack — hardening string- |

### Web lane (React / Vue / Svelte / Angular)

Five governance steps, in order.

| Command | What it does |
|---|---|
| `/refactor-web-01-structure` | The user asks for a 'project structure check', 'folder structure audit', 'layered architecture review', 'directory cleanup', 'scaffold a… |
| `/refactor-web-02-modules` | The user wants to check or fix feature/module boundaries in a web frontend — trigger phrases like 'module boundaries review', 'split this… |
| `/refactor-web-03-components` | Checking UI components against a design standard or generating standard-compliant components in a web frontend — trigger phrases like 'co… |
| `/refactor-web-04-layout` | The user wants front-end page layout or interaction behavior checked against a consistent standard, or wants a conforming page scaffold g… |
| `/refactor-web-05-naming` | The user wants front-end names checked or repaired — trigger phrases like 'naming check', 'naming review', 'rename this component properl… |

### UI lane

| Command | What it does |
|---|---|
| `/refactor-ui-tokens` | A UI is full of hardcoded colors, spacing, font sizes, radii, or shadows scattered inline and the user wants to 'extract design tokens',… |
| `/refactor-ui-visual` | Improves the visual design of a web UI from first principles — visual hierarchy, spacing systems, typography scale, semantic color roles, and depth/affordance. |
| `/refactor-ui-hierarchy` | UI refactor scoped to visual hierarchy. |
| `/refactor-ui-typography` | UI refactor scoped to typography. |
| `/refactor-ui-color` | UI refactor scoped to color and palette. |
| `/refactor-ui-layout` | UI refactor scoped to layout and spacing. |
| `/refactor-ui-components` | A web UI is full of hand-rolled, bespoke primitives (custom <button> markup, div-based dropdowns, ad-hoc modals, homemade inputs/tabs/dia… |
| `/refactor-ui-mobile` | Refactoring the visual design of a native or cross-platform MOBILE UI — SwiftUI, UIKit, Jetpack Compose, React Native, or Flutter — and t… |
| `/refactor-ui-a11y` | For an accessibility and responsive audit-and-fix of a UI — when the user asks to 'make this accessible', 'fix the contrast', 'add ARIA / role… |

### Conditional guards (fire automatically when relevant)

| Command | What it does |
|---|---|
| `/refactor-data-guard` | A refactor step touches the database — schema, migrations, seeds, fixtures, ORM models, or data-access code. |
| `/refactor-auth-hardening` | ONLY when a project already has authentication code and you want to harden the EXISTING auth to safer patterns — better-auth, Auth0/@auth0, ne… |
| `/refactor-telemetry-plan` | A refactor touches user-facing or tracked flows and could silently break analytics — renamed event names, moved or deleted tracking calls… |

### Discipline pack (standing contracts)

| Command | What it does |
|---|---|
| `/refactor-plan-gate` | Before ANY multi-edit work begins — it requires a short written mini-plan (goal, unknowns, success criteria, step order) and records it into c… |
| `/refactor-adversarial-verify` | Before any refactor-chain step is declared done — it switches from author to attacker and tries to refute the 'this step worked' claim from th… |
| `/refactor-live-truth` | Whenever a claim about the system is about to drive an action — it forbids asserting any system fact from memory, README, docs, comments, or a… |
| `/refactor-scope-fence` | Throughout the do-the-work phase to keep every edit inside the current step's declared scope — the path prefixes in `state.steps[cursor].scope`. |
| `/refactor-ruthless-editor` | Any prose the refactor-chain pipeline emits — the final write-up, shipping artifacts, PR bodies, reports, retro summaries — needs its cut… |
| `/refactor-memory` | A question touches the refactor-chain's per-project persistent memory — what the pipeline remembers about this repo between sessions, whe… |
| `/refactor-guidelines-contract` | As the refactor-chain's standing execution contract against the classic LLM coding pitfalls — it is loaded by the orchestrator at run start an… |
| `/refactor-ci-agent` | Refactor-chain runs in CI — setting up, explaining, or debugging the repo's composite GitHub Action (`action.yml`), which publishes a ref… |

---

## Worked use cases

**"This codebase is a mess but I'm scared to touch it."**
`/refactor --careful "tidy this up"` — it builds a safety net first (deriving
characterization tests if you have none), then refuses to proceed on anything
that changes behavior.

**"Legacy layered service (Spring, .NET, or any registry-backend stack) needs proper structure."**
`/refactor "enforce clean architecture"` on any registry-backend project routes to
the 9-step backend lane: architecture → naming → DAO/model → service → controller
→ dependency rules → API naming → common extraction → quality pass.

**"Our React app's folder structure fights us daily."**
`/refactor "restructure the frontend"` → the 5-step web lane, framework-aware.

**"Make the UI look professional."**
`/refactor "make it look better"` → tokens → visual pass (hierarchy, spacing,
type, color) → components → accessibility gate. Content and behavior untouched.

**"Something got slow last month."**
`/fix "the dashboard is slow"` → debug lane: real cause first
(`/refactor-whats-wrong`), then the fix, then proof.

**"Is this PR safe?"**
`/check` → one calm, ranked report: security + performance + red-team +
correctness + your own conventions, most important first.

**"Modernize this jQuery-era code."**
`/refactor-transform` after `/refactor-reimagine` shows you an advisory target
picture (never auto-applied).

**"Enforce OUR style, not someone else's."**
`/refactor-rules` extracts the conventions your codebase already follows and
turns them into an enforced, documented contract (guidelines gate: 100% pass
or an explicitly recorded exception).

**"Run it in CI on every PR."**
See `/refactor-ci-agent` — report-only readiness reports via the GitHub Action.

**"It stopped mid-run / my session died."**
Just come back: `/refactor-resume`. State survives restarts and compaction.

## OS notes (macOS · Linux · Windows)

The slash commands are identical everywhere. Differences are only in install
and shell syntax:

| | macOS / Linux | Windows |
|---|---|---|
| Install | `curl -fsSL https://raw.githubusercontent.com/ahmedbenaw/refactor-chain/main/install.sh \| sh` | `irm https://raw.githubusercontent.com/ahmedbenaw/refactor-chain/main/install.ps1 \| iex` (PowerShell) |
| Shell prereqs | `sh` + `curl` or `wget` (OS defaults) | PowerShell 5+ (built in) |
| Harness calls | `node "$HOME/.claude/skills/refactor-chain/scripts/orchestrate.mjs" …` | `node "$env:USERPROFILE\.claude\skills\refactor-chain\scripts\orchestrate.mjs" …` |
| Verify commands | POSIX (`make`, `./gradlew`) | PowerShell-safe equivalents are chosen automatically (`gradlew.bat`, `dotnet test`) |
| Line endings / paths | LF, `/` | Detection handles CRLF and `\`; no config needed |

Windows-specific detection (`.sln`, `.ps1`, WPF) routes correctly out of the
box; the wizard (`rcx`) ships native binaries for macOS (Intel + Apple
Silicon), Linux (x64 + arm64), and Windows.

## The harness CLI (optional, for the curious)

The pipeline drives these for you — you never need them, but they're stable and
scriptable. `<project>` is your project folder:

```sh
DIR="$HOME/.claude/skills/refactor-chain/scripts"     # Windows: $env:USERPROFILE\.claude\skills\refactor-chain\scripts
node "$DIR/diagnose.mjs"    classify --target <project> --utterance "<what you want>" --mode careful
node "$DIR/diagnose.mjs"    matrix                     # the full OS/platform detection matrix
node "$DIR/orchestrate.mjs" status   --target <project>
node "$DIR/orchestrate.mjs" doctor                     # environment self-check
node "$DIR/lib/guidelines.mjs" extract --target <project>   # observed-conventions manifest
```

## When something seems off

1. `/refactor-status` — one screen: where you are, safety-net state, next step.
2. Ask for the **doctor check** (or run `orchestrate.mjs doctor`): Node ≥ 18,
   git, path sanity, state integrity, hook registration — plain-language report.
3. `/refactor-undo` — every step has a snapshot; undo is never more than one step.
4. Still stuck? Open an issue: https://github.com/ahmedbenaw/refactor-chain/issues
