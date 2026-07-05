# refactor-chain v2 — skill authoring template (READ FULLY before authoring)

Every new skill is a native part of the `refactor-chain` plugin. NO runtime
dependency on any external skill — bake the method in. Target dir:
`~/.claude/skills/<skill-name>/` (this is the live global path).

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
- Says what it will do AND what it won't ("your code keeps working the same").
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
<where it runs; what feeds it; what it feeds. `refactor-code-principles` + the review gate run near the end of every lane.>
```

## Rules
- Third-person description; imperative body. Frontmatter has ONLY `name` + `description`.
- Plain-language first; technical detail behind a "show technical details" framing.
- Keep identifiers/code/paths verbatim in `backticks`.
- SKILL.md body 500–1200 words; put depth in `references/`.
- Conditional skills (auth-hardening, telemetry-plan) must state they only activate when their signal is detected.
- The harness (`~/.claude/skills/refactor-chain/scripts/orchestrate.mjs` + `diagnose.mjs`) already exists — reference it; don't reinvent state/detection.

Report back per skill: the name + one-line description + confirm all 5 file types created.
