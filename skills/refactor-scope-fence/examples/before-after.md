# Worked example — the "while I'm here" spiral vs. the fenced run

## Setup

Chain step 3 of 7 (`refactor-web-03-components`), declared scope:
`scope: ["src/components/"]`. Goal: split two oversized components into
container/presentational pairs. Baseline is green.

## Before — no fence discipline

While splitting `UserCard.tsx`, three temptations appear and all three win:

1. `src/api/client.ts` has an obvious unhandled promise rejection — "two-second fix",
   fixed inline.
2. `src/utils/format.ts` has a date helper with a deprecated API — "while I'm here",
   swapped to the new API.
3. The user asks mid-step: "can you also fix the login redirect?" — "sure", done, in
   `src/pages/Login.tsx`.

Result: the step's diff spans 4 unrelated areas. The review gate can't tell which
hunks serve the step's goal. Verify fails — a date-format snapshot test broke — and
the failure is in `format.ts`, nowhere near the step's actual work, so the self-heal
retries the *component* step against a failure it didn't cause. The rollback point is
polluted: undoing the step also undoes the (correct) redirect fix. An hour of triage.

## After — scope fence applied

Same step, same temptations.

1. **Fence stated at step start:** "territory is `src/components/`".
2. **Temptation 1** — the edit to `src/api/client.ts` triggers the guard:
   `⚑ scope-drift: src/api/client.ts is outside this step's declared scope
   (src/components/) — flag it for the write-up instead of expanding the step.`
   Classified **adjacent** → edit reverted, note appended:
   `parked: src/api/client.ts — fetchUser() promise rejection unhandled — silent data-loss on network failure [found during step 3 refactor-web-03-components]`
3. **Temptation 2** — caught before editing (the fence is in working memory now).
   Parked the same way, zero edits made.
4. **User request** — mid-chat checkpoint fires: "The login redirect is outside this
   step's scope. (a) new step with its own scope and verify, or (b) park it? I'd say
   (a) — it's a user-visible bug you want this session." User picks (a); a step 8 is
   appended with `scope: ["src/pages/Login.tsx"]`.
5. **Step-end sweep:** one flag → one revert + one parked note; diff touches only
   `src/components/`; scope ledger filled: 2 parked, 1 promoted to step 8, 0 silent.
6. Verify runs green against a diff that contains exactly what step 3 claimed.

## Why the after wins

- The step's diff is reviewable in one sitting and reverts cleanly.
- The verify signal is honest: a failure would implicate the step's own work.
- Nothing was lost — both parked items reach the write-up (and session memory), and
  the redirect got a *deliberate* step with its own verify instead of a smuggled fix.
