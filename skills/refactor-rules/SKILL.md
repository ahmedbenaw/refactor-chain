---
name: refactor-rules
description: "Use this skill when refactor-chain needs to know \"what are this project's own rules?\" — the structural conventions the code already follows (dependency injection required, naming conventions, module/package boundaries, layering rules like controller→service→repository, no-circular-deps). It extracts those rules into a rules manifest, then enforces them BOTH before a change (baseline) and after (drift check), so a modernization step can never quietly violate the project's own architecture. This is the diagnose / do-the-work guardrail of the refactor-chain pipeline. Trigger phrases include \"extract the project's rules\", \"what conventions does this repo follow\", \"make sure the refactor respects our architecture\", \"did we break a layer rule\", \"enforce DI / naming / module boundaries\", \"check for a layering violation\". Repo-agnostic; read-only when extracting, advisory when it reports a violation."
---

# Project Rules — Extract & Enforce — refactor-chain · diagnose / do-the-work guardrail

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** diagnose (extract) → do-the-work (enforce) · **Prerequisite:** refactor-understand (stack known) · **Next:** refactor-plan / whichever lane runs, then the review gate.
**Adaptivity / conditional:** repo-agnostic — infers rules from whatever stack `refactor-understand` reported; read-only while extracting, advisory when it reports a violation (it never rewrites code on its own).

## Purpose
Every codebase has unwritten rules: "controllers never touch the database directly," "every service is constructor-injected, never `new`-ed," "no module under `core/` may import from `web/`," "DTOs live in `dto/` and end in `Dto`." This skill reads the code, infers those rules from the patterns that already dominate, and writes them into a **rules manifest** (`rules-manifest.md`). It then runs that manifest as a checklist twice: once **before** a modernization step to record the starting state, and once **after** to prove the step introduced **no new violation**. The manifest becomes the project's shared definition of "still structurally correct."

## When to use
- The orchestrator is about to enter a lane and wants a structural contract to hold the work to. Trigger: "extract the project's rules", "what conventions does this repo follow".
- Before/after a change, to prove no architectural rule was broken. Trigger: "make sure the refactor respects our architecture", "did we break a layer rule".
- Someone asks specifically about DI, naming, module boundaries, or layering. Trigger: "enforce DI / naming / module boundaries", "check for a layering violation".

## What I'll tell you (plain-language / ADHD-friendly)
- "First I'm just going to read your code and learn the rules it already follows — I won't change anything yet."
- "I found 6 rules your project keeps to. Here they are in plain English. Tell me if any is wrong and I'll drop it."
- "You are here: step 1 of 2 — recording the rules before we touch anything."
- "Good news: after the change, all 6 rules still hold. Nothing structural drifted."
- "Heads up: the change added 1 new violation — a controller now calls the database directly, which your project normally routes through a service. I did NOT edit anything; want me to flag it to the review gate?"
- "Want the technical detail? Say 'show technical details' and I'll show the exact files and the rule IDs."

## Method
1. **Confirm inputs.** Use the stack/entry-points summary from `refactor-understand`. If missing, do a quick read-only pass (manifests, top-level folders) first.
2. **Infer rules by dominant pattern.** Walk the categories in `references/method.md`: dependency injection, naming, module/package boundaries, layering, error/return conventions, and immutability/purity. A rule is only recorded when the pattern is *dominant* (the norm, not a one-off) — see the thresholds in `references/method.md`.
3. **Write the manifest.** Fill `templates/output.md` → `rules-manifest.md`: each rule gets an ID (`R01`…), a plain-English statement, a severity (`ERROR` / `WARNING` / `SUGGESTION`), how it's detected, and the current count of conforming vs. violating sites.
4. **Confirm with the human.** Show the manifest; let them delete/downgrade any rule that is not actually intended. Adjustments are cheap and expected.
5. **Enforce — before.** Run `scripts/checklist.mjs` (or the detection notes per rule) to record the *baseline* violation count per rule. Store it.
6. **Enforce — after.** Re-run after the modernization step. Compare. **Zero new `ERROR`-severity violations** is the pass condition. Report any delta as `legal` (no new violations) or `drift` (new violation) — the same vocabulary the harness's `advance --delta` uses.

See `references/method.md` for the full rule catalog, detection heuristics, and dominance thresholds.

## Guardrails
- **Advisory + read-only.** Extraction reads code; enforcement reports a pass/fail delta. This skill never edits code to "fix" a violation — that is the lane's job, gated by review.
- Only record a rule when the pattern is genuinely dominant; a single example is not a rule. Never invent a rule the code doesn't already follow.
- The human can veto any inferred rule. A vetoed rule is dropped, not merely ignored.
- Keep identifiers, paths, and package names verbatim in `backticks`.

## Verify
- Plain-language: "The manifest lists real rules your code already follows, and after the change the same rules still hold (or I told you exactly which one slipped)."
- Technical: `rules-manifest.md` exists with ≥1 rule; each rule has a detection method and a before-count; the after-run produced a per-rule delta; `ERROR` new-violation count is `0` for a pass. Emit `{ "delta": "legal" | "drift", "newViolations": [...] }` for the harness.

### Contract
- **Inputs:** `--target <dir>` for `scripts/lib/guidelines.mjs extract|audit|eval`; existing `.refactor-chain/guidelines.json` if present.
- **Outputs:** the guidelines manifest, a ranked gap report (Blocker/Worth-fixing/Optional), and the eval verdict `{pass, total, failing[]}` consumed by the review gate.
- **Failure modes:** no conventions detectable → honest minimal manifest, no invented rules; eval failures → fix-or-exception decision checkpoint; exceptions live in `guideline-exceptions.json`, never implicit.

## Resources
- `references/method.md` — full rule catalog, detection heuristics, dominance thresholds.
- `examples/before-after.md` — worked example (a controller→service→repo layering rule caught mid-refactor).
- `scripts/checklist.mjs` — zero-dep Node script; prints this skill's step checklist as JSON.
- `templates/output.md` — the rules-manifest scaffold this skill fills in.
- `templates/guidelines-manifest.json` — annotated scaffold of `.refactor-chain/guidelines.json` (what extract observes).
- `templates/CODE_GUIDELINES.md` — the human guidelines doc scaffold, filled from the manifest.
- `templates/lint-config-scaffolds.md` — per-family formatter/linter config starters (conform step).

## Chain position
Feeds the plan/lane phases a structural contract; consumed again after do-the-work as an extra verify assertion. Its before/after delta plugs into the harness (`orchestrate.mjs advance --delta legal|drift`). `refactor-code-principles` and the review gate run near the end of every lane; a `drift` result here is surfaced to that gate.
