---
name: refactor-assessment-map
description: "Use this skill to build a map of where the technical debt actually lives before planning a refactor — a dependency/coupling/hotspot map of the current code so the chain knows what's tangled, what everything imports, and which files change most and hurt most. Trigger phrases: \"where's the worst debt\", \"map the dependencies\", \"what's coupled to what\", \"which files are the risky ones\", \"show me the hotspots\", \"what should we refactor first\". This runs in the understand/diagnose phase of the refactor-chain pipeline, after refactor-understand and alongside refactor-diagnose; it feeds the plan phase an evidence-ranked target list. Read-only and advisory — it never edits code."
---

# Map the Debt — refactor-chain · understand/diagnose

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** understand/diagnose · **Prerequisite:** refactor-understand · **Next:** feeds refactor-diagnose + plan.
**Adaptivity / conditional:** repo-agnostic; depth scales with repo size — advisory-only.

## Purpose
A refactor is only as good as knowing *where* to point it. This skill reads the
code (never runs or edits it) and builds three overlapping views: a **dependency
graph** (what imports what), a **coupling assessment** (which modules are tangled
together / where the cycles are), and a **hotspot ranking** (files that are both
large/complex *and* change often — the places where debt actually costs you). The
result is an evidence-ranked "start here" list handed to the diagnostic engine and
the plan phase, so effort lands on the highest-pain, highest-leverage code first.

## When to use
- After `refactor-understand`, before the plan phase commits to an order of work.
- Someone asks "where's the worst debt", "what's coupled to what", "which files
  are risky", "what should we refactor first", "map this out".
- Any large/unfamiliar codebase where "just start somewhere" would waste effort.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm drawing a map of how the code connects — reading only, changing nothing."
- "Three files do most of the heavy lifting and everything leans on them:
  `orders.ts`, `auth.ts`, `db.ts`. Those are your hotspots."
- "There's a tangle: `orders` and `inventory` import each other in a loop — that
  circular dependency makes both hard to change safely."
- "Good news — the `reports/` folder is almost standalone, so it's low-risk to
  refactor first as a warm-up."
- "Here's the ranked list of where I'd start (1 of 3 shown). Want the full map or
  just the top targets?"

## Method
1. Start from the Project Profile + raw signals
   (`node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs signals --target <dir>`)
   to know the language, source roots, and framework.
2. **Dependency graph:** parse import/require/use statements per source file to build
   a directed graph of module → module edges. Record fan-in (how many depend on a
   file) and fan-out (how many it depends on).
3. **Coupling assessment:** find cycles (circular deps), god modules (very high
   fan-in *and* fan-out), and afferent/efferent instability per package.
4. **Hotspot ranking:** combine size/complexity (LOC, nesting/branch density) with
   churn if git history is available (`git log --format= --name-only | sort | uniq -c`).
   A hotspot = high complexity × high churn × high fan-in.
5. Rank targets: `risk = coupling × complexity × blast-radius`. Note quick wins
   (low-coupling leaf modules) as safe warm-ups.
6. Fill `templates/output.md` (the Assessment Map) and hand the ranked target list
   to `refactor-diagnose` / the plan phase. See `references/method.md` for the
   metric definitions and parsing rules per language.

## Guardrails
- **Read-only. Advisory only.** Never edits, never runs the app, never installs.
  Static parsing of imports and file stats only.
- Never claim a refactor order the evidence doesn't support — rank by measured
  fan-in/churn/complexity, not vibes.
- Skip generated/vendored trees (`node_modules`, `dist`, `build`, `target`,
  `vendor`, `Pods`, `.git`) — same exclusions the harness walker uses.
- If git history is absent, degrade to complexity + coupling only and say so.

## Verify
- Plain: "I can name the top 3 places debt concentrates and say why each is risky,
  and I've flagged at least one safe warm-up."
- Technical: the map lists concrete edges, at least the top-N files by fan-in, any
  detected cycles, and a ranked target table — every entry backed by a counted
  metric (fan-in, LOC, churn), not an assertion.

## Resources
- `references/method.md` — metric definitions, per-language import-parsing rules, hotspot formula.
- `examples/before-after.md` — worked example: tangled repo → ranked Assessment Map.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the Assessment Map scaffold this skill fills in.

## Chain position
Runs in the **understand/diagnose** band after `refactor-understand`. Its ranked
target list sharpens `refactor-diagnose`'s classification and gives the **plan**
phase an evidence-based order of work. Pairs with `refactor-legacy-assess` (which
adds anti-pattern/readiness gates). `refactor-code-principles` + the review gate run
near the end of every lane.
