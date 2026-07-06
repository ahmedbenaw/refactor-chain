---
name: refactor-adversarial-verify
description: "Use this skill before any refactor-chain step is declared done — it flips your role from the work's author to its adversary and tries to refute the \"this step worked\" claim from three angles (wrong assumption, edge case, does it actually run) before `orchestrate.mjs advance --delta legal` may be called. Also runs inside the final review gate over the whole diff. Trigger phrases include \"that step is done\", \"looks good, moving on\", \"I'm confident this works\", \"advance the chain\", or the orchestrator reaching a step's verify point. If the claim does not survive all three attacks, the step is not done — no advance. Phase: verify. Advisory over reasoning, blocking over advancement."
---

# Adversarial Verify — attack your own "done" — refactor-chain · verify

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** verify — runs inside every lane step immediately BEFORE `orchestrate.mjs advance --delta legal`, and again inside the final review gate · **Prerequisite:** the step's edits are complete and `refactor-verify` has a baseline result in hand · **Next:** claim survives → `advance --delta legal`; claim falls → fix or roll back, then re-attack.
**Adaptivity / conditional:** repo-agnostic; the attack angles adapt to what the step claims.

## Purpose
The person who just made a change is the least qualified person to certify it — they
share every assumption the change was built on. This skill forces a role switch: state
the completion claim precisely, then spend a round genuinely trying to destroy it from
three fixed angles — **wrong-assumption** (what did I take on faith?),
**edge-case** (which input/state/timing did I not consider?), and
**does-it-actually-run** (was this executed, or does it merely read correctly?).
Only a claim that survives all three earns `advance --delta legal`. A claim that
falls was a bug caught minutes before it would have been compounded by the next step.

## When to use
- At every step's verify point, after `refactor-verify` has compared pass-sets and
  before anyone calls `orchestrate.mjs advance --delta legal`.
- Inside the review gate (`refactor-review-gate`), against the whole-diff claim
  "this change is complete and behavior-preserving".
- The person says: "done, next", "that should work", "I'm sure this is fine",
  "advance it" — confidence without adversarial pressure is exactly the trigger.
- After a self-heal retry, before re-advancing (a fix made under pressure deserves
  MORE suspicion, not less).

## What I'll tell you (plain-language / ADHD-friendly)
- "Before I mark this step done, I switch sides and try to prove myself wrong three ways. Takes a minute; catches the embarrassing stuff."
- "Attack 1 — my hidden assumption: I assumed nothing constructs this class by name. Checking that against the live repo now, not from memory."
- "Attack 2 found something: an empty list makes the new code skip the write entirely, where the old code wrote a header row. That's real — I'm fixing it and re-running, so we are NOT advancing yet."
- "Attack 3 — I hadn't actually *run* the migration path, only read it. Ran it just now: works. Now it counts."
- "The claim survived all three attacks — marking the step done and moving on. You are here: step 3 of 7 verified. Show technical details?"

## Method
Follow the numbered, revisable reasoning protocol in
`refactor-chain/references/reasoning-protocol.md` — number every claim and attack
(1, 2, 3…), and when an attack lands, revise the earlier numbered claim explicitly
rather than papering over it.

1. **State the claim.** One precise sentence of what "done" means for this step, from
   the step's intent and the plan's success criteria — e.g. "every caller of
   `parseConfig` now goes through `ConfigLoader`, with an identical pass-set."
   A claim you can't state precisely can't be verified at all.
2. **Attack A — wrong-assumption.** List the assumptions the step rests on (what did
   I believe without checking?). For each, verify against the live repo/output — not
   memory, not docs (`refactor-live-truth` is the standing contract here). One broken
   assumption fells the claim.
3. **Attack B — edge-case.** Hunt the inputs and states the happy path ignores:
   empty/null/huge, first/last, concurrent, unicode, the OS/platform in
   `state.platform`, "what if it's called twice". Trace at least the two most
   plausible ones through the actual changed code.
4. **Attack C — does-it-actually-run.** Reading code is not running code. Confirm the
   changed paths were *executed*: the baseline re-run covers them, or run/exercise
   them directly. "It compiles and looks right" fails this attack by definition.
5. **Verdict.**
   - **Survived all three** → record the attack log (use `templates/output.md`),
     then `orchestrate.mjs advance --target <dir> --delta legal --adversarial --note "adversarial-verify: survived 3/3"`.
   - **Any attack landed** → the step is NOT done. Fix (or roll back via checkpoint),
     re-run `refactor-verify`, then re-attack from step 1. If landing repeatedly,
     `orchestrate.mjs fail --reason "<the attack that keeps landing>"` and self-heal.
6. **At the review gate:** same protocol, whole diff, and the claim is the plan's
   success criteria verbatim.

Angle-by-angle attack menus and the survive/fall rules are in `references/method.md`.

The harness enforces this: `orchestrate.mjs advance --delta legal` is REFUSED without the `--adversarial` flag, so a step cannot be marked done until its claim survived the attack.

## Guardrails
- Advisory over reasoning, **blocking over advancement**: no code is edited by this
  skill itself, but `advance --delta legal` without a survived attack log is a
  pipeline violation.
- The attack must be genuine. Attacking straw men ("what if the CPU is on fire") to
  pass the ritual defeats it — each attack names a concrete, checkable failure story.
- Never weaken the claim to survive ("done-ish for the common case"). Fix the work or
  shrink the step honestly through the harness, not the wording.
- An attack that lands is a SUCCESS of the process. Log it without spin.
- Post-self-heal steps get a full re-attack — no credit carried over from the failed
  attempt.

## Verify
- Plain: "I tried to break my own 'done' three ways and couldn't — or I could, and fixed it before moving on. Either way there's a written attack log."
- Technical: the step's attack log exists (claim + three numbered attacks + evidence +
  verdict); `advance --delta legal` was called only after a `survived` verdict; any
  landed attack maps to a fix commit/rollback plus a re-run of `refactor-verify`.

## Resources
- `references/method.md` — attack menus per angle, survive/fall rules, gate wiring.
- `examples/before-after.md` — a false "done" that ships vs. the same step attacked.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the attack-log scaffold (claim, three attacks, verdict).
- `refactor-chain/references/reasoning-protocol.md` — the numbered, revisable
  reasoning protocol this skill follows.

## Chain position
Runs at the tail of every lane step's verify point — after `refactor-safety-net`'s
baseline has been re-run by `refactor-verify`, before `orchestrate.mjs advance` — and
again inside `refactor-review-gate` over the accumulated diff. It is fed by the step's
edits and the plan's success criteria; it feeds the harness's advance/fail decision.
`refactor-code-principles` + the review gate still close out every lane, and both of their
"done" claims pass through this skill too.
