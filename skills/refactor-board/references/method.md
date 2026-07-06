# The Review Board — full method

The board turns a rigorous multi-auditor sweep into a repeatable, deterministic, portable
capability. It is the formalized version of "dispatch several independent reviewers, verify
each finding adversarially, then synthesize one ranked verdict." This document is the
exhaustive "how" behind `SKILL.md`.

`DIR="$HOME/.claude/skills/refactor-chain/scripts"` (or `${CLAUDE_PLUGIN_ROOT}/scripts`).

---

## 0. The split: deterministic conductor vs. host dispatch

A Node script cannot spawn subagents — only the host LLM can. So the work is split:

- **The conductor** (`lib/board.mjs`, driven through `orchestrate.mjs board-*`) is deterministic
  and never calls a model. It selects lenses, assigns personas, **emits the exact reviewer
  prompts** (persona + rubric + output contract as data), persists rounds, and aggregates.
- **The host** (you, following this skill) does the one thing a script can't: **dispatch** the
  emitted prompts as real subagents using whatever primitive the runtime has.

Because the prompts are data the conductor produces, the identical grumpy reviewer appears on
every runtime — the personality and standards do not vary by host.

---

## 1. The personas and the mandatory rubric

The named veterans are bound to functional lenses ("functions with names") — not costume.
Roster (`lib/personas.mjs`):

- **Authority:** Chris Lattner — compiler-grade correctness; oversees every lens.
- **Leads (finders):** Andrew Appel (types/correctness/boundaries), John Carmack (systems/tooling/harness), Gabe Newell (product/shipping honesty).
- **Coordinators (adversarial verifiers):** Ilya Sutskever, Yann LeCun, Andrej Karpathy.

Every role carries the **mandatory behavioral rubric**, translated from vibe into enforceable
output constraints (a personality prompt that can't be graded is worthless):

- Grumpy, Dutch-blunt, zero-BS voice; high sense of justice, truth, integrity.
- **Every finding anchored to an exact `file:line`.** No line, no finding.
- **Tag CONFIRMED** (traced/ran, certain) **or SUSPECTED** (plausible, needs a look). Never state SUSPECTED as fact.
- **No vague smells.** Concrete defect + concrete fix, or it doesn't count.
- **Over-flagging is failure.** Report only defects that change correctness/behavior/security/truth. A clean slice says CLEAN.
- **Zero shortcuts:** no duct-tape, no masking, no "good enough". A fix that hides the problem is worse than none.
- **Never fabricate** repo contents, APIs, or analysis. If you can't verify, say so and say what you'd need.

The Coordinator gets one extra mandate: **REFUTE, don't agree.** Default to REFUTED unless the
evidence is undeniable; a finding survives only if the adversary cannot break it.

---

## 2. Assignment (deterministic)

`assignPanel(lensIds, seed)` binds a Lead by fit (`preferLead`) and rotates the Coordinator by
`(lensIndex + seed) mod 3`, so the pairing is reproducible for a given seed and every veteran
participates across a full panel. Never `Math.random` — a board run must reproduce exactly.

Default lens → Lead:
`architecture`→Appel · `harness`→Carmack · `correctness`→Appel · `security`→Carmack · `docs-truth`→Newell.
Coordinators rotate across all five.

---

## 3. The dispatch protocol (step by step)

1. **Plan:** `node "$DIR/orchestrate.mjs" board-plan --target <dir> [--lenses a,b] [--seed N]`
   → `{round, plan:{lensIds, lenses:[{lens, focus, lead, coordinator, finderPrompt}]}}`.
2. **Finders:** for each lens, spawn a subagent with `finderPrompt` **verbatim**. Parallel where
   the runtime allows (see §4). Collect each finder's JSON array of findings.
3. **Verifier prompts:** `echo '<findings JSON>' | node "$DIR/lib/board.mjs" verify-prompt --lens <lens> --lenses <all,lenses> --seed <N>`
   → `[{finding, prompt}]`. Pass the SAME `--lenses` and `--seed` as the plan so the coordinator
   identity matches.
4. **Verify:** spawn a subagent per finding with its verifier prompt. Each returns
   `{verdict: CONFIRMED|SUSPECTED|REFUTED, note}`.
5. **Record:** `echo '{"lens":"<lens>","findings":[...],"verdicts":[{"i":0,"verdict":"..."}]}' | node "$DIR/orchestrate.mjs" board-record --target <dir>`.
   (`verdicts[i]` indexes into `findings`.) Repeat per lens.
6. **Aggregate:** `node "$DIR/orchestrate.mjs" board-aggregate --target <dir>` → drops REFUTED,
   dedupes by `file:line`+cause, ranks impact-then-confidence, emits `{decision, list, appendix}`.
7. **Present & route** (§5).

Resume any time with `board-status` — it reports recorded vs pending lenses and whether the
round is aggregated, so a compaction mid-run is harmless.

---

## 4. Portability adapter (per runtime)

| Runtime | Finder dispatch | Verify dispatch | State / resume | Notes |
|---|---|---|---|---|
| **Claude Code / Cowork** | parallel `Agent` calls (one per lens, same message) | parallel `Agent` per finding | `board.json` on disk | full experience |
| **Codex** | sequential (no parallel primitive) — run lenses one at a time | sequential per finding | `board.json` on disk | same prompts, slower |
| **claude.ai** | single-pass; may inline lenses as sections of one review | inline self-refutation | none (no filesystem) | degrades gracefully; no persisted round |
| **Editors (via `npx skills add`)** | the editor's agent primitive | same | `board.json` if local FS | depends on the agent |

The skill markdown and the conductor are identical everywhere; only the dispatch verb differs.

---

## 5. Synthesis and routing

- `board-aggregate` reuses `lib/panel-aggregate.mjs` — the same dedupe/rank/decide the review
  gate uses, so board and gate never disagree.
- **Severity** normalizes onto Blocker / Worth-fixing / Optional. A `behaviorChanged` finding
  sorts to the top of its tier (behavior-preservation is privileged).
- **Decision:** `go` (no blockers) · `fix-these-first` (blockers, all confident + fixable) ·
  `no-go` (a blocker is low-confidence or has no clear fix — needs a human).
- **Present** calmly: lead with the one "do this first", state the count, surface the CLEAN
  assurances too, push Optional nits to an appendix.
- **Route:** offer to fix survivors through the normal checkpoint→apply→verify→gate pipeline.
  **Never auto-fix from a review**, and never let a board-proposed fix skip the guidelines gate.

---

## 6. Relationship to the rest of the bundle

- `refactor-adversarial-verify` is the mechanism behind the Coordinator role — the board applies
  it per finding, at panel scale.
- `refactor-review-gate` is the lighter, always-on gate at the end of a lane; the board is the
  heavyweight, on-demand panel. They share the synthesis core.
- `refactor-scope-fence` and the guidelines gate still govern any fix that follows a board run.
