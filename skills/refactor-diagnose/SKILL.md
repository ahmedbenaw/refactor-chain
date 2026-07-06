---
name: refactor-diagnose
description: "Use this skill to turn a refactor-chain request into a concrete, classified plan — it drives the diagnostic harness (diagnose.mjs) to detect the lane/case, OS, platform, and confidence, then decides the working mode (careful vs autopilot vs ask) and, when it's unsure, asks a single \"did you mean A or B?\" clarify before anything is touched. This is the diagnose phase of the refactor-chain pipeline; its prerequisite is refactor-understand and it feeds the plan phase. Trigger phrases: \"figure out what kind of refactor this is\", \"which lane does this go in\", \"you decide how to approach this\", \"I'm not sure what I need\". Runs structured reasoning; read-and-classify only, never edits."
---

# Diagnose the Request — refactor-chain · diagnose

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** diagnose · **Prerequisite:** refactor-understand · **Next:** plan.
**Adaptivity / conditional:** repo-agnostic engine; adapts its questions to confidence and to monorepo/ambiguity signals.

## Purpose
This is the brain of the intake. It takes the Project Profile (from
`refactor-understand`) plus what the person actually said, and classifies the job
into `{case, os, platform, confidence, mode}` using the harness's
`diagnose.mjs`. It then runs the mode logic — **careful** (confirm before acting),
**autopilot** (proceed on high confidence), or **ask** (default) — and, when two
lanes are plausible or the repo is a monorepo, it asks exactly one plain-language
"did you mean A or B?" question. It reasons step by step, but never edits code.

## When to use
- Right after `refactor-understand`, on every refactor-chain run.
- Someone says "you decide how to approach this", "which lane is this", "I'm not
  sure what I need", "just tell me what you'd do".
- Any time the target or utterance changes and the classification must be redone.

## What I'll tell you (plain-language / ADHD-friendly)
- "Here's what I think you want, in plain words: tidy up your front-end project's
  structure. I'm about 85% sure. (diagnose only — nothing changed yet.)"
- "I want to get this right. Do you want me to (A) restructure your Java back-end
  code, or (B) clean up the code's general structure?"
- "This is a monorepo — several projects in one folder. Start with the main one I
  found, or point me at a specific package?"
- "You're in careful mode, so I'll check with you before each real change."
- "This looks like adding a *new* feature, not tidying existing code — refactor-chain
  only restructures what already works. Want a build skill instead?"
- "Want the technical classification (case, os, platform, confidence)? I can show it."

## Method
1. Ensure the Project Profile exists (run `refactor-understand` first if not).
2. Classify with the harness — this is the single source of detection:
   `node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs classify --target <dir> --utterance "<what they said>" --mode <careful|autopilot|ask>`.
3. Read the returned `{case, lane, os, platform, framework, monorepo, confidence,
   inScope, mode, signals, alternatives, clarify, redirect, conditional}`.
4. **Scope gate:** if `inScope` is false, deliver `redirect` in plain language and
   stop — do not force a lane.
5. **Mode logic:**
   - `autopilot` + `confidence ≥ 0.70` + no clarify → state the plan and proceed to plan phase.
   - `careful` or `ask` → present the plain-language plan and, if `clarify` is
     present, ask that single A/B question and wait.
6. **Structured reasoning:** think in explicit steps (evidence → candidate lanes →
   why the winner → what could make it wrong). See `references/method.md` for the
   reasoning frame and the mode/clarify decision table.
7. Fill `templates/output.md` (the Diagnosis) and hand `{case, lane, mode,
   conditional}` to the plan phase.

## Signals with follow-on checkpoints
- **`spec-kit`** (a `.specify/` directory): diagnose surfaces it; `refactor-plan-gate` then pauses for the Integrate / Co-author / Adopt decision checkpoint (`refactor-plan-gate/references/spec-kit-interop.md`).
- **Low confidence / monorepo**: ONE plain A/B clarify question — a mid-chat decision checkpoint, never a guess in careful/ask mode.
- Reasoning for ambiguous classifications follows the shared protocol in `refactor-chain/references/reasoning-protocol.md` (numbered, revisable steps).

## Guardrails
- **Read-and-classify only. Never edits, never runs the project.** Detection lives
  in the harness — do not hand-roll lane rules here.
- Never proceed past a low-confidence, two-lane ambiguity without the A/B clarify.
- Respect `inScope=false` — redirect instead of shoehorning a feature request into
  a refactor lane.
- Monorepo caps confidence at 0.55 by design — treat it as "ask which package".

## Verify
- Plain: "I can name the lane, say how sure I am, and either I'm proceeding
  (autopilot, high confidence) or I've asked you one clear question."
- Technical: `diagnose.mjs classify …` returns valid JSON with `inScope` and a
  `case`; the Diagnosis output records `confidence`, `mode`, and any `clarify`
  verbatim, plus which `conditional` add-ons (auth / telemetry / dags) are armed.

### Contract
- **Inputs:** `--target <dir>`, `--utterance "<ask>"`, `--mode careful|autopilot|ask` (via `diagnose.mjs classify`).
- **Outputs:** JSON `{case, lane, os, platform, confidence, inScope, signals, clarify, redirect}`; confidence prior read from `history.jsonl` when present.
- **Failure modes:** low confidence in careful/ask → ONE A/B clarify question instead of a guess; not a refactor task → `inScope:false` + redirect, nothing else happens; unreadable target → empty signals, honest low confidence.

## Resources
- `references/method.md` — classification model, mode/clarify decision table, structured-reasoning frame, OS/platform matrix.
- `examples/before-after.md` — worked example: vague request → full Diagnosis with A/B clarify.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the Diagnosis scaffold this skill fills in.

## Chain position
Core of the **diagnose** phase. Consumes the Project Profile from
`refactor-understand` (and, when available, the maps from `refactor-assessment-map`
/ `refactor-legacy-assess`). Emits `{case, lane, os, platform, confidence, mode,
conditional}` to the **plan** phase, which turns it into an ordered step list.
`refactor-code-principles` + the review gate run near the end of every lane.
