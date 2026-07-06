---
name: refactor-write-up
description: "Use this skill at the end of a refactor-chain run to produce the plain-language \"here's what changed\" report — a human-readable narrative of what the whole chain did, diffed against the project snapshot captured at the start (by refactor-understand). It answers \"what actually changed, and does my app still work the same?\" in language a non-engineer can follow, then offers a technical appendix for developers. Trigger phrases: \"summarize what you changed\", \"write up the refactor\", \"what did this whole thing do\", \"give me the change report\", \"explain the diff in plain English\". This is the docs phase of the refactor-chain pipeline; it runs after the review gate and before ship. Advisory — it writes a report, it does not touch code."
---

# Change Write-Up — refactor-chain · docs

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** docs · **Prerequisite:** the lane + review gate are done (all steps verified) · **Next:** refactor-artifacts-sync / refactor-publish-checklist / refactor-ship.
**Adaptivity / conditional:** repo-agnostic and advisory — always safe to run; produces a document, never edits code.

## Purpose
When a refactor chain finishes, the person who asked for it wants one thing: a straight answer to "what did you change, and is my app still going to work the same?" This skill writes that answer. It reads the **before** picture (the Project Profile snapshot `refactor-understand` captured at the start) and the **after** picture (the chain's step records, the git diff, the verify results), then produces a calm, plain-language change report — what moved, what got renamed, what got safer, and the explicit promise that behavior was preserved — with a collapsible technical appendix for the developer who wants file-level detail.

## When to use
- The chain has reached the docs phase: every lane step and the review gate are `done`.
- Someone asks "what did you actually change?", "give me the summary", "explain this in plain English".
- Right before shipping, so the PR / handoff has a human-readable narrative attached.
- Advisory-only — safe to run any time after work exists; it just reports.

## What I'll tell you (plain-language / ADHD-friendly)
- "Here's the short version: I reorganized the project's folders and renamed a few things for clarity. Your app does exactly what it did before — I checked after every step."
- "Three things changed that you'd notice as a developer, and zero things changed that a user would notice. That's the goal of a refactor."
- "You are here: this is the write-up (the second-to-last thing). After this I can sync the docs and open the pull request."
- "I kept a plain-English list AND a file-by-file technical list — say 'show technical details' for the deep version."
- "Nothing here is a decision you have to make — it's just me telling you what happened."

## Method
1. **Load the before snapshot.** Read the Project Profile written by `refactor-understand` (its `templates/output.md` output, typically stashed in `.refactor-chain/` or the conversation). This is the "before" baseline: stack, structure, entry points, test setup.
2. **Load the after state.** Read `state.json` (the completed steps, their verify deltas, checkpoints) and the actual `git diff --stat` / `git log` since the chain's first checkpoint. Optionally read the audit trail (`refactor-audit-trail`) if present for precise change provenance.
3. **Diff before → after** at the level a human cares about: what got reorganized, renamed, extracted, or hardened; which files moved; what got safer. Do NOT dump the raw diff — translate it.
4. **Write the two layers.** A plain-language narrative first (what changed, why it's the same behavior, what a user would/wouldn't notice), then a technical appendix (per-step summary, file moves, verify results, checkpoints).
5. **State the behavior-preservation promise explicitly**, backed by the verify record: "every step re-ran the baseline and matched." If any step needed self-heal, say so honestly.
6. Fill `templates/output.md` into the Change Report. See `references/method.md` for the plain-language rules (reading level, what to include/omit, how to translate each lane's jargon).

## Guardrails
- **Advisory only. Writes a report; never edits code, never ships.**
- Tell the truth: if a step drifted and was rolled back, or a decision is still pending, the report says so — no rosy summaries.
- Plain-language layer must avoid jargon (no "DAO", "cross-layer reference", "token scale") unless immediately defined; jargon lives in the technical appendix.
- Never claim behavior was preserved unless the verify records actually show matching pass-sets. If verification was incomplete, say "not fully verified".

## Verify
- Plain: "Someone who didn't watch the work can read the first half and correctly say what changed and that their app still works the same."
- Technical: the report's before/after fields are populated from the real Project Profile and `state.json`/`git diff` (no `TODO`); every completed step appears in the technical appendix; the behavior-preservation claim cites the verify deltas.

## Resources
- `references/method.md` — plain-language writing rules, the before/after diffing recipe, and per-lane jargon-to-English translations.
- `examples/before-after.md` — worked example: a finished web-lane chain → its Change Report.
- `scripts/checklist.mjs` — prints this skill's steps as JSON.
- `templates/output.md` — the Change Report scaffold (plain-language narrative + technical appendix).

## Chain position
Runs in the **docs** phase, after the review gate closes the lane. It consumes the `refactor-understand` snapshot (before) and the completed `state.json` + git diff (after). Its report feeds `refactor-artifacts-sync` (durable docs), `refactor-audit-trail` (evidence), and `refactor-publish-checklist` / `refactor-ship` (the handoff).
