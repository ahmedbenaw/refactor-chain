# State schema

Everything refactor-chain persists lives under `<project>/.refactor-chain/`.
All files are plain JSON or JSONL, written only by the harness scripts. This
document describes each file, field by field, plus the forward-compatibility
rules contributors must follow.

## `state.json` — the active run (schema v3)

Created by `orchestrate.mjs init`, deleted by `reset`. One active run per
project. Top-level fields, in the order `init` writes them:

| Field | Type | Meaning |
| --- | --- | --- |
| `version` | number | Schema version. Currently `3`. `doctor` treats `version >= 3` with a `steps` array as intact. |
| `target` | string | Absolute path of the project being worked on. |
| `mode` | string | `careful` \| `autopilot` \| `ask` — how much the run pauses for the user. Copied from diagnosis. |
| `createdAt` | string | ISO-8601 timestamp of `init`. (`updatedAt` is stamped on every write.) |
| `git` | boolean | Whether the target is inside a git work tree (gates checkpoints). |
| `diagnosis` | object | The full classifier output from `diagnose.mjs classify`, embedded verbatim: lane, case, confidence, signals, alternatives, clarify, `conditional` flags (`auth`, `telemetry`, `dags`, `specKit`), `principles` (`{agnostic[], stackMapped[]}` — the registry recommendation for the detected stack, consumed by the plan-phase decision window), and `note` (plain-language callout for embedded targets or spec-kit projects). |
| `planNote` | string (optional) | The refactor-plan-gate mini-plan recorded via `init --plan-note` (goal / unknowns / success criteria / step order). Absent when init ran without it. |
| `os` | string | OS label from detection (`posix`, `windows`, `ios`, `android`, `cross`) — tunes verify-command shape. |
| `platform` | string | Platform label (`web`, `mobile`, `desktop`, `backend`, `cli`, `embedded`, `monorepo`, `unknown`). |
| `phase` | string | `plan` \| `baseline` \| `lane` \| `gate` \| `docs` \| `done`. `init` lands on `baseline`; `advance` moves it. |
| `cursor` | number | Index into `steps` of the current step. |
| `health` | string | `ok` \| `healing` \| `blocked`. Set by `fail`/`heal`/`advance`. |
| `baseline` | object \| null | `null` until `baseline` runs. Then `{cmd, framework, derived, passSet, at}` — the recorded green baseline that unlocks the lane. |
| `steps` | array | The ordered chain. Per-step shape below. |
| `checkpoints` | array | Rollback snapshots: `{label, sha, at, step}` where `sha` comes from `git stash create`. |
| `lastEdit` | object \| null | Most recent hook-observed edit: `{file, at, step}`. Written by `record-edit`. |

### Per-step shape (`steps[]`)

| Field | Type | Meaning |
| --- | --- | --- |
| `skill` | string | The `refactor-*` skill this step runs. |
| `kind` | string | `"step"` for lane work, `"gate"` for the appended review gate. |
| `status` | string | `pending` → `active` → `done`, with detours to `healing` and `blocked`. |
| `retries` | number | Failure count. At 3 (`MAX_RETRIES`) the step goes `blocked`. |
| `edits` | number | Edits observed by the PostToolUse hook while this step was current. |
| `notes` | array of strings | Free-form notes; `fail` appends `FAIL(n): reason` entries. |
| `startedAt` / `doneAt` | string \| null | ISO timestamps. |
| `verify` | object | `{ran, delta}` — whether verification ran and its result (`"clean"` or a delta label). Drift (`--delta drift`) refuses to advance. |
| `scope?` | string | Optional; present only when a step is fenced to a subtree (e.g. a monorepo package). Absent otherwise — readers must not assume it. |

## `history.jsonl` — retros (the self-improvement record)

Append-only; one JSON object per line; survives `reset` deliberately. Written
exclusively through `diagnose.mjs learn`, which **validates before writing**:
the retro must be a plain object with string `lane` and string `outcome`, and
`steps`, if present, must be an array. Anything else is rejected with
`{ok:false, appended:false}` and never written — history cannot be poisoned
by a malformed write.

A retro produced by `orchestrate reset` looks like:

```json
{"lane":"web","case":"refactor-web","mode":"ask","confidence":0.71,
 "clarified":false,
 "steps":[{"skill":"refactor-web-01-structure","attempts":1,"healed":false,"status":"done"}],
 "outcome":"done","at":"2026-07-04T12:00:00.000Z"}
```

`outcome` is `"done"` only when every step finished; otherwise `"aborted"`.
The classifier's `historyPrior` counts `outcome === "done"` lines per lane and
adds a bounded confidence nudge (0.5 per confirmed run, at most 2 runs
counted) on future classifications.

## `memory/sessions.jsonl` — durable session notes

Appended by the SessionEnd hook (`memory-capture.mjs`); read by the
SessionStart hook for a one-line recall. Each line carries **durable facts
only** — never transcripts, never secrets:

| Field | When present | Content |
| --- | --- | --- |
| `at` | always | ISO timestamp. |
| `activeRun` | a run is mid-flight | `{lane, phase, step: "n/total", health}`. |
| `flagged` | scope-drift notes exist | Up to 3 step notes mentioning scope. |
| `lastRun` | no active run but history exists | `{lane, outcome, at}` of the latest retro. |

If none of those exist, nothing is written at all.

## `guidelines.json` — observed conventions

Written by `guidelines.mjs extract` from a bounded sample (≤ 60 files, depth
3): dominant `indent`, `quotes`, `lineLengthP95`, `namingDominant`, detected
formatter/linter/editorconfig `configs`, `ci`, `testsDir`, `guidelinesDoc`,
`sampledFiles`, and `at`. `audit` and `eval` consume it (re-extracting if
absent) to score the repo against the baseline checks.

## `guideline-exceptions.json` — approved exceptions

A plain JSON array of baseline check ids (e.g. `["linter-config"]`) that the
user has explicitly accepted as exceptions. `guidelines.mjs eval` excludes
excepted ids from the failing set; everything else must PASS for the gate to
say `PASS` instead of `BLOCK`. This file is only ever written as the result of
a recorded decision checkpoint — it is the audit trail of the one allowed
bypass.

Other transient files in the directory: `intake.json` (the last relevant
utterance + mode, stashed by the UserPromptSubmit hook as deterministic input
for diagnosis).

## Forward compatibility

Two rules keep old and new harness versions interoperable:

1. **Preserve unknown fields.** Any code that reads, mutates, and rewrites
   `state.json` (or any file here) must round-trip fields it does not
   recognize. Never rebuild the object from a whitelist.
2. **Additive-only evolution.** New schema fields must be optional with safe
   defaults when absent (as `scope?` is today). Removing or repurposing an
   existing field requires a `version` bump and an explicit migration path in
   `orchestrate.mjs` — readers of v3 files must keep working.
