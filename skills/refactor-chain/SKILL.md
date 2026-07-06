---
name: refactor-chain
description: "Use this skill to run refactor-chain — a self-diagnosing, self-healing \"fix-it\" pipeline for a codebase. It figures out what a request needs (tidy structure / modernize / fix a bug / improve the UI), routes to the right lane of nativized refactor-* skills, proves behavior is preserved at every step, reviews before shipping, and explains itself in plain language. Triggers on \"/refactor\", \"/fix\", \"refactor this\", \"clean up / restructure / modernize this\", \"make it look better\", \"it's broken/slow\", \"chain of skills\", \"self-healing refactor\", or any whole-project refactor/quality request."
---

# refactor-chain — the self-diagnosing, self-healing fix-it pipeline

One calm door to the whole `refactor-*` skill family. It detects what's needed,
plans in plain words, does the work in small verified steps, reviews, and writes
up what changed. Everything is behavior-preserving unless the user opts into an
advisory redesign. Detection and state are single-sourced from the harness.

**Harness dir:** `DIR="$HOME/.claude/skills/refactor-chain/scripts"` (or `${CLAUDE_PLUGIN_ROOT}/scripts`).
`diagnose.mjs` classifies; `orchestrate.mjs` holds the run state at
`<project>/.refactor-chain/state.json` (resumable across turns/compaction).

## Modes (the user decides; default = ask-once)
- **careful** — when unsure, ask ONE plain "did you mean A or B?"; pause before risky steps.
- **autopilot** — proceed on the best guess; pause only for destructive actions.
- **ask-once** — ask "careful or fast?" once at the start, then remember.
Pass `--mode careful|autopilot|ask`. Every message is plain-language by default; offer "show technical details" for the depth.

## The 9-phase pipeline

Run as a deterministic loop. Never skip verification; never force a blocked step.

