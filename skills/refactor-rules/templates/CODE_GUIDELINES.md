# Code guidelines — <project>

> Generated scaffold from the observed conventions in `.refactor-chain/guidelines.json`.
> Rule of thumb: these describe what the codebase ALREADY does consistently — the point is
> to make the incumbent convention explicit and enforced, not to import someone else's taste.

## Formatting
- Indentation: `<observed>` · Quotes: `<observed>` · Semicolons: `<observed>` · Max line: `<observed>`
- Enforced by: `<formatter config path — create one if the "enforced by config" check fails>`

## Naming
- Files: `<observed>` · Identifiers: `<observed>` · Constants: `<observed>`
- Exceptions worth keeping (framework conventions win): `<list or none>`

## Structure
- Layout: `<layered / feature folders / …>` — new code goes `<where>`.
- Tests live: `<colocated | tests/>` — every behavior change lands with a test.

## Error handling
- Errors are `<thrown / returned / logged-and-rethrown>` — never silently swallowed.
- User-facing failures get a plain message; internal ones keep the stack.

## The gate
`node <plugin>/scripts/lib/guidelines.mjs eval --target .` must report 100% PASS before a
chain completes. Accepted exceptions are recorded in `.refactor-chain/guideline-exceptions.json`
with a reason — nothing is waived silently.
