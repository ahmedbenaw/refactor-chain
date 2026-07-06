---
name: refactor-improve
description: "Use this skill at the very end of a refactor-chain run for the improvement retro — it reads the project's own run history (.refactor-chain/history.jsonl), surfaces recurring failure reasons and patterns across past runs, and proposes exactly ONE concrete improvement for next time, feeding the per-repo confidence prior the diagnostic harness already uses. Trigger phrases: \"what can we do better next time\", \"run the retro\", \"self-improvement\", \"why does this keep failing\", \"learn from this run\", \"improve the chain for this repo\", \"update the pipeline\". This is the improve phase of the refactor-chain pipeline; it runs after ship, closing the loop. Advisory — it reflects and recommends; it never edits product code, and it only proposes plugin/config changes for the human to approve."
---

# Self-improvement Improve — refactor-chain · improve

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** improve · **Prerequisite:** at least one recorded run (this one) in `history.jsonl` · **Next:** none — this closes the loop.
**Adaptivity / conditional:** repo-agnostic and advisory. It learns per-repo from `history.jsonl` and strengthens the confidence prior the harness already reads; it proposes one improvement and never changes code.

## Purpose
A pipeline that never reflects can't get better. At the end of a run, this skill does the self-improvement
retro: it reads this project's accumulated run history — every past chain's lane, confidence,
per-step attempts, self-heals, and outcome — finds the patterns that keep recurring (a step that
always needs two attempts here, a lane that's often misclassified, a fail reason that shows up
again and again), and proposes **exactly one** concrete, high-leverage improvement for next time.
It also confirms the run's outcome is recorded so the harness's per-repo confidence prior gets
stronger. One improvement, not twenty — self-improvement is small, steady, and actually adopted.

## When to use
- The run has shipped (or been parked) and you want the "what did we learn?" pass.
- Someone says "run the retro", "self-improvement", "what can we do better", "why does this keep failing here?".
- The orchestrator reaches the improve phase after ship.
- Any time you want to review this repo's refactor-chain track record and pick one thing to sharpen.

## What I'll tell you (plain-language / ADHD-friendly)
- "The work is done — now a quick look-back so next time goes smoother. I'm only reading history and suggesting one thing; I won't change anything."
- "Across your last 5 runs, the `web-03-components` step needed a second attempt 4 times. That's a pattern, not bad luck."
- "My one suggestion: add a characterization test for the component-tier split before that step runs, so it doesn't drift. Want me to note that for next time?"
- "Good news too — the web lane is now high-confidence for this repo (5 clean runs), so the chain will stop second-guessing it."
- "Just one improvement on purpose. Piling on ten changes is how retros get ignored. Say 'show technical details' for the full history breakdown."
- "You corrected me twice this run — 'keep the barrel exports' and 'this is a web repo'. I've turned both into proposals for next time; nothing changes unless you approve them."

## Method
1. **Read the history.** Load `<target>/.refactor-chain/history.jsonl` (append-only retros written
   by the harness on each `reset`). Run `node scripts/checklist.mjs --history <target>` to parse and
   summarize it. Each line has `{lane, case, confidence, clarified, steps:[{skill,attempts,healed,status}], outcome, at}`.
