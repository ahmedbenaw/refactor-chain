# Mini-plan — {{one-line task name}}

> Recorded by `refactor-plan-gate` at `{{ISO timestamp}}` · target: `{{target dir}}`
> Lane: `{{lane}}` · spec-kit mode: {{none | 1 (Integrate) | 3 (Adopt)}}{{" — " + one-line rationale, if a mode was chosen}}

## Goal
{{One sentence. The outcome, not the activity. If it needs two sentences, split the task into two chains.}}

## Unknowns
<!-- Each unknown MUST carry a resolution path (a read/grep/run — never "hope") and a when.
     Zero unknowns on a non-trivial task is a red flag: write at least one honest one. -->
1. {{What I don't know}} → {{how I'll find out}} → {{when — usually "before step N"}}
2. {{…}}

## Success criteria
<!-- Every criterion checkable by a command or a diff inspection. Keep the chain invariant first. -->
- Recorded baseline pass-set is identical after every step (chain invariant).
- {{observable, checkable criterion}}
- {{…}}

## Step order
<!-- Copy from `orchestrate.mjs status` → state.steps. Per step: what to front-load or watch.
     Reordering is legal only BEFORE baseline; after that the harness owns the order. -->
1. `{{skill name of step 1}}` — {{intent in a phrase}}.
   {{Front-load: resolve unknown #N first / Watch: touches X — check scope / nothing}}
   Scope (path prefixes, feeds `state.steps[cursor].scope`): {{`path/prefix/`, …}}
2. `{{step 2}}` — {{…}}
3. {{…}}
{{N}}. `refactor-code-principles` — end-of-lane solidify (skipped in debug lanes).
{{N+1}}. `refactor-review-gate` — final gate over the whole diff.

## Spec-kit bindings {{(delete this section when mode: none)}}
- Spec source: `{{.specify/…/spec.md}}` · Active task item: `{{tasks.md item id}}`
- Mode 1: verify additionally checks these acceptance criteria: {{list, with pointers into spec.md}}
- Mode 3: task → step mapping: {{task id → step #, 1:1}}
- Artifacts to update after the work: {{spec.md / plan.md / tasks.md sections}}
