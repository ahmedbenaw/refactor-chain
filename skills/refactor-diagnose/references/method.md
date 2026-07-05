# refactor-diagnose — full method

The intake/diagnostic engine of refactor-chain. Absorbs the intent of
`analyze-feature-requests` (is this even in scope?); `claude-automation-recommender` is adopted into `refactor-improve` (it recommends standing automations at retro time)
(what mode should we run in?), and `sequential-thinking` (structured, step-by-step
reasoning) into one native, dependency-free classifier that drives the harness.

## The harness is the single source of detection

Never hand-roll lane rules in the model. Call:

```
node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs classify \
  --target <dir> --utterance "<what the user said>" --mode <careful|autopilot|ask>
```

Related subcommands:
- `signals  --target <dir>` — raw evidence dump (already gathered by refactor-understand).
- `scope    --target <dir> --utterance "…"` — just `{inScope, redirect}`.
- `matrix` — the OS/platform detection matrix (below), for docs/tests.
- `learn --target <dir> --retro <json>` — append an outcome to `history.jsonl`
  (history prior; improves future confidence).

## What `classify` returns (the contract you consume)

```
{ case, lane, os, platform, framework, monorepo, confidence, inScope, mode,
  signals[], alternatives[], clarify|null, redirect|null, priorApplied,
  conditional: { auth, telemetry, dags } }
```

- **lane** ∈ {java, web, ui, code, debug}; **case** is the human label
  (`refactor-web`, `refactor-backend`, `refactor-ui`, `refactor-code`, or a debug
  subtype: `whats-wrong` / `web-performance` / `code-memory`).
- **confidence** = topScore / (topScore + secondScore), rounded; capped at 0.55
  for monorepos. Thresholds: `CONF_MIN = 0.70`, `FLOOR = 0.35`.
- **inScope** false when a strong feature-add intent has no refactor/debug/ui
  signal, or nothing clears the floor.

## Lane voting model (how the winner is chosen)

Evidence (repo) + intent (the user's words, weighted higher) vote per lane:
- Maven → java +3. Web signals → web +2, ui +1. Framework → web +1.
- Mobile → ui +2. Non-web backend (go/python/csproj/cargo) → code +2.
- CLI (Makefile / shebang bin) → code +1.
- Intent `ui` → ui +3. Intent `perf|leak|debug` → debug +4.
- Intent `refactor` → routes to the code lane the repo indicates (java/web/code) +2.
- History prior from `history.jsonl`: confirmed past lanes get a small boost.

You do not compute these — you *read* the result and explain it in plain words.

## Mode logic (careful / autopilot / ask)

| Mode | When to use | Behavior |
|------|-------------|----------|
| **ask** (default) | user hasn't said how autonomous to be | Present the plain plan; ask the A/B clarify if `clarify` is set; wait for go-ahead. |
| **careful** | user is cautious, high-stakes repo, or explicitly "check with me" | Confirm before *each* real change later; always surface `clarify`. |
| **autopilot** | user said "just do it" / "you decide" AND `confidence ≥ 0.70` AND no `clarify` | State the plan and proceed to plan phase without a question. |

If autopilot is requested but confidence < 0.70 or a `clarify` exists, **downgrade
to ask** for that one question — never autopilot through real ambiguity.

## The "did you mean A or B?" clarify

The harness emits `clarify` (careful/ask + ambiguous + in-scope) in two shapes:
1. **Two-lane tie:** `"Do you want me to (A) <plain lane A>, or (B) <plain lane
   B>?"` — pick the branch the user names; feed that lane forward.
2. **Monorepo:** `"Start with the main project I found (<plain lane>), or pick a
   specific package?"` — if they pick a package, re-run `refactor-understand` +
   `classify` scoped to that subtree.

Plain-language lane labels (from the harness):
- java → "restructure your Java back-end code"
- web → "restructure your front-end project"
- ui → "improve how the screens look"
- code → "clean up the code's structure"
- debug → "find and fix what's broken"

Ask exactly one question. Do not stack clarifies.

## Scope gate (in / out)

If `inScope` is false, deliver `redirect` verbatim-in-spirit and stop:
- Feature-add intent → "This looks like adding something new, not tidying existing
  code. refactor-chain only restructures code that already works."
- Unclear → "I couldn't tell what needs restructuring. Tell me what feels messy or
  broken and I'll look again."
Never force an out-of-scope request into a lane to look productive.

## Structured reasoning frame (sequential-thinking, baked in)

Reason in explicit, inspectable steps before you speak:
1. **Evidence** — which signals fired (from `signals[]`).
2. **Candidates** — top lane + `alternatives[]` with scores.
3. **Winner & why** — the deciding evidence/intent, in one sentence.
4. **What could make me wrong** — the ambiguity that would flip it (drives clarify).
5. **Decision** — lane, mode, and either "proceeding" or the single question.

Expose this as "show technical details" for developers; lead with plain language.

## OS / platform matrix (tunes later verify commands, not the lane)

- **platform:** web · mobile · desktop · backend · cli · monorepo.
- **os:** posix (Makefile/*.sh) · windows (*.sln/*.ps1/CRLF → PowerShell-safe
  verify) · ios (Info.plist/*.xcodeproj) · android (AndroidManifest.xml).
- Get the canonical table any time with `diagnose.mjs matrix`.

## Conditional add-ons to arm

From `conditional`: `auth` → later auth-hardening gate; `telemetry` (data layer)
→ telemetry-plan; `dags` (Airflow) → DAG-specific tactics. Record which are armed
so the plan phase schedules them; they only activate when their signal is present.

## Output contract
Fill `templates/output.md`. Record `case`, `confidence`, `mode`, the reasoning
steps, any `clarify` question, and armed conditionals. Hand `{case, lane, os,
platform, mode, conditional}` to the plan phase. After the run completes, feed the
outcome back via `diagnose.mjs learn` so confidence improves next time.
