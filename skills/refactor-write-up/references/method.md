# refactor-write-up — full method: turning a diff into a plain-language change report

The write-up is the human deliverable of the whole chain. Its job is to make a non-engineer
confidently say "I know what changed and my app still works the same," and to give an engineer
a precise appendix. Two layers, always.

## Inputs

| Input | Where it lives | What it gives you |
|---|---|---|
| Before snapshot | `refactor-understand` Project Profile (its `templates/output.md`, often in `.refactor-chain/` or the transcript) | stack, structure, entry points, test setup |
| After state | `<target>/.refactor-chain/state.json` | completed steps, verify deltas, self-heal history, checkpoints |
| Real diff | `git diff --stat` and `git log --oneline <first-checkpoint>..HEAD` | files touched, moves, renames |
| Provenance (optional) | `refactor-audit-trail` log | per-change what/when/why |

Run `node scripts/checklist.mjs --state <dir>` to get a machine summary of the completed steps
to seed the appendix.

## The two layers

### Layer 1 — plain-language narrative (read this first)
- Reading level: a smart non-programmer. No unexplained jargon.
- Lead with the one-sentence answer: *"I reorganized the project and renamed a few things;
  your app behaves exactly as before."*
- Then: **What changed** (3–6 bullets in plain words), **What a user would notice** (usually
  "nothing — that's the point"), **What's safer/cleaner now**, **What I checked** (behavior
  preserved, how).
- Be honest: if a step needed a second attempt (self-heal) or a decision is still open, say it.

### Layer 2 — technical appendix (for the developer)
- Per-step table: step skill, what it did, files touched, verify delta (`legal`/`clean`/`drift→healed`).
- File moves & renames (old path → new path).
- Checkpoints (labels/SHAs) for rollback.
- The exact behavior-preservation evidence: which baseline, matching pass-set per step.

## Per-lane jargon → English

| Lane term | Say instead |
|---|---|
| "extracted a DAO / data-access layer" | "put all the database code in one place" |
| "removed a cross-layer reference" | "stopped two parts of the code from reaching into each other in a way they shouldn't" |
| "introduced design tokens" | "replaced scattered one-off colors/sizes with a small shared set" |
| "enforced dependency injection" | "made components get their tools handed to them instead of building their own" |
| "renamed for API-naming convention" | "gave functions/endpoints clearer, consistent names" |
| "SOLID pass" | "tidied the code so each piece has one clear job" |
| "behavior-preserving refactor" | "the app does the same thing — only the code's shape changed" |

## The behavior-preservation promise

Only make it if the verify records support it. Read each completed step's `verify.delta`:
- `legal` / `clean` on every step → "Every step re-ran your tests and got the same result."
- any `drift` that was rolled back and re-done → say "one step changed behavior, I caught it,
  rolled it back, and redid it correctly."
- steps with `verify.ran === false` → "not fully verified — <which step>." Never paper over this.

## What to omit
- The raw unified diff (link it / reference `git diff`, don't paste it into layer 1).
- Internal harness mechanics (state cursors, retry counters) — those belong in the audit trail.
- Anything you're guessing. If you can't source a claim from the snapshot/state/diff, drop it.

## Output
Fill `templates/output.md`. The plain-language half must stand alone if the reader stops there.
