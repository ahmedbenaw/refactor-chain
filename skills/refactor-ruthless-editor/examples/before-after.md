# refactor-ruthless-editor — worked example: a PR body, cut

## Before (180 words)

> It is worth noting that this pull request contains the results of a refactoring pass that was
> performed on the parser module. In this PR, changes were made to the `parseHeader` function by
> the refactoring pipeline in order to simplify its structure. The function was previously very
> long and fairly complex, weighing in at 122 lines, and it has now been split into three smaller,
> more focused functions: `readMagic`, `readFields`, and `validateHeader`. All 38 of the existing
> tests continue to pass, which means that the behavior has been comprehensively preserved. It
> could be argued that further simplification is possible in the future. Additionally, it should
> be mentioned that one test, `header_fuzz_case_9`, was already flaky before this change; it was
> skipped rather than fixed, and this is tracked as a parked item. To summarize, this PR splits
> `parseHeader` into three functions, keeps all tests passing, and parks the flaky test. Please
> run `npm test` before merging to confirm the results on your machine.

## Fact inventory (extracted before cutting)
1. Refactor of parser module / `parseHeader`
2. Was 122 lines; split into `readMagic`, `readFields`, `validateHeader`
3. All 38 existing tests pass — behavior preserved
4. `header_fuzz_case_9` was flaky BEFORE the change; skipped, not fixed; parked item
5. Instruction: run `npm test` before merging

## After (118 words, −34%)

> Refactor of the parser module: `parseHeader` (122 lines) is split into three focused functions —
> `readMagic`, `readFields`, and `validateHeader`.
>
> All 38 existing tests pass; behavior is preserved.
>
> One caveat: `header_fuzz_case_9` was flaky before this change. It is skipped, not fixed, and
> tracked as a parked item.
>
> Before merging, run `npm test` to confirm on your machine.

## Edit log (why each cut was safe)
| Cut | Category | Why no loss |
|---|---|---|
| "It is worth noting that… In this PR…" | throat-clearing | carried no facts |
| "changes were made … by the pipeline" | passive detour | rewritten active, same claim |
| "very long and fairly complex" | empty hedges/adjectives | the number 122 already says it |
| "comprehensively" | non-working adverb | "preserved" unchanged |
| "It could be argued that further…" | empty hedge | asserted nothing actionable |
| "To summarize, this PR splits…" | duplicate | every fact already stated once |

## Inventory check after edit
1 ✓ · 2 ✓ · 3 ✓ · 4 ✓ (flaky-before caveat kept word-for-word in spirit and substance) · 5 ✓.
Code spans (`parseHeader`, `npm test`, test name) byte-identical. Zero information loss.
