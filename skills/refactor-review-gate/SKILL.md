---
name: refactor-review-gate
description: "Use this skill at the very end of a refactor to run the read-only ship gate — it aggregates the correctness, security, and performance review of the whole accumulated diff into ONE calm, ranked \"here are the N things worth your attention, most important first\" report. Trigger phrases include \"is this ready to ship\", \"do a final review\", \"review the whole change\", \"run the ship gate\", \"give me the go/no-go\". This is the review-phase GATE of the refactor-chain pipeline — the harness appends it as a kind:\"gate\" step at the end of every lane, and the Stop hook blocks \"done\" until it passes. It coordinates refactor-security, refactor-performance, and refactor-red-team, then de-dupes and ranks everything into one list. Read-only: it reviews and reports, it never edits code."
---

# The Ship Review Gate — refactor-chain · review

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** review (the gate) · **Prerequisite:** the lane finished and `refactor-code-principles` ran; a baseline is green (`refactor-safety-net` / `refactor-verify`) · **Next:** docs → ship (only once the gate passes).
**Adaptivity / conditional:** repo-agnostic, read-only, always-runs. The harness appends it as the final `kind:"gate"` step of every lane; the Stop hook blocks the "done" narrative until it passes.

## Purpose
This is the last checkpoint before a refactor is called done. It reads the **whole accumulated diff** (every lane step, plus the `refactor-code-principles` consolidation) and answers one question in plain words: *is this safe to ship, and if not, what are the few things to fix first?* It does this by coordinating the three specialist reviewers already in the bundle — `refactor-security` (is it safe?), `refactor-performance` (did it get slower?), and `refactor-red-team` (did behavior actually stay the same?) — plus a correctness read of its own. Then it does the job none of them can do alone: it **de-dupes, ranks, and calms** their findings into a single ordered list, "here are the N things worth your attention, most important first." It changes no code. Its output is a go / fix-these-first / no-go decision the human (or the harness) acts on.

