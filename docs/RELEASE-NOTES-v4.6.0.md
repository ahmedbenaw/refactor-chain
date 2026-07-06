# refactor-chain v4.6.0

The Review Board: a native, portable multi-agent review capability — and the story of it
catching nine real bugs in its own code the first time it was pointed at itself.

## Added — `/refactor-board`

Convene a panel of named engineer personas to review a codebase from several independent
angles at once, keeping only what survives an adversary. A deterministic Node conductor picks
the role-lenses (architecture, harness, correctness, security, docs-truth), binds each to a
veteran whose grumpy, zero-BS profile is an **enforced rubric** — every finding anchored to
`file:line`, tagged CONFIRMED or SUSPECTED, over-flagging penalized. Each lens is a **Lead**
(finder) plus a **Coordinator** (adversarial verifier); a finding counts only if the
Coordinator can't refute it. The prompts are emitted **as data**, so the identical reviewer
runs on Claude Code, Cowork, and Codex — the personality and standards don't vary by host.

The board reuses what already exists — the review gate's dedupe/rank/decide logic (now
extracted into a shared library so the two can't drift), the discipline pack's
adversarial-verify as the Coordinator mechanism, and the guidelines gate over any fix a board
run proposes. It adds a capability; it reinvents nothing.

## The dogfood

Pointed at its own ~600 lines of new code, the board raised nine real defects — two of which
defeated its own "REFUTED is dropped" promise (a whitespace-padded verdict and a string-typed
index both let refuted findings survive), and one of which was the exact unguarded-`JSON.parse`
crash class fixed elsewhere in 4.5.0 but missed on the new reader. Every one is fixed with a
regression that fails without the fix. That is the point of the capability, proven on the
author's own work.

## Known limitation

`board.json` reads/writes are not atomic — two `orchestrate` processes running a board on the
same project simultaneously could clobber a round. This mirrors the pre-existing `state.json`
behavior and isn't board-specific; single-session use is unaffected. A future pass may make all
harness writes atomic.

Full gate green: 9 suites, audit clean, doctor ok.

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
