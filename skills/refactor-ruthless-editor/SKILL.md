---
name: refactor-ruthless-editor
description: "Use this skill when any prose the refactor-chain pipeline emits — the final write-up, shipping artifacts, PR bodies, reports, retro summaries — needs its cutting pass before it goes out. Trigger phrases include \"tighten the write-up\", \"this report is too long\", \"cut the fluff\", \"edit the PR body\", \"make it shorter without losing anything\", or the orchestrator reaching the docs phase with a draft in hand. This is the docs phase of the refactor-chain pipeline. It edits prose ONLY — never code, never config, never text the user asked to preserve. Target is roughly 30% shorter with zero information loss, and every cut is logged."
---

# Ruthless Prose Edit — refactor-chain · docs

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** docs · **Prerequisite:** a drafted document (usually from `refactor-write-up` or `refactor-artifacts-sync`) · **Next:** ship.
**Adaptivity / conditional:** repo-agnostic. Applies to every prose deliverable the chain produces; skipped only when there is no prose to edit.

## Purpose
Every document the pipeline writes gets one deliberate cutting pass before it ships. The rule is
simple: every sentence earns its place, or it goes. The target is about 30% shorter with **zero
information loss** — every fact, number, path, caveat, and decision survives; only the padding
dies. Code blocks, identifiers, and anything the user asked to keep verbatim are untouchable.

## When to use
- The write-up, PR body, report, or retro is drafted and about to ship.
- Someone says "tighten this", "too wordy", "cut it down", "edit the PR body".
- The orchestrator enters the docs phase with any prose artifact in state.
- Any pipeline output longer than a paragraph that a human will actually read.

## What I'll tell you (plain-language / ADHD-friendly)
- "Your write-up is drafted — now I'll do the cutting pass. Same facts, fewer words. Nothing you said to keep gets touched."
- "Before I cut anything, I list every fact the draft contains. After cutting, I check the list again — if a fact went missing, the cut is reverted."
- "Done: 412 words down to 279 (32% shorter). Every number, path, and caveat is still there — here's the edit log if you want to see exactly what went."
- "This sentence resisted cutting because it carries a caveat — it stays."
- "I never edit your code or anything you marked as keep-verbatim. Say 'show technical details' for the full before/after diff."

## Method
1. **Scope the text.** Collect the prose deliverables from this run (write-up, artifacts, PR body,
   reports). Exclude code blocks, fenced snippets, `identifiers`, quoted user text, and anything
   flagged keep-verbatim in state notes.
2. **Inventory before cutting.** Extract the draft's fact list: every claim, number, file path,
   decision, caveat, and instruction. This list is the loss detector.
3. **Cut in passes** (full rules in `references/method.md`): throat-clearing openers, hedges that
   assert nothing, points made twice, adjectives doing no work, passive detours, summary sentences
   that restate the heading. One pass per category beats one heroic rewrite.
4. **Measure.** Run `node scripts/checklist.mjs --measure <before> <after>` for word counts and the
   reduction percentage. ~30% is the target, not a quota — stop when further cuts would cost meaning.
5. **Verify zero loss.** Re-walk the fact inventory against the edited text. Any missing fact means
   the responsible cut is reverted, not the fact paraphrased from memory.
6. **Log it.** Fill `templates/output.md`: before/after stats plus the edit log — what was cut,
   why, and the facts confirmation.

## Guardrails
- **Advisory-only toward code: it never edits code, config, tests, or data — prose deliverables only.**
- Text the user asked to preserve is verbatim-sacred, even if it is wordy.
- Zero information loss is a hard rule: a cut that removes a fact, number, caveat, or step is a bug.
- 30% is a target, not a mandate — a tight draft may only shed 10%; never pad cuts to hit a number.
- Never "improve" meaning while cutting. Editing changes length, not claims.

## Verify
- Plain: "The document says everything it said before, in noticeably fewer words, and I can show you what went."
- Technical: `--measure` reports the reduction; the fact inventory maps 1:1 onto the edited text;
  no code block, identifier, or keep-verbatim span differs from the draft; the edit log in
  `templates/output.md` accounts for every removed sentence.

## Resources
- `references/method.md` — the full cutting rules, pass order, and the fact-inventory discipline.
- `examples/before-after.md` — a worked edit: 180-word PR body → 118 words, zero loss, with log.
- `scripts/checklist.mjs` — step checklist as JSON; `--measure <before> <after>` for reduction stats.
- `templates/output.md` — the before/after edit-log scaffold.

## Chain position
Runs in the **docs** phase, after `refactor-write-up` and `refactor-artifacts-sync` have produced
their drafts and before `refactor-ship` sends anything out — the last pass any prose gets. It
consumes drafted documents from chain state and feeds the ship phase leaner versions of the same
documents. It never touches the code the chain refactored; `refactor-code-principles` and the review
gate own that lane.
