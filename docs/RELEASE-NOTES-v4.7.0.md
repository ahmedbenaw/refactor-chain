# refactor-chain v4.7.0

The Conductor. The method that produced the v4.6.6 hardening wave was run by hand: a chain-of-skills
per task, spec-kit commands per phase, and a multi-pass adversarial review until nothing new turned
up. This release ports that method natively, generalizes it to the whole plugin, makes it async by
construction, and proves it does not regress any existing behavior.

## The Conductor
Given any task, the Conductor resolves the chain-of-skills (internal skills plus external installed
ones), maps the spec-kit (SDD) commands for the phase, and runs the generalized review loop. It is
both an always-on layer inside every run and a standalone `/refactor-orchestrate` command. Four new
engines carry it, all synchronous, deterministic, and zero-dependency:

- **skill-registry** assigns skills by capability, with a total tie-break and open-set discovery that
  matches a skill the catalog never listed by reading its own description.
- **spec-kit** maps the four real pipeline phases plus the prose phases onto the eight SDD commands,
  and gates auto-run behind mode and the `.specify` signal.
- **conductor** composes those two plus the standard spine, then partitions the work into what the
  host runs in parallel versus in order. It never mutates the run's steps.
- **review-loop** keeps the review going until a round adds nothing new, with a floor of at least
  three passes for a review-class target and a budget ceiling, then shapes a SPEC and a sprint plan
  from the findings.

## Durability and safety
- **The concurrency blocker is fixed.** Recording a review lens was a read-modify-write on
  `board.json` that could silently drop a finding under parallel records. Each lens now writes its own
  round file, so parallel records never lose data. Old boards still aggregate.
- Records preserve unknown fields; every engine's command-line entry is space-safe and no longer
  crashes when invoked without a script path.
- The stop gate now also blocks a premature "done" while a review loop is still running, and session
  start surfaces a paused loop so it resumes cleanly.

## Async, by construction
The engines stay synchronous and deterministic. All parallelism is the host dispatching the emitted
plan, so the same run reproduces byte-for-byte and a Codex-style runtime executes it sequentially
without a code change. A test asserts no engine contains fan-out primitives.

## Non-regression and migration
A run that does not invoke the Conductor produces byte-identical state transitions to v4.6.6. The
change is additive: `board.json` keeps its version, state stays schema v3, and the loop metadata plus
per-lens files are optional with safe defaults. A run in flight when v4.7.0 installs resumes cleanly;
`reset` clears a run if you want a clean slate, and history is kept.

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
