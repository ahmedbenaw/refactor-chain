# refactor-plan-gate — full method

## Why a gate, not a suggestion

Multi-edit work fails in a characteristic way: the third edit reveals an assumption
the first edit baked in, and now three files are half-changed with no record of what
"done" was supposed to look like. The plan gate converts that failure mode into a
line item: the assumption goes into **Unknowns** before any edit exists, and it gets
resolved by reading, not by editing.

The gate is deliberately cheap. Four sections, each a few lines. If writing the plan
takes longer than ten minutes — or the step list runs past ~7 steps — the task is too big for one chain: decompose it and gate each part, rather than writing a longer plan.

## The four-part mini-plan rubric

### 1. Goal — one sentence
- Names the outcome, not the activity. "All service classes reachable through
  interfaces" — not "refactor the services".
- If the goal needs two sentences, it is two chains.

### 2. Unknowns — each with a resolution path
- An unknown is anything that could invalidate the chosen approach: hidden callers,
  reflective access, generated code, an unclear test surface, environment drift.
- Format per unknown: *what I don't know* → *how I'll find out* → *when* (usually
  "before step N").
- An unknown without a resolution path is not allowed on the list — it's an excuse,
  not a plan item. Resolution paths are reads, greps, or runs — never "hope".
- Zero unknowns is a red flag on any non-trivial task. Write at least one honest one.

### 3. Success criteria — observable and checkable
- Every criterion must be verifiable by a command or a diff inspection.
- Always include the chain's own invariant: "the recorded baseline pass-set is
  identical after every step" — this ties the plan to `refactor-verify`.
- Good: "no import of `internal/` remains outside the package"; "`orchestrate.mjs
  status` shows N/N done". Bad: "code is more maintainable".

### 4. Step order — mapped onto the chain
- Copy the step list from `state.steps` (via `orchestrate.mjs status`).
- Per step, note anything to front-load ("resolve unknown #2 before this") or watch
  ("this step touches the config loader — check scope").
- Reordering is legal only before `baseline`; after that the harness owns the order.

### 5. Out of scope — the fence the plan draws
List the adjacent things you noticed but will NOT touch — the neighboring bug, the
tempting rename, the dead code. This is not filler: it is the boundary that becomes
`state.steps[cursor].scope` and that `refactor-scope-fence` enforces. A plan without an
explicit out-of-scope line has an undefined fence, and an undefined fence is how a
one-file change becomes a forty-file diff. Each parked item is a candidate for a future
step, recorded now so it is a deliberate decision instead of a surprise in the diff.

## Spec-kit interop — the decision checkpoint

**Trigger:** diagnose reports the `spec-kit` signal. Detection lives in
`~/.claude/skills/refactor-chain/scripts/lib/signals.mjs` — a `.specify/` directory
anywhere in the tree sets `specKit`, which surfaces in `detect`/`init` output under
`signals` (as `spec-kit`) and `conditional.specKit`.

When triggered, pause mid-chat and ask the user to pick a mode. Present both, with a
recommendation. Do not proceed on a silent default.

### Mode 1 — Integrate (work inside the existing spec)
- The project's `spec.md`/`plan.md` **are** the mini-plan. Do not write a parallel
  plan that can drift from them; extract goal/unknowns/criteria/order FROM them into
  `plan.md` with pointers back.
- **Verify** gains a second check: besides the identical pass-set, each step's result
  is checked against the spec's acceptance criteria.
- **Scope** fences to the currently active item in `tasks.md` — that item's paths
  become `state.steps[cursor].scope` (see `refactor-scope-fence`).
- **After the work**, the spec artifacts are updated to match reality (this feeds
  `refactor-artifacts-sync` / the write-up).

### Mode 3 — Adopt (the spec-driven flow becomes the plan phase)
- Run the spec-driven workflow (specify → plan → tasks) as this chain's plan phase.
- The generated tasks map **1:1 onto chain steps**: each task becomes one step's
  declared intent, and step completion marks the task done.
- Use when the refactor is big enough that the spec is the deliverable's source of
  truth going forward.

### Recommendation heuristic
| Situation | Recommend |
|---|---|
| Specs exist, are current, and the refactor is bounded | **Mode 1 — Integrate** |
| Specs are absent, stale, or contradicted by the code | **Mode 3 — Adopt** |
| Architecture-scale work (lane = backend full chain, cross-module moves) | **Mode 3 — Adopt** |
| Single-lane bounded work under an actively maintained spec | **Mode 1 — Integrate** |

Staleness test: does `spec.md` describe behavior the live code no longer has? One
counterexample found by reading (not memory — see `refactor-live-truth`) is enough to
call it stale.

Record the chosen mode, and one line of why, in the plan's header.

## Recording contract (how the plan enters chain state)

The harness records the mini-plan via `orchestrate.mjs init --plan-note "<one-line plan>"` (stored as `state.planNote`); the full plan text lives in `plan.md`. The contract is:

1. Write the completed plan to `<target>/.refactor-chain/plan.md` (sibling of
   `state.json`, so it survives turns/compaction/restart with the rest of the state).
2. Append a marker to the first step's notes so the plan is visible in `status`
   output. Since notes are normally appended by `advance --note`, and the chain has
   not advanced yet, edit `state.json` directly ONCE here: push the string
   `plan-gate: plan recorded at .refactor-chain/plan.md (mode: <none|1|3>)` onto
   `steps[0].notes`. This is the only sanctioned direct state write in the pipeline.
3. **The lock:** while `plan.md` is absent, do not call `orchestrate.mjs baseline`.
   The harness itself blocks `advance` before a baseline exists (`blocked: "record a
   baseline first"`); this gate extends that chain of custody one link earlier:
   no plan → no baseline → no lane.

## Failure modes this gate catches

- **Goal drift:** halfway through, the work quietly becomes a different task. The
  one-sentence goal makes the drift visible and decidable (repoint or park).
- **Assumption bake-in:** an unresolved unknown shapes edit #1 and poisons the rest.
- **Unfalsifiable done:** without criteria, the chain "finishes" when energy runs
  out. Criteria make done binary.
- **Spec bypass:** a repo with `.specify/` gets refactored in a way that silently
  invalidates its own spec. The checkpoint makes the relationship explicit.