## When to use
- A refactor lane just finished and it's time to decide whether to ship. Triggers: "is this ready to ship", "final review", "go/no-go", "run the ship gate".
- The harness reached the `gate` phase — `orchestrate.mjs status` shows the current step is `refactor-review-gate`. Run this; the Stop hook will not let the run be declared done until the gate passes.
- Someone wants the whole change reviewed at once instead of file-by-file. Triggers: "review the whole diff", "look at everything we changed".
- Precondition: there is a diff (`git diff` against the lane's base) and a green baseline exists. With no diff, say so and pass trivially.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm doing the final read of everything we changed. I'm not touching your code — just reviewing it and telling you what's worth your attention."
- "Here's the whole picture in one list: 4 things worth a look. The first one is the only must-fix; the rest are your call."
- "Most important, do this first: `parseOrder()` in `orders.ts:88` can now return `undefined` where it used to throw — a caller might not expect that. That's the one thing I'd fix before shipping."
- "Everything else is minor: two naming nits and one 'slightly slower but fine' loop. I'll show them if you want, or we can ship."
- "I pulled in the security, performance, and behavior-preservation checks and merged them — no duplicates, ranked by how much they actually matter."
- "Bottom line: this is a **go** once you fix item 1, or a clean **go** as-is if you decide item 1 is acceptable. Say 'show technical details' for the CWE/benchmark/test behind any item."

## Method
1. **Confirm the gate is warranted.** Read harness state (`orchestrate.mjs status`): the lane steps are done, `refactor-code-principles` ran, the baseline is green. Get the accumulated diff (`git diff --stat` and `git diff` against the lane base). No diff → pass trivially and say so. Never edit — read-only.
2. **Coordinate the three specialist reviewers.** Invoke each and collect its ranked findings: `refactor-security` (OWASP/secrets lens), `refactor-performance` (regressions the refactor introduced), `refactor-red-team` (adversarial "behavior preserved?" attack). If a reviewer already ran this chain, consume its report from `templates/output.md` rather than re-running. See `references/method.md` for the coordination contract.
3. **Add the correctness read.** Do your own pass for the bugs the specialists don't own: logic errors, changed error/return contracts, off-by-one, resource leaks introduced by a move, silent `null`/`undefined` drift, ordering changes. Absorbs the `code-review` correctness lens.
4. **Aggregate and de-dupe.** Merge all four sources into one finding set. Collapse duplicates (a secret flagged by security and by correctness is one item). Keep the strongest severity and the clearest fix per merged item.
5. **Rank into ONE calm list.** Order by *impact first, then confidence*. Assign each item **Blocker** (must fix before ship), **Worth-fixing**, or **Optional**. Cap the headline list at the few that truly matter; fold the long tail into an appendix. Keep the tone calm — no wall of red.
6. **Run the guidelines gate (default mandatory, HARNESS-ENFORCED).** Run `node <plugin>/scripts/orchestrate.mjs gate-check --target <project>` — this executes the eval AND records the verdict in state; the harness then **refuses to advance out of the review gate** until the verdict is PASS (100%) or every failing check is a recorded exception. Evaluate conformance against the project's extracted guidelines:
   `node <plugin>/scripts/lib/guidelines.mjs eval --target <project>`. The chain cannot complete below **100% PASS**: any failing check is either fixed now (a new checkpointed step) or explicitly accepted by the user at a decision checkpoint as a documented exception (recorded in `guideline-exceptions.json`, state notes, and the write-up). Unresolved failures are **Blockers** in the ranked list — nothing slips silently.
7. **Emit the go/no-go.** Fill `templates/output.md`: the decision (go / fix-these-first / no-go), the ranked list most-important-first, per-item what/why/where/fix/confidence, and the appendix. Blockers make it a no-go until fixed and pause the chain for a human. Hand off — do not fix.

## Guardrails
- The guidelines eval is not skippable; a below-100% result without a recorded exception is always a no-go.
- **Read-only. This gate edits nothing.** It reviews, ranks, and decides; the human or a separate clearly-labeled change acts on it.
- **One calm ranked list, not four reports.** The whole point is aggregation. Never dump four separate reviewer outputs — merge, de-dupe, rank, and lead with the single most important thing.
- **Impact before confidence, but never hide uncertainty.** Rank by how much it matters; state a confidence on every item; "I couldn't be sure from reading" is honest and allowed.
- **Behavior-preservation is the load-bearing check.** A refactor's core promise is "same behavior." A credible red-team finding that behavior changed is a Blocker by default.
- **Don't re-litigate the lane.** Review the diff as-shipped; note out-of-scope whole-repo issues as context, don't block the gate on them.

## Verify
- Plain-language: "There's one list, ordered most-important-first. Each item says what, why, where, and the fix. It ends with a clear go or no-go. Nothing in your code changed."
- Technical: `templates/output.md` is populated with a single ranked finding set; every item has `file:line`, a severity (Blocker/Worth-fixing/Optional), a confidence, and a source tag (security/perf/red-team/correctness); duplicates are collapsed; the three specialist reviewers were invoked or their reports consumed; `scripts/checklist.mjs` ran and each gate item is pass/finding/n-a; the decision is stated; no working-tree edits are attributable to this gate.

## Resources
- `references/method.md` — the reviewer-coordination contract, the correctness catalogue, the de-dupe and ranking rubric, and the go/no-go decision rules.
- `examples/before-after.md` — a worked gate run: four raw reviewer outputs merged into one ranked go/no-go list.
- `scripts/checklist.mjs` — zero-dep Node script that prints the review-gate checklist as JSON.
- `templates/output.md` — the single-ranked-list go/no-go report scaffold the gate fills in.

## Chain position
Runs as the final `kind:"gate"` step the orchestrator appends to **every** lane (backend / web / ui / code), immediately after `refactor-code-principles`. It consumes the reports of `refactor-security`, `refactor-performance`, and `refactor-red-team` (invoking any that haven't run), merges them with its own correctness read, and emits one go/no-go. The Stop hook (`ship-gate.mjs`) blocks the "done" narrative until this gate passes; only then does the chain move to docs → ship. On a Blocker it stays a no-go and pauses for the human.