2. **Confirm this run is recorded.** Ensure the just-finished run appended its retro. If not
   (e.g. `reset` hasn't run), record it before analyzing, so history is complete.
3. **Find the recurring patterns:** steps that repeatedly needed >1 attempt or self-heal; lanes
   often clarified/misdiagnosed (low confidence, or corrected); fail reasons that recur across runs;
   lanes with a clean streak (candidates to trust more).
4. **Pick ONE improvement.** Rank candidates by leverage (how often it bites × how cheap the fix)
   and propose the single highest-leverage one — e.g. "add a pre-step characterization test for X",
   "raise the confidence prior for lane Y", "the plan should checkpoint before step Z". Resist listing more.
5. **Strengthen the prior (already automatic).** Confirm the harness's `historyPrior` will read the
   updated history (confirmed `outcome:"done"` runs nudge that lane's confidence up next time).
   Optionally note a `/update`-style plugin-refresh if the improvement is a chain/config change.
6. **Corrections capture.** Sweep this run's state notes for user corrections and judgment
   calls recorded mid-run — moments where the human overrode the chain ("no, keep the barrel
   exports", "that lane guess was wrong, this is a web repo", "don't touch generated files") or
   settled an ambiguity the pipeline couldn't. Each becomes a concrete improvement **proposal**
   at retro time: what was corrected, what the chain would do differently next time (a scope
   default, a lane hint, a plan-gate question, a guideline tweak), stated in one sentence and
   offered for the human to approve. **Human-approved only — never auto-applied.** These
   proposals sit alongside (and may become) the one self-improvement improvement in step 4; when a
   correction-derived proposal and a history-derived one compete, the same leverage ranking
   picks the single winner, and the rest are recorded as candidates for future retros.
7. **Automation recommendations (adopted from claude-automation-recommender).** When a pattern in
   step 3 or a correction in step 6 is *mechanizable* — a class of issue a standing automation would
   prevent — surface it as a concrete recommendation the human can accept: a git pre-commit/pre-push
   hook, a CI check (a new `.github/workflows` step or the refactor-chain Action), a formatter/linter
   config, a small script, or a scheduled task. Frame each as "this kept biting → here's the automation
   that ends it", with the exact file to add. **Recommendation only — never installed without approval;**
   nothing that changes standing project configuration is applied silently (same contract as decision
   checkpoints). Recorded in the retro under "Automations worth adding".
8. Fill `templates/output.md` into a Self-improvement Retro (patterns + the one improvement + the
   corrections-capture proposals + automation recommendations + the updated per-repo confidence
   picture). See `references/method.md` for the pattern-detection rules.

## Guardrails
- **Advisory only. Never edits product code.** It reads history and proposes; any plugin/config
  change is offered for the human to approve, not applied.
- **Exactly one improvement.** Self-improvement is one small step. Surfacing multiple patterns is fine;
  recommending multiple changes is not — pick the highest-leverage one.
- Only reason from real history — if there's just one run, say "not enough history for a pattern
  yet" rather than over-fitting a single data point.
- Never inflate the confidence prior manually; let the harness derive it from recorded outcomes.
- Corrections capture is proposal-only: a user correction becomes a written proposal for the
  human to approve at retro — never a silent change to the chain's behavior, config, or plugin.
  Unapproved proposals are kept as candidates, not applied "provisionally".

## Verify
- Plain: "I can name the one thing most worth improving for this repo's next refactor, and it's backed by a pattern across runs — not a hunch from a single run."
- Technical: `history.jsonl` parses; this run's retro is present; the proposed improvement cites the
  recurring pattern (step/lane + count); the confidence-prior effect is stated and matches how
  `diagnose.mjs historyPrior` reads confirmed `done` outcomes; every user correction found in this
  run's state notes appears in the retro as a proposal (or an explicit "not actionable" line), each
  marked approved / declined / deferred by the human — none silently applied.

### Contract
- **Inputs:** the finished run's retro (written by `orchestrate.mjs reset`), `history.jsonl`, corrections captured during the run.
- **Outputs:** one concrete improvement proposal per run, plus any automation recommendations (skill/ruleset/threshold), human-approved only; validated retro appended via `diagnose.mjs learn` (malformed retros rejected).
- **Failure modes:** no history → says so and skips (never invents lessons); rejected proposal → recorded and not re-proposed verbatim.

## Resources
- `references/method.md` — the history schema, pattern-detection rules, and the one-improvement ranking.
- `examples/before-after.md` — worked example: 5 runs of history → the single self-improvement suggestion.
- `scripts/checklist.mjs` — prints this skill's steps as JSON and summarizes `history.jsonl` (`--history`).
- `templates/output.md` — the Self-improvement Retro scaffold.

## Chain position
Runs in the **improve** phase, after `refactor-ship`, closing the loop. It consumes
`.refactor-chain/history.jsonl` (which the harness appends to on `reset`) and feeds the per-repo
confidence prior that `diagnose.mjs` reads on the *next* run — so each refactor makes the next one
a little more sure-footed. Nothing runs after it.
