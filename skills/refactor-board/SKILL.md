---
name: refactor-board
description: "Use this skill when the user wants a deep, adversarial, multi-perspective review of a codebase — trigger phrases include \"review everything\", \"audit this codebase\", \"find everything wrong\", \"grumpy review\", \"convene the board\", \"panel review\", \"tear this apart\". It convenes the Review Board: a panel of named engineer personas (Lattner as authority; Appel/Newell/Carmack as finders; Sutskever/LeCun/Karpathy as adversarial verifiers) bound to functional role-lenses (architecture, harness, correctness, security, docs-truth). Each finding is produced by a Lead and must survive a Coordinator's refutation before it counts. Read-only review by default; it is a review capability, not a lane. Portable across Claude Code / Cowork / Codex."
---

# The Review Board — refactor-chain · review (cross-lane)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** review (standalone or before the ship gate) · **Prerequisite:** none (works on any repo) · **Next:** route survivors into fix→verify→gate, or emit the report.
**Adaptivity / conditional:** repo-agnostic; lens set adapts to the detected stack.

## Purpose
Convene a panel of grumpy, zero-BS engineer personas to review a codebase from several
independent angles at once, then keep only what survives an adversary. The board is the
formalized, reusable version of a rigorous multi-auditor sweep: a deterministic Node
conductor picks the lenses and writes the exact reviewer prompts; you (the host) dispatch
them as real subagents; every finding a Lead raises is attacked by a Coordinator before it
lands; the survivors are deduped, ranked, and handed back as one calm go / fix-these-first /
no-go decision. Nothing is taken on vibes — each finding is anchored to `file:line` and
tagged CONFIRMED or SUSPECTED.

## When to use
- "Review everything", "audit the whole codebase", "find everything that's wrong / outdated / broken".
- Before a big ship, or after a large change, when one reviewer isn't enough.
- When the user explicitly wants the grumpy veteran panel / adversarial verification.
- NOT for a normal single-lane refactor (use `/refactor`) or a quick pre-ship check (use `/check`).

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm convening a review board — five angles, each with a reviewer and a skeptic who tries to prove them wrong. I'll only report what survives."
- "Round 1 is planned: architecture, harness, correctness, security, and docs-truth. Dispatching the reviewers now."
- "The security reviewer flagged one thing; the skeptic couldn't break it, so it stands. Two other flags were refuted and dropped."
- "Here's the board's verdict: 3 things worth your attention, most important first, and one clear 'do this first'."
- "This was read-only. Want me to fix the top item through the safe pipeline, or just leave you the list?"

## Method
Run the deterministic loop; the conductor lives at `${DIR}/lib/board.mjs` and state persists
in `.refactor-chain/board.json` (resumable across compaction). `DIR="$HOME/.claude/skills/refactor-chain/scripts"`.

1. **Plan.** `node "$DIR/orchestrate.mjs" board-plan --target <dir> [--lenses a,b] [--seed N]`. It returns the panel and, per lens, a ready-to-use **finder prompt** (persona + mandatory rubric + output contract already baked in — use it verbatim).
2. **Dispatch finders.** For each lens, spawn a subagent with that lens's `finderPrompt`. On Claude Code, dispatch them **in parallel** (one `Agent` call each, same message). On a runtime without parallel subagents (Codex), run them **sequentially**. Each finder returns a JSON array of findings.
3. **Adversarially verify.** For each lens's findings, get the coordinator prompts: pipe the findings to `node "$DIR/lib/board.mjs" verify-prompt --lens <lens> --lenses <all,lenses> --seed <N>`. Spawn a subagent per finding with its verifier prompt — its job is to **refute**. Each returns `{verdict: CONFIRMED|SUSPECTED|REFUTED, note}`.
4. **Record.** For each lens, pipe `{lens, findings, verdicts}` to `node "$DIR/orchestrate.mjs" board-record --target <dir>` (JSON on stdin). Check progress any time with `board-status`.
5. **Aggregate.** `node "$DIR/orchestrate.mjs" board-aggregate --target <dir>`. It drops every REFUTED finding, dedupes by `file:line`+cause, ranks by impact-then-confidence, and emits the decision. This reuses the exact review-gate synthesis (`lib/panel-aggregate.mjs`) — the board and the gate never disagree.
6. **Present & route.** Show the ranked ledger calmly, most-important-first, with the single "do this first". Then ask: fix the survivors through the normal checkpoint→apply→verify→gate pipeline, or just hand over the list. **Never auto-fix from a review.**

See `references/method.md` for the persona rubric, the portability adapter table, and the full protocol.

## Guardrails
- **Read-only by default.** The board reviews; it does not edit. Any fix that follows goes through the safe pipeline (baseline → verify → adversarial-verify → guidelines gate), never straight from a finding.
- **No finding without `file:line`.** A finding that can't be anchored is dropped, not softened.
- **Over-flagging is failure.** Report only real defects; a clean lens says CLEAN. The adversarial pass exists to kill plausible-but-wrong findings.
- **Deterministic.** Same target + lenses + seed reproduce the same panel and prompts (no `Math.random`).

## Verify
- `board-status` shows recorded vs pending lenses and, after aggregation, the decision — use it to resume after a compaction.
- Plain: "the board reviewed from N angles, verified each finding against the code, and agreed on one ranked list."
- Technical: `.refactor-chain/board.json` holds the round (lenses, findings, verdicts, ledger); the ledger decision is `go` / `fix-these-first` / `no-go`.

## Resources
- `references/method.md` — persona rubric, dispatch protocol, portability adapter table.
- `examples/before-after.md` — a worked board run (the enforcement-hole sweep).
- `scripts/checklist.mjs` — prints the board step checklist as JSON.
- `templates/output.md` — the board report scaffold.

## Chain position
Standalone review, or convened before `refactor-review-gate` for a heavyweight pre-ship pass.
It shares the finding-synthesis core (`lib/panel-aggregate.mjs`) with the review gate; its
survivors feed the normal fix→verify→gate pipeline. `refactor-adversarial-verify` is the
mechanism behind the Coordinator role.
