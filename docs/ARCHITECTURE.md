# Architecture

This document is for contributors. It explains how refactor-chain is put
together: the pipeline, the lanes, the deterministic harness, the state
machine, the hook contracts, and the learning loop. If you want the state
file's exact shape, see [STATE-SCHEMA.md](./STATE-SCHEMA.md).

## The 9-phase pipeline

Every run, regardless of lane, moves through the same nine phases:

`understand → diagnose → plan → baseline → do-the-work → secure/review → docs → ship → improve`

The first three phases are cheap and read-only: understand what the repo is,
classify what it needs, and agree a plan. Nothing is edited before a green
baseline is recorded. The middle phases do the actual work under verification.
The last three make the work shippable, explain it, and feed what was learned
back into the next run.

## The 5 lanes

The diagnostic engine routes each job to exactly one lane:

- **backend** — nine ordered, registry-driven layered-governance steps (architecture,
  module-rename, dao-model, service, controller, dependency-guard, api-naming,
  common-extract, code-optimize). Membership is a registry data edit (`lane: "backend"`
  — Java/Kotlin/Scala/C# today); Android apps stay in the mobile UI lane.
- **web** — five ordered steps for front-end projects (structure, modules,
  components, layout, naming).
- **ui** — visual improvement (tokens, visual, components, a11y; the mobile
  variant swaps in a mobile step). Chosen when the repo or the user's words
  point at how things *look*.
- **code** — the repo-agnostic structural lane. `refactor-code-principles` is also
  appended to the end of every non-debug lane as the consolidating pass.
- **debug** — the `/fix` lane. The only lane where changing behavior is the
  goal; it runs its own fix→verify chain and skips the code-principles pass.

Lane selection is a weighted vote: repo evidence (manifests, frameworks,
mobile markers, registry-detected languages) plus intent parsed from the
user's utterance, with the user's words weighted highest. The vote produces a
confidence score — top score divided by top-plus-second — with two hard
numbers behind it: **CONF_MIN = 0.70** (below this in careful/ask mode with a
viable runner-up, the engine asks a plain-language A/B clarifying question
rather than guessing) and **FLOOR = 0.35** (below this with an utterance
present, the job is declared out of scope and redirected). Monorepos cap
confidence at 0.55 because competing subtrees make any single answer suspect.

## The harness trio

Three zero-dependency Node scripts do all deterministic work. They never call
a model and never shell out with string interpolation (all git calls use
`execFileSync` argument arrays).

- **`scripts/orchestrate.mjs`** — the state machine. Subcommands: `detect`,
  `init`, `status`, `baseline`, `checkpoint`, `advance`, `fail`, `heal`,
  `record-edit`, `reset`, and `doctor` (environment self-check: Node ≥ 18,
  git present, space-free harness path, state integrity, hook registration).
- **`scripts/diagnose.mjs`** — the diagnostic engine. Read-and-classify only;
  it never edits. Subcommands: `classify`, `signals`, `scope`, `matrix`, and
  `learn` (appends a validated retro to `history.jsonl`). It is the *single
  source of detection* — `orchestrate init` calls it rather than duplicating
  logic. Beyond routing, `classify` natively emits the downstream decisions'
  inputs: `principles` ({agnostic, stackMapped} from the principles registry,
  feeding the plan-phase decision window), `conditional.specKit` plus a
  plain-language interop note, and the embedded host-runnable-tests note —
  all persisted into `state.diagnosis` by `init`.
- **`scripts/lib/signals.mjs`** — shared evidence collection: a bounded,
  depth-limited walk of the target that surfaces manifests, frameworks,
  mobile/desktop/embedded markers, test evidence, monorepo shape, and more.

Behind them sit **three data registries**, so extending the system is a data
edit, not a code edit:

- **`scripts/lib/languages.mjs`** — the universal language taxonomy. 40+
  languages classified by family (systems, jvm, beam, js, dotnet, apple,
  scripting, functional, logic, legacy, data, infra, sci), each with detection
  markers, test-framework candidates, default lane, and platform hint. Known
  extension collisions (`.m`, `.pl`) are disambiguated by sibling signals.
- **`scripts/lib/principles.mjs`** — the software-engineering principles
  registry: an agnostic baseline (SOLID, GRASP, DRY/KISS/YAGNI, layering, …)
  plus family-mapped principles (OTP supervision for BEAM, RAII/ownership for
  systems languages, Design by Contract for Ada, and so on), each with a
  plain-language pitch and stated risks when applied off-family.
- **`scripts/lib/guidelines.mjs`** — the guidelines engine: `extract` infers
  the codebase's observed conventions into `guidelines.json`, `audit` scores
  them against a top-1% baseline, and `eval` produces the conformance
  checklist the review gate requires at 100% PASS.

## Concurrency model — what's async, what's deliberately sequential

refactor-chain is **event-driven and async where it is safe to be, and strictly
ordered where correctness demands it.** The two are not in tension — each is a
deliberate choice.

**Async / non-blocking:**
- **Hooks** are event-driven — the six hooks fire on session/prompt/tool/stop/end
  events, never block the caller, and take a dormant fast-path (exit 0, no work)
  unless a chain is active. They run independently of the pipeline's control flow.
- **Resumable state** — a run is a persistent state machine on disk, so it survives
  across turns, context compaction, and process restarts. Work is picked up
  asynchronously later exactly where it paused; nothing has to complete in one shot.
- **Parallel orchestration** — the orchestrator may fan out **independent subagents
  concurrently** (e.g. the review gate runs security / performance / red-team in
  parallel; discovery and analysis stages parallelize).
- **Intra-step fan-out** — within a single step, independent, non-overlapping units
  may be applied concurrently (`SKILL.md` §6.3).

**Deliberately sequential (the safety core):**
- The **lane's ordered steps are a hard chain: step N+1 never starts before step N
  verifies.** This is the behavior-preservation contract, not a performance
  limitation — you cannot prove a change preserved behavior if the next change lands
  before the previous one is checkpointed and verified. The verify gate between steps
  is what makes "self-healing" possible (a drift is caught and rolled back at its own
  step, not tangled with later work).

So: *async at the edges* (hooks, state, orchestration, independent units), *ordered
at the core* (the verify-gated step chain). "Async chain-of-skills" describes the
orchestration and event model — it never means the safety gates are skipped or the
dependent steps race.

## The state machine

State lives in `<project>/.refactor-chain/state.json` and survives turns,
compaction, and restarts. The run-time phase field is narrower than the
9-phase narrative — it tracks only what the harness enforces:

```
             init                          all steps done
  ┌──────┐  ────►  ┌──────────┐  ────►  ┌──────┐  ────►  ┌──────┐
  │ plan │         │ baseline │         │ lane │         │ gate │
  └──────┘         └──────────┘         └──┬───┘         └──┬───┘
                    (advance is           │ ▲               │
                     blocked until        │ │ heal          │
                     a baseline    fail ──┘ │ (≤3 retries,  ▼
                     is recorded)  │        │  then       ┌──────┐    ┌──────┐
                                   ▼        │  blocked)   │ docs │───►│ done │
                               ┌─────────┐  │             └──────┘    └──────┘
                               │ healing │──┘
                               └─────────┘
```

Key invariants of the machine:

- `advance` is refused while `phase === "baseline"` — no lane work without a
  recorded green baseline.
- `advance --delta drift` is refused outright: behavior drift means roll back
  the step (via a git-stash checkpoint), never advance past it.
- `fail` increments the step's retry counter and enters the **self-heal
  loop**: status `healing`, then `heal` re-activates the step for another
  attempt. After **3 retries** the step and run go `blocked` — the harness
  stops and surfaces the blocker instead of thrashing.
- `reset` finalizes a retro into `history.jsonl` and deletes only the run
  state; history persists.

## The 6 hooks

All hooks are registered globally, so every one of them obeys two shared
invariants: the **dormant fast path** (if the project has no
`.refactor-chain/state.json` — or, for memory capture, no history either —
exit 0 immediately with no output) and **never-throw** (every hook wraps its
body in try/catch and exits 0 on any error; a hook must never break a session
or trap the user).

| Event | Script | Contract |
| --- | --- | --- |
| SessionStart | `boot.mjs` | Resume banner for a paused run, one-line memory recall, and a warning if the plugin path contains a space. |
| UserPromptSubmit | `intake.mjs` | Cheap trigger-word filter; when the prompt concerns refactor-chain, stash the utterance + mode into `intake.json` as deterministic input for diagnosis. |
| PreToolUse | `risk-guard.mjs` | **Never approves — only asks.** It never emits `allow` (that would auto-approve tools and bypass the permission system). Silent for dormant/safe cases; emits `permissionDecision: "ask"` only for a risky action (destructive shell command, ship-sensitive file) inside an active chain. |
| PostToolUse | `guard.mjs` | Records the edit into state (drift detection / self-heal signal) and reminds to re-verify. Never blocks a tool call. |
| Stop | `ship-gate.mjs` | **Blocks the "done" narrative until the gate.** A mid-flight chain cannot be declared finished; blocked runs, `docs`, and `done` are legitimate stops. Defaults to approve on any error so it can never trap a stop loop. |
| SessionEnd | `memory-capture.mjs` | **Durable facts only.** Appends a compact note (active-run position, last retro outcome, flagged scope-drift items) to `memory/sessions.jsonl` — never transcripts, never secrets. |

## Decision checkpoints

The harness pauses for a human decision at well-defined points rather than
improvising:

- **Plan-time decision window.** Before any lane runs, the principles registry
  recommends a set for the detected stack; the user can accept it,
  mix-and-match, or deliberately choose an unconventional combination — with
  the risks stated plainly, then recorded.
- **Clarify questions.** Low-confidence or monorepo classifications in
  careful/ask mode produce a two-option, plain-language question instead of a
  silent guess.
- **Guideline exceptions.** The conformance gate demands 100% PASS; the only
  bypass is an explicit user-approved exception, which is written to
  `guideline-exceptions.json` so it is auditable later.
- **Rollback checkpoints.** `checkpoint` snapshots the tree via
  `git stash create` before risky steps, so undo is always one command away.

## External interop (both harness-native)

### GitHub Action (`action.yml`, repo root)
A composite action any repo can call (`uses: ahmedbenaw/refactor-chain@v4`).
**Deterministic mode** (default, zero keys) runs the harness's own analysis
scripts — `diagnose.mjs classify`, `lib/guidelines.mjs audit`, `orchestrate.mjs
doctor` — against the calling repo and publishes a ranked refactor-readiness
report to the job summary (optionally one edited-in-place PR comment with
`comment: true`). **Agent mode** (opt-in) pipes a bounded, read-only review
prompt to the caller's own agent CLI (`agent-cmd`, their credentials). Contract:
report-only — the action never edits, pushes, or merges. `ci.yml` dogfoods the
deterministic mode on this repo; `refactor-ci-agent` is the operating skill
(secrets hygiene, PR-comment etiquette).

### spec-kit (`.specify/` projects)
Detection is a first-class signal: `signals.mjs` walks admit `.specify/`
(dot-dirs are otherwise skipped), `collectSignals()` exposes `specKit`,
`diagnose.mjs classify` surfaces it as `conditional.specKit` **plus a
plain-language note**, and `init` persists it in `state.diagnosis` — so every
later phase can read it from state, not by re-scanning. At the plan phase,
`refactor-plan-gate` pauses on the signal for the Integrate / Co-author / Adopt decision
checkpoint (heuristic + all three modes specified in
`refactor-plan-gate/references/spec-kit-interop.md`); the choice is recorded in
state and the write-up.

## The improvement loop

Every finished (or aborted) run produces a retro: lane, case, mode,
confidence, whether clarification was needed, per-step attempt/heal record,
and outcome. `orchestrate reset` submits it through `diagnose learn`, which
validates the shape (at minimum `{lane, outcome}` of the right types —
malformed retros are rejected, never written) and appends it to
`.refactor-chain/history.jsonl`.

On the next classification, `historyPrior` reads that history and gives each
lane with confirmed successful outcomes a small confidence nudge (+0.5 per
confirmed run, capped at two). The effect is deliberate and bounded: the
system gets slightly more decisive about lanes that have actually worked in
this project, without ever letting history outvote fresh evidence.
