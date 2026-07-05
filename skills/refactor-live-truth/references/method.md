# refactor-live-truth — full method

## The one rule

A system fact may only drive an action after it has been confirmed against a live
witness in the current session. "Drive an action" means: an edit, a plan line, a step
scope, a verify verdict, or advice the user will act on.

## The source-of-truth ladder (higher outranks lower)

1. **Command output, run now** — test runs, `ls`, `grep`, build output, the app itself.
2. **The live config / lockfile** — what the machine will actually read at runtime.
3. **The live code** — the implementation as it exists on disk right now.
4. **Machine-generated artifacts** — schemas, types, generated docs (stale-able, dated).
5. **Comments in code** — near the code but not executed; drift silently.
6. **README / docs / wiki / CHANGELOG** — prose about the system; stale by default.
7. **Memory / recollection** — yours or the chain's (`sessions.jsonl`, boot banner);
   a hint about where to look, never a fact.

When two levels disagree, the higher level wins, and the lower level becomes a
**parked item** ("README claims X, code does Y — stale doc") for the write-up.

## Claim taxonomy + verification recipes

| Claim type | Example claim | Live witness |
| --- | --- | --- |
| Default / setting | "the port defaults to 8080" | read the config file or the code that sets the default |
| Location | "tests live in `test/`" | `ls` / glob the directory tree now |
| Usage / wiring | "nothing imports this module" | grep imports/references across the repo now |
| Behavior | "the CLI prints JSON with `--json`" | run it (or the relevant test) and read output |
| Version / dependency | "we're on React 17" | lockfile / manifest, not the README badge |
| State of the chain | "the run was paused at step 3" | `orchestrate.mjs status` / `state.json`, not the memory note |
| Environment | "CI runs on Node 18" | the workflow/action file as it exists now |

## Recency rule

A verification is valid only while nothing could have changed its answer. Concretely:

- Re-check after any edit that touches the checked file or its neighborhood.
- A check from a previous session is never valid — that is exactly what memory is.
- When in doubt, checking again costs seconds; acting on a stale check costs a rollback.

## Memory recall protocol (session scale)

The chain persists notes between sessions (`.refactor-chain/memory/sessions.jsonl`,
injected by the boot hook). Every recalled fact follows the same rule:

1. Treat the note as a **pointer**: it tells you *where to look*, not *what is true*.
2. Verify against the live source: paused run → `state.json`; last outcome →
   `history.jsonl`; parked item → the current code at that location.
3. If the live source contradicts the note, the note is stale — act on the live
   source and say so plainly ("memory said X; the repo says Y; going with Y").

## Divergence handling

- **Repo wins. Always.** No exceptions, including "but the docs are newer-looking".
- The stale artifact (README, comment, memory note) is flagged as a parked item in
  the step notes — the scope-fence discipline forbids silently fixing it mid-step.
- If the divergence invalidates the current plan (the plan assumed the doc was right),
  stop and update the plan note before continuing — plans bend, code doesn't break.

## What this skill does NOT mean

- It does not mean docs are useless — they are excellent *hypotheses* and great for
  intent ("what was this supposed to do"). Intent claims don't need verification;
  behavior claims do.
- It does not mean re-verifying trivia nobody will act on. The gate is *load-bearing*:
  if being wrong about it would change an edit or a verdict, verify it.
- It does not license paranoia loops — one named witness per claim is enough.

## Output contract

Each load-bearing claim gets one line in the claim-verification log
(`templates/output.md`): the claim, its original source (ladder level), the witness
checked (file+line or command+output), the verdict (confirmed / stale / partly true),
and — for stale ones — the parked-item flag.
