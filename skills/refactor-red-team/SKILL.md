---
name: refactor-red-team
description: "Use this skill to adversarially verify a refactor's core promise — \"behavior was preserved.\" It extracts the load-bearing \"this rename/extraction/move kept behavior the same\" claims from the diff, attacks the ones most likely to be wrong, ranks them by impact × likelihood × cheapness-to-test, and emits the single cheapest test that would catch each broken claim. Trigger phrases include \"did this actually keep behavior the same\", \"prove the refactor is safe\", \"attack this change\", \"what could this have broken\", \"red-team the diff\", \"I don't trust this rename\". This is a review-phase skill in the refactor-chain pipeline; refactor-review-gate calls it and folds its findings into the final ranked report, where a credible \"behavior changed\" is a Blocker. Read-only and adversarial — it hunts for broken promises and writes the cheapest failing test, it does not edit product code."
---

# Red-Team the "Behavior Preserved" Claim — refactor-chain · review

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** review · **Prerequisite:** do-the-work produced a diff; a green baseline exists (`refactor-safety-net`) · **Next:** the review gate (`refactor-review-gate`) folds these findings into the go/no-go.
**Adaptivity / conditional:** repo-agnostic, adversarial, read-only for product code (it may add tests). Always relevant when a refactor claims behavior preservation.

## Purpose
Every refactor makes one load-bearing promise: *"I moved / renamed / split this, and the behavior is exactly the same."* This skill assumes that promise is **a claim to be attacked, not a fact to be trusted.** It reads the diff, extracts the specific behavior-preservation claims it depends on ("callers of the renamed method still resolve", "the extracted function returns the same thing on every path", "the new loop iterates in the same order"), then goes hunting for the ones most likely to be false. It ranks candidate breakages by **impact × likelihood × cheapness-to-test**, and for the top ones it writes the **single cheapest test** that would fail if the claim is broken. It is the adversary the refactorer needs: it doesn't take "it compiles" or "looks fine" as proof.

## When to use
- A refactor is done and you want to genuinely stress-test that behavior held. Triggers: "did this keep behavior the same", "prove it's safe", "attack this change".
- A rename, extraction, or move touched code with many callers or subtle contracts. Triggers: "red-team this rename", "I don't trust this extraction".
- The review gate asks for the behavior-preservation verdict (this skill supplies it).
- Precondition: a diff and a green baseline. Without a baseline, say so — you can still attack claims by reading, but you can't run the cheapest tests to green.

## What I'll tell you (plain-language / ADHD-friendly)
- "A refactor's whole promise is 'same behavior.' My job is to try to prove that promise wrong — the friendly adversary. I won't change your product code; I might add a small test."
- "I pulled out 6 places where this change is quietly assuming behavior stayed the same. I'm attacking the 3 most likely to be broken."
- "Here's the scariest one: the extracted `parseLine()` returns `undefined` on a bad line, but the old code threw. If any caller was relying on the throw, this changed behavior. I wrote a 4-line test — it fails right now."
- "This one I attacked and it held: the rename resolved everywhere, callers still pass. Good — one less thing to worry about."
- "I rank by 'how bad if it's broken' × 'how likely it's broken' × 'how cheap to test' — so we spend effort where it actually pays."
- "Want the depth? Say 'show technical details' for each claim, the attack, and the exact test."

## Method
1. **Get the diff and the baseline.** `git diff` against the lane base; confirm the baseline is green (`refactor-verify` / `orchestrate.mjs status`). No baseline → attack by reading only, and flag that tests can't be run to green.
2. **Extract the load-bearing claims.** For each hunk, name the *implicit* behavior-preservation claim it depends on — the thing that must be true for "same behavior" to hold. See `references/method.md` for the claim catalogue (rename-resolves, extraction-equivalent, order-preserved, error-contract-same, side-effect-same, boundary-value-same, concurrency-same).
3. **Attack the claims — assume each is false and look for the counterexample.** For each claim, ask: what input, caller, path, or ordering would make the "before" and "after" differ? Read callers, edge inputs, error paths, empty/null cases. Absorbs the adversarial stance of red-team-prd, aimed at refactor claims instead of PRD assumptions.
4. **Rank by impact × likelihood × cheapness-to-test.** Score each attacked claim: *impact* (how bad if behavior really changed), *likelihood* (how plausible the counterexample), *cheapness* (how few lines to pin it). Sort; spend effort top-down.
5. **Emit the cheapest test per surviving suspicion.** For each high-rank claim, write the **single smallest test** that pins the pre-refactor behavior and would fail if the claim is broken. Run it against the current code: a **fail** is a caught behavior change (a Blocker); a **pass** is earned assurance.
6. **Report ranked verdicts.** Fill `templates/output.md`: each claim, the attack, the verdict (held / BROKEN / unprovable), the cheapest test and its result, ranked most-dangerous-first. Hand to the review gate. Do not edit product code.

## Guardrails
- **Adversarial by mandate.** The default posture is "this is broken until I fail to break it." "It compiles" and "it looks the same" are not proof.
- **Read-only for product code.** It may *add* the cheapest tests (clearly labeled, in the test tree); it never edits the code under refactor. Fixing a caught break is a separate, labeled change.
- **Cheapest test wins.** A characterization test that pins one behavior in four lines beats a sprawling suite. Do not gold-plate coverage; pin the specific claim.
- **Pin behavior including quirks.** The baseline is the source of truth. If the old code had a bug, the test pins the bug — a refactor is not license to "fix" it silently.
- **Honest verdicts.** "held", "BROKEN", and "couldn't prove either way" are all valid. Never assert preservation you didn't test or reason to.

## Verify
- Plain-language: "Each place this change assumed behavior stayed the same is listed, attacked, and given a verdict, ranked scariest-first. The broken ones have a small test that fails right now. Your product code is untouched."
- Technical: `templates/output.md` lists every extracted claim with `file:line`, the attack, a verdict (held/BROKEN/unprovable), an impact×likelihood×cheapness rank, and — for high-rank claims — the cheapest test path and its pass/fail; broken claims are tagged Blocker for the gate; any added tests live in the test tree and no product-code edits are attributable to this skill; `scripts/checklist.mjs` ran.

## Resources
- `references/method.md` — the claim catalogue, the attack playbook per claim type, the impact×likelihood×cheapness scoring rubric, and cheapest-test patterns.
- `examples/before-after.md` — a worked red-team: a rename+extraction diff, the claims extracted, the attacks, and the one test that caught the real break.
- `scripts/checklist.mjs` — zero-dep Node script that prints the red-team checklist as JSON.
- `templates/output.md` — the ranked claim/attack/verdict/test report scaffold.

## Chain position
Runs in the **review** phase after do-the-work, on the accumulated diff. `refactor-review-gate` invokes it (or consumes its report) and folds its verdicts into the single ranked go/no-go — where a credible **BROKEN** claim is a **Blocker** by default, because behavior preservation is the refactor's core promise. It complements `refactor-security` (safe?) and `refactor-performance` (slower?); this skill owns *"same behavior?"*.