### 1. LISTEN → 2. UNDERSTAND → 3. DIAGNOSE
```bash
node "$DIR/diagnose.mjs" classify --target <project> --utterance "<what the user said>" --mode <mode>
```
First invoke **`refactor-understand`** (read-only: what is this project?). Then **`refactor-diagnose`** drives the classify above → `{case, lane, os, platform, confidence, inScope, clarify, redirect}`.
- `inScope:false` → show `redirect` calmly and stop (it's not a refactor task).
- `clarify` present (careful/ask + low confidence, or a monorepo) → ask that ONE plain A/B question, then continue.
- For deeper reads, `refactor-assessment-map` (where the debt is) and `refactor-legacy-assess` (readiness) feed the plan.

### 4. PLAN
```bash
node "$DIR/orchestrate.mjs" init --target <project> --utterance "..." --mode <mode>
```
**`refactor-plan-gate`** runs first: a short written mini-plan (goal, unknowns, success criteria, step order) is required before baseline may run; when the `spec-kit` signal is present it pauses for the Integrate / Co-author / Adopt decision checkpoint. Then init builds the ordered lane and announces it in plain words ("Here's my plan: 6 steps, I'll check after each, nothing risky without asking. Ready?"). Lanes:
- **backend** (9 layered-governance steps, registry-driven — any stack whose registry entry says `lane: "backend"`) · **web** (5) · **ui** (`refactor-ui-tokens` → `refactor-ui-visual`/`refactor-ui-mobile` → `refactor-ui-components` → `refactor-ui-a11y`) · **code** (`refactor-code-principles`) · **debug** (one of `refactor-whats-wrong`/`refactor-web-performance`/`refactor-code-memory`).
- Non-debug lanes end with `refactor-code-principles`, then an appended `refactor-review-gate` (kind:"gate"). Debug lanes are a single fix step → review gate (no `refactor-code-principles`).

### 5. BASELINE (safety net — never refactor on a red repo)
Invoke **`refactor-safety-net`**: record a GREEN behavior baseline (derive characterization tests if none exist), then:
```bash
node "$DIR/orchestrate.mjs" baseline --target <project> --cmd "<test cmd>" --framework <fw> [--derived]
# HARNESS-ENFORCED plan-gate: baseline is REFUSED until a mini-plan is recorded (init --plan-note or baseline --plan-note).
```
The harness blocks entering the lane until a baseline is recorded.

### 6. DO THE WORK (each step: checkpoint → apply → verify → advance / self-heal)
For the current step from `status`:
1. **Read/invoke the step skill** by name (e.g. `refactor-backend-04-service`, or `refactor-transform` to apply a modernization).
2. **Checkpoint:** `orchestrate.mjs checkpoint --label step-<n> --target <project>` (rollback point).
3. **Apply** the step's change (smallest safe increment). Optional async fan-out only for independent, non-overlapping units.
4. **Verify** with **`refactor-verify`** (re-run the baseline):
   - identical pass-set → attack the claim (`refactor-adversarial-verify`), then `orchestrate.mjs advance --target <project> --delta legal --adversarial --note "<what changed>"`. **The harness REFUSES a legal advance without `--adversarial`.**
   - **assertion-level failure = STOP:** `advance --delta drift` is refused by the harness — roll back this step (`git stash apply <checkpoint sha>`), then `orchestrate.mjs fail --reason "..."` → self-heal (bounded to 3) or, when exhausted, surface the blocker and stop.
   - only rename-induced import/path churn is legal to mechanically fix (never edit assertions to mask drift).
- **Conditional guards fire automatically by signal:** `refactor-data-guard` (data-layer touch), `refactor-auth-hardening` (auth code), `refactor-telemetry-plan` (tracked flows). `refactor-rules` enforces the project's own conventions before+after.

### 7. SECURE + REVIEW GATE
At the appended gate step, invoke **`refactor-review-gate`** — it coordinates `refactor-security`, `refactor-performance`, and `refactor-red-team` (+ a correctness read) into ONE calm, ranked "N things worth your attention, most important first" report. `refactor-ship-readiness` runs if a store/platform target is detected. The **Stop hook (`ship-gate.mjs`) blocks "done" until this gate passes.**

### 8. DOCS
**`refactor-write-up`** (plain "here's what changed" vs the understand snapshot) → **`refactor-artifacts-sync`** (architecture/flows/permissions/tests docs) → **`refactor-audit-trail`** (forensic change log).

### 9. SHIP → IMPROVE
**`refactor-publish-checklist`** (go/no-go) → on GO, **`refactor-ship`** (commit + PR draft, plain git, never merges/force-pushes). Then finish:
```bash
node "$DIR/orchestrate.mjs" reset --target <project>
```
Reset writes an improvement retro to the persistent `<project>/.refactor-chain/history.jsonl`; **`refactor-improve`** reflects and proposes one improvement. The next run's confidence prior reads that history — the chain gets smarter per repo.

## Standing contracts (loaded at run start, in force through every phase)
- **`refactor-plan-gate`** — a written mini-plan is required before baseline (**harness-enforced**: `baseline` refuses without `state.planNote`).
- **`refactor-guidelines-contract`** — the LLM-conduct contract: no hallucinated APIs, no silent scope creep, no false "done" claims, smallest diff that serves, uncertainty stated plainly.
- **`refactor-live-truth`** — never assert a system fact from memory/docs; verify against the live repo first.
- **`refactor-scope-fence`** — edits stay inside `state.steps[cursor].scope`; drift is **hard-flagged into `state.notes`** by `guard.mjs` (persisted for the write-up + improve retro), then parked, never silently fixed.
- **`refactor-adversarial-verify`** — every step's "it worked" claim is attacked before `advance` (**harness-enforced**: `advance` refuses `--delta legal` without `--adversarial`); the review gate red-teams the whole diff.
- **Decision checkpoints** (`references/decision-checkpoints.md`) — multi-choice questions in-thread at the moment of the fork (mode pick, lane clarify, risky steps, gate triage, scope flags, spec conflicts, principle selection). Autopilot reduces frequency but never removes destructive-action checkpoints.
- **Guidelines gate (HARNESS-ENFORCED)** — at the review gate, run `orchestrate.mjs gate-check`; the harness **refuses to advance past the gate** until `guidelines.mjs eval` is PASS (100%) or every failing check is a recorded exception. Not optional, not prose — a wired stop.
- **`refactor-ruthless-editor`** (docs phase) and **`refactor-memory`** (recall at boot, capture at session end) round out the discipline pack.

## The Conductor (always-on orchestration layer, v4.7.0)
An always-on layer runs across every phase: at PLAN, **`refactor-orchestrate`** resolves each step's
**chain-of-skills** (internal `refactor-*` plus external installed skills, via `lib/skill-registry.mjs`),
its **spec-kit (SDD) commands** (`lib/spec-kit.mjs`), and any external-skill augmentation, then emits a
`dispatch.parallel[] / sequential[]` plan the host fans out (parallel on Claude Code, sequential on
Codex). Announce each phase's chain in plain words. The review gate generalizes to the **multi-pass
review loop** (`review-loop-*`): at least 3 passes for a review-class target, until a round turns up
nothing new; a **fast path** (`fastPath:true` / `depthFor<=1`) takes a single verify-and-refute pass for
a one-step lane (debug fix, tidy) instead of the loop. The Conductor **composes with and never bypasses**
the state machine, guards, hooks, or gates; `conduct` is read-only w.r.t. `state.steps`. Standalone entry:
**`/refactor-orchestrate`**. Emit the plan with `orchestrate.mjs conduct --target <project>`.

## Resuming
Always begin with `orchestrate.mjs status --target <project>`. If `active:true`, resume at the reported phase/step — do NOT re-init. The SessionStart hook (`boot.mjs`) surfaces a paused run automatically.

## Plain-language / ADHD contract (every phase)
One decision at a time; "you are here (step N of M)"; say what will and won't change ("your app keeps working the same"); ask before anything risky; undo is one step away; calm failures ("that changed behavior — I undid it and I'm trying another way, attempt 2 of 3"), never a raw stack trace by default; a `show technical details` layer for developers.

## Verify
### Contract
- **Inputs:** the user's plain-language ask; project dir; optional mode flag. Harness: `diagnose.mjs classify`, `orchestrate.mjs init/baseline/checkpoint/advance/fail/heal/reset`.
- **Outputs:** `.refactor-chain/state.json` (schema v3), per-step verify records, the write-up, an improvement retro appended to `history.jsonl`.
- **Failure modes:** out-of-scope ask → calm redirect, no state written; red baseline → chain refuses to start; drift → step rolled back, self-heal (max 3) then `blocked` and a human is asked; guidelines eval below 100% without a recorded exception → no-go at the gate.

## Guardrails
- Refactoring preserves behavior; `refactor-reimagine` is advisory-only (never auto-applied).
- One lane per run; for a monorepo, run lanes per package.
- The ordered steps are a hard chain: step N+1 never starts before step N verifies.
