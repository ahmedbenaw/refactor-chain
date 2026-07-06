# refactor-adversarial-verify — full method

## The role switch

Author-mode optimizes for "make it work"; every blind spot the change was built on is
invisible from inside it. Attacker-mode optimizes for "make it fail". The skill's only
mechanism is forcing the switch at the exact moment confidence peaks — right when
"done" is about to be declared — and refusing the declaration until the attacker has
had a full turn.

Run the whole exercise under the numbered protocol in
`refactor-chain/references/reasoning-protocol.md`: claims and attacks get numbers,
and a landed attack revises the numbered claim it hit — visibly, not silently.

## Stating the claim

The claim is the contract the attacks test. Rules:

- One sentence, present tense, falsifiable. It names WHAT is now true, not what was
  done ("all callers resolve through the interface" — not "I refactored the callers").
- It inherits the step's intent from the plan (`.refactor-chain/plan.md`) and always
  carries the chain invariant: "…with a pass-set identical to baseline."
- If the claim can't be stated in one falsifiable sentence, the step was too vague to
  verify — shrink the step (through the harness), then verify the smaller claim.

## Attack A — wrong-assumption

Ask: *what did I take on faith while making this change?* Typical assumption classes:

- **Caller completeness** — "I found all the callers." Attack: grep for the symbol as
  a STRING too (reflection, config, templates, docs, serialized names).
- **Environment sameness** — "it behaves the same on the target platform/OS as in my
  head." Attack: check `state.platform`/`state.os` and any platform-conditional code.
- **Docs/memory truth** — "the README/my recollection of this API is right." Attack:
  read the live source (`refactor-live-truth` is the standing contract — recall, then
  verify against the repo before asserting).
- **Framework behavior** — "the ORM/router/DI container will still wire this up."
  Attack: find the actual registration/convention and confirm the new names satisfy it.
- **Test surface** — "the baseline exercises this path." Attack: check that at least
  one baseline test actually reaches the changed lines.

One verified-broken assumption = attack lands.

## Attack B — edge-case

Ask: *which input, state, or timing did the happy path ignore?* The menu:

- **Cardinality:** empty, single, exactly-two, huge; first and last elements.
- **Value shape:** null/undefined/None, zero, negative, unicode/emoji, whitespace,
  maximum lengths, malformed but parseable.
- **State:** already-initialized, called twice, partially-migrated data, stale cache.
- **Timing:** concurrent access, reentrancy, ordering between the changed pieces.
- **Refactor-specific:** old-name residue (imports, string refs, configs), behavior at
  the seam where extracted code meets its old host, default-parameter drift.

Pick the two most *plausible* for this step (not the two easiest) and trace them
through the changed code line by line — or better, execute them. A traced divergence
from pre-step behavior = attack lands.

## Attack C — does-it-actually-run

Ask: *what evidence exists that the changed code EXECUTED, not just parsed?*

- Green baseline re-run (from `refactor-verify`) counts ONLY for lines the baseline
  actually reaches. Changed-but-unreached lines have zero execution evidence.
- Acceptable evidence: a baseline test that covers the path; a direct run (script,
  REPL, curl, app launch) exercising it; a compile step that provably evaluates it
  (types, not just syntax) *plus* one runtime touch.
- Explicitly NOT evidence: "it compiles", "the diff looks correct", "the pattern is
  the same as the other five call sites", "the linter passed".

No execution evidence for a changed path = attack lands (the fix is usually: run it,
or add a characterization test that runs it).

## Attack D — the requirements themselves (before the answer to them)
A flawless implementation of a broken requirement is still broken, so attack the ask
before the work. Read the step's requirement (the ticket, the spec/acceptance criteria,
or — in a spec-kit run — the active `tasks.md` item) as a hostile lawyer: do any two
rules contradict each other? Does a stated absolute ("always", "never", "only") get
revoked by another clause? Does the requested interface conflict with the requested
behavior? A contradiction you resolved silently is a decision you made for someone else
without telling them — surface it, state your resolution, and invite the correction. An
unresolved requirement contradiction = attack lands (the fix is a checkpoint to the
user, not a guess). In Integrate/Co-author spec-kit modes this attack also runs the diff
against the spec's acceptance criteria; a criterion violation lands the attack and blocks
the `--adversarial` pass.

## Survive / fall rules

- **Survive** requires all four attacks (A–D) attempted in earnest, each with named
  evidence (a command run, a file read, a trace) — an empty attack ("couldn't think
  of anything") must say what was searched before coming up empty.
- **Fall** on any one landed attack. Consequence chain:
  1. Do not call `advance --delta legal`.
  2. If the landed attack shows behavior drift → treat exactly as `refactor-verify`
     drift: roll back the step (checkpoint), `advance --delta drift` to get the
     harness's refusal on record, then `fail --reason "<attack that landed>"`.
  3. If it shows incomplete work (missed caller, unrun path) → fix within the step's
     scope, re-run `refactor-verify`, then RE-ATTACK from the claim (all three angles
     again — fixes invalidate the previous attack log).
- Three consecutive falls on the same step → the harness's retry budget takes over
  (`fail` → `blocked`); surface to the user rather than grinding.

## Gate wiring (harness contract)

- Per step: `refactor-verify` produces the pass-set comparison → this skill attacks
  the claim → only a `survived` verdict authorizes
  `orchestrate.mjs advance --target <dir> --delta legal --note "adversarial-verify: survived 3/3"`.
- The attack log is appended to the step record via that `--note` (short form) and
  kept in full in the write-up material (`templates/output.md` per step).
- Review gate: `refactor-review-gate` re-states the plan's success criteria as the
  claim and runs the same three attacks over the whole diff. The gate's own sign-off
  is illegal without it.

## Calibration: honest attacks vs. theater

The failure mode of any self-review ritual is theater — three token attacks that were
never meant to land. Tells, and the antidote:

- Tell: every attack log in a chain says "survived 3/3" with no landed attack ever.
  Real distributions have hits. Antidote: each attack must name the concrete artifact
  it checked (file:line, command + output), so an empty attack is auditable.
- Tell: attacks phrased as questions never answered ("could this be null? probably
  not"). Antidote: every attack ends in evidence or a landed verdict — no "probably".
- Tell: the same three generic attacks on every step. Antidote: attacks must reference
  the step's specific claim and diff.
