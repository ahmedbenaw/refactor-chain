# refactor-chain — skill authoring template (READ FULLY before authoring)

Every new skill is a native part of the `refactor-chain` plugin. NO runtime
dependency on any external skill — bake the method in. Target dir:
`~/.claude/skills/<skill-name>/` (the live global path); the source of truth is
`skills/<skill-name>/` in this repo, mirrored on install.

A skill is not "done" until the audit passes (`node scripts/audit.mjs`). The audit
is the authority — it gates frontmatter (skills AND commands), stub resources,
stale lane/skill names, provenance, and broken paths. If the audit is red, the
skill is not finished, no matter how good the prose reads.

## Required files per skill (100% populated — nothing stubbed)

```
<skill-name>/
  SKILL.md                     ← the skill (template below)
  references/method.md         ← the full method/rules the skill applies (the "how", in depth)
  examples/before-after.md     ← at least one concrete worked example (before → after + why)
  scripts/                     ← any helper the skill invokes; if none is truly needed, add
                                 scripts/checklist.mjs — a zero-dep Node script that prints the
                                 skill's step checklist as JSON (so the skill always has a real script)
  templates/output.md          ← the scaffold the skill fills in when it produces output
                                 (report / plan / doc). Real, usable template with placeholders.
```

**Stub gate (hard):** every `references/*.md`, `examples/*.md`, and `templates/*.md`
must clear the audit's `stub-resource` floor (currently 120 bytes) AND actually
carry content — no "TODO", no "example here", no empty sections. A 121-byte file
of filler still fails review even if it passes the byte count; write the real thing.

## SKILL.md structure (EXACT section headers, in order)

```
---
name: <skill-name>
description: <third-person. Start "Use this skill when...". Concrete plain-English trigger phrases. Name its phase/lane in the refactor-chain pipeline. Note if it is conditional (only when X detected) or advisory.>
---

# <Plain Human Title> — refactor-chain · <phase/lane>

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** <listen|understand|diagnose|plan|baseline|do-the-work|secure|review|docs|ship|improve> · **Prerequisite:** <prev or "none"> · **Next:** <next or "review gate">.
**Adaptivity / conditional:** <repo-agnostic | conditional on <signal> | advisory-only>.

## Purpose
<one short paragraph, plain English>

## When to use
<bullets: conditions + plain trigger phrases>

## What I'll tell you (plain-language / ADHD-friendly)
The calm, jargon-free way this skill talks to the person running it:
- Says what it will do AND what it won't ("your app keeps working the same").
- One step / one decision at a time; shows "you are here (N of M)" where relevant.
- Asks before anything risky; undo is always one step away.
- On trouble: "that didn't work — I undid it and I'm trying another way (attempt 2 of 3)", never a raw stack trace.
- Offers "show technical details" for the developer who wants the depth.
(Write 3-6 concrete example lines this skill would actually say.)

## Method
<the imperative steps. Point to `references/method.md` for the exhaustive rules.>

## Guardrails
- Behavior is preserved (refactor only) OR advisory-only (state which).
- <skill-specific cautions>

## Verify
<how to confirm the step succeeded, plain-language + technical>

## Resources
- `references/method.md` — full method/rules.
- `examples/before-after.md` — worked example.
- `scripts/…` — helper(s).
- `templates/output.md` — the output scaffold.

## Chain position
<where it runs; what feeds it; what it feeds. `refactor-code-principles` + the review gate run near the end of every non-debug lane.>
```

## Rules
- Third-person description; imperative body. Frontmatter has ONLY `name` + `description`. `name:` MUST equal the directory name (the audit enforces this on skills and commands).
- Plain-language first; technical detail behind a "show technical details" framing.
- Keep identifiers/code/paths verbatim in `backticks`.
- SKILL.md body 500–1200 words; put depth in `references/`.
- Conditional skills (`refactor-auth-hardening`, `refactor-telemetry-plan`, `refactor-data-guard`) must state they only activate when their signal is detected.
- The harness (`~/.claude/skills/refactor-chain/scripts/orchestrate.mjs` + `diagnose.mjs`) already exists — reference it; don't reinvent state/detection.

## Lanes and current names (do not author against dead names)
The rename to a generic, registry-driven model is complete. Author against these,
never the retired names:

| Use | NEVER use (retired) |
|---|---|
| `backend` lane (steps `refactor-backend-01..09`, chosen by `languages.mjs` registry entries with `lane: "backend"`) | `java` lane, `jvm` lane, hardcoded language-name lanes |
| `refactor-code-principles` (principle-driven structural pass) | `code-solid` |
| generic registry-driven detection | any per-language special-casing in `diagnose.mjs` |

The audit's `stale-lane` and `v1-relic` gates fail the build on `java`-as-lane,
`code-solid`, `grp-`, `gfmis`, and CJK relics. If you need a language-specific
detail, put it in the `languages.mjs` registry entry, not in a lane name.

## Standing contracts every skill runs under
A new skill does not re-implement these — it is authored to cooperate with them.
They are loaded at run start and in force through every phase:
- **`refactor-guidelines-contract`** — no hallucinated APIs, no silent scope creep, no false "done", smallest diff that serves.
- **`refactor-live-truth`** — never assert a system fact from memory; verify against the live repo first.
- **`refactor-scope-fence`** — edits stay inside `state.steps[cursor].scope`; adjacent problems are recorded and parked, not quietly repaired (an out-of-scope edit hard-flags drift in state).
- **`refactor-adversarial-verify`** — every "it worked" claim is attacked before `advance`.
- **Decision checkpoints** — multi-choice questions in-thread at the fork; recorded via `orchestrate.mjs decision`.
- **Guidelines gate** — `scripts/lib/guidelines.mjs eval` must reach 100% PASS (or a recorded exception) at the review gate before the chain may complete; `advance` refuses to leave a `kind:"gate"` step until `state.guidelines.gate === "PASS"`.
- **`refactor-ruthless-editor`** (docs phase) and **`refactor-memory`** (recall at boot, capture at session end).

If your skill sits at the end of a non-debug lane, its successor is the appended
`refactor-review-gate` step (`kind:"gate"`) — do not duplicate its work; feed it.

Report back per skill: the name + one-line description + confirm all 5 file types
created AND `node scripts/audit.mjs` is green for the new skill.
