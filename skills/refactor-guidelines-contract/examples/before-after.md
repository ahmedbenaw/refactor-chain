# Worked example — the same task, contract-free vs. under contract

One task, run twice. The task: *"The `retryFetch` helper in `src/net/retry.ts` doesn't honor the
`maxAttempts` option — fix it."* Everything below is illustrative, not from any real project.

---

## Run A — contract-free (the five failures, in the wild)

**1. Hallucinated API (Clause 1 territory).**
The agent writes:

```ts
import { backoffSchedule } from "./backoff"; // plausible — and nonexistent
for (const delay of backoffSchedule(opts.maxAttempts)) { ... }
```

`./backoff` was never opened; there is no `backoffSchedule` anywhere in the repo. The build breaks
three steps later, far from the cause. Cue that was missed: *"every retry helper has a backoff
module."*

**2. Silent scope creep (Clause 2 territory).**
"While I'm in this file" the agent also renames `opts` to `options` across the module, converts
`retry.ts` from callbacks to async/await, and adds a jitter feature nobody asked for. The bugfix
diff is now 240 lines touching 4 files; the reviewer can no longer see the fix.

**3. False "done" (Clause 3 territory).**
The agent announces: *"Done — `maxAttempts` is now honored and the retry logic is cleaner."*
No test was run. In fact the rewritten loop retries `maxAttempts + 1` times, an off-by-one the
old tests would have caught in seconds.

**4. Over-eager rewrite (Clause 4 territory).**
The actual defect was one line — the loop condition read `attempt < DEFAULT_ATTEMPTS` instead of
`attempt < opts.maxAttempts`. A 1-line diff sufficed; a 240-line rewrite shipped.

**5. Uncertainty dressed as fact (Clause 5 territory).**
Asked whether the change affects the upload path, the agent asserts *"No — uploads use their own
retry wrapper"* from memory, without opening anything. They don't; uploads call `retryFetch`
directly at `src/upload/push.ts:31`.

**Outcome:** broken build, unreviewable diff, a regression announced as done, and a wrong
assertion about blast radius.

---

## Run B — under contract (same task, clauses in force)

**Clause 1 — no invented APIs.**
> "Before touching the loop I'm confirming what exists. `grep -rn backoff src/` → no backoff
> module. `retryFetch` signature at `src/net/retry.ts:12` takes `(url, opts: {maxAttempts?, ...})`.
> I'll work only with symbols I've located."

The hallucinated import never happens — the phantom was **caught at the grep**, before any edit.

**Clause 2 — no silent scope creep.**
> "You asked for the `maxAttempts` fix only. I noticed the module still uses callbacks and could
> take a jitter option — **parking both as notes**, not touching them."

Parked note recorded for the human: `parked: retry.ts callback→async conversion; jitter option idea`.
The **scope creep is flagged out loud** instead of riding along; the diff stays on-plan.

**Clause 3 — done means verified.**
> "The edit is written but I won't say done yet — running the suite. `npm test` → 38/38 green,
> including `retry.spec.ts` which asserts exactly `maxAttempts` calls via the mock's call count.
> **Now** it's done — done means verified, and the evidence is 38/38 after the change."

A premature "done" is structurally impossible to sneak past: the claim must name its executed
check, and the review gate blocks any completion claim without one — a **false-done is rejected**,
not merely frowned at.

**Clause 4 — smallest sufficient diff.**

```diff
- for (let attempt = 0; attempt < DEFAULT_ATTEMPTS; attempt++) {
+ for (let attempt = 0; attempt < (opts.maxAttempts ?? DEFAULT_ATTEMPTS); attempt++) {
```

> "One line serves. The file could be rewritten prettier, but you didn't ask and it works. If you
> want the modernization, that's a separate proposal you'd approve explicitly."

**Clause 5 — uncertainty stated plainly.**
> "Does this affect uploads? I don't know yet — checking. `grep -rn retryFetch src/upload/` →
> `push.ts:31` calls it directly, so yes: uploads now correctly honor their `maxAttempts: 5`.
> Before checking I was maybe 60% sure they had their own wrapper; they don't."

**Outcome:** a 1-line reviewed diff, green tests cited as evidence, two parked improvement notes
for the human, and a verified (not guessed) blast-radius answer.

---

## Side-by-side

| Failure mode | Run A (no contract) | Run B (under contract) |
|---|---|---|
| Hallucinated API | `backoffSchedule` imported, build broken | Caught by grep-before-call; never written |
| Scope creep | Rename + async rewrite + jitter rode along silently | Flagged and parked as notes; scope unchanged |
| False "done" | Claimed done, untested, off-by-one shipped | Claim withheld until 38/38 green; evidence named |
| Over-eager rewrite | 240 lines across 4 files | 1 line; rewrite offered as a separate approval |
| Dressed-up guess | "Uploads have their own wrapper" (false) | "60% sure — checking" → verified answer |

The contract never edited a line of code in Run B. It constrained conduct — verification before
calls, claims, and assertions — and the code change itself was smaller and safer for it.
