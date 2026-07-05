# The Ship Review Gate — full method

This is the read-only, always-runs gate that closes every refactor-chain lane. It
**aggregates** the specialist reviews plus a correctness read into ONE calm, ranked
go/no-go. It never edits code. This document is the exhaustive "how" behind the
imperative steps in `SKILL.md`.

Absorbs: `code-review:code-review` (correctness + reuse/simplification lens), the
generic `review` pass, and the coordination of `refactor-security`,
`refactor-performance`, `refactor-red-team`.

---

## 0. The gate's one job

Four different lenses will each hand you a pile of findings. Individually they are
noisy, overlapping, and uncalibrated against each other — a "critical" from a perf
tool and a "critical" from a security tool don't mean the same thing. The gate's job
is **synthesis**, not more finding-generation:

1. Collect findings from four sources (security, performance, red-team, correctness).
2. Normalize their severities onto one scale.
3. De-duplicate (the same line flagged twice is one item).
4. Rank by **impact first, then confidence**.
5. Present the *few* that matter, calmly, most-important-first.
6. Emit a single decision: **go**, **fix-these-first**, or **no-go**.

If you produce four sections stapled together, you have failed. The deliverable is
one list and one decision.

---

## 1. Confirm the gate is warranted

Read harness state before doing anything:

```
node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs status --target <dir>
```

Expect: lane steps `done`, `refactor-code-principles` `done`, `baseline: true`, and the
current step is `refactor-review-gate` (kind `gate`). Then capture the accumulated
diff — the whole change the chain produced, not one step:

```
git diff --stat <lane-base>..HEAD        # scope
git diff <lane-base>..HEAD               # the hunks to review
```

- **No diff** → the gate passes trivially. Say "nothing changed; nothing to review."
- **No green baseline** → the behavior-preservation claim is unfounded. Downgrade the
  gate to a warning and flag "no baseline — cannot certify behavior preserved."
- **Read-only always.** The gate observes; it never runs the app destructively and
  never edits.

---

## 2. Coordinate the three specialist reviewers

The specialists already exist in the bundle. The gate is their conductor. For each:

| Reviewer | Question it owns | Consume from |
|---|---|---|
| `refactor-security` | Is the changed code safe? (OWASP, secrets, authz) | `templates/output.md` of that skill, or invoke it |
| `refactor-performance` | Did the refactor make it slower / heavier? | its report, or invoke it |
| `refactor-red-team` | Did behavior actually stay the same? (the core promise) | its report, or invoke it |

**Coordination contract:**
- If a reviewer already ran in this chain (its report exists and post-dates the last
  edit), **consume the report** — do not re-run it. Re-running wastes work and can
  produce drift between the report the user saw and the gate's copy.
- If it has not run, invoke it now against the same accumulated diff.
- Each reviewer returns findings shaped `{ where, class, severity, confidence, fix }`.
  Preserve `where` (`file:line`) and `fix` verbatim; you'll re-rank `severity` onto
  the shared scale in §4.
- A reviewer that reports "clean" contributes a **positive assurance line** ("security:
  no secrets or injection in the diff") — surface it; good news reduces the calm-list
  anxiety and is part of an honest report.

---

## 3. The correctness read (absorbs code-review)

The specialists don't own ordinary correctness. Do your own pass for the bugs a
*move* or *rename* can introduce even when security and perf are fine:

- **Changed contracts:** a function that used to `throw` now returns `null`/`undefined`;
  a return type widened; an exception type changed. Callers may not expect it.
- **Silent value drift:** `null` vs `undefined`, `0` vs absent, precision/rounding,
  string vs number after a move, timezone/`Date` handling.
- **Ordering & timing:** iteration order changed, async made concurrent where it was
  sequential, a `await` dropped, an event fired in a new order.
- **Resource lifecycle:** a stream/handle/subscription opened but the `close`/`dispose`
  got moved away from its `open`; a lock not released on the new error path.
- **Logic slips:** off-by-one after an extraction, an inverted condition, a `&&`↔`||`
  flip, a default arg lost when a signature was refactored.
- **Reuse / simplification (the softer half of code-review):** duplicated logic the
  refactor left in two places; a helper reinvented; a conditional that OCP would have
  collapsed. These are **Optional** unless they hide a bug.

Every correctness finding gets `file:line`, the class, evidence from the diff, a fix,
and a confidence. Do not invent line numbers.

---

## 4. Normalize, aggregate, de-dupe

Put all four sources' findings into one table. Then:

**Normalize severity** onto the shared three-level scale:

| Shared level | Meaning | Maps from |
|---|---|---|
| **Blocker** | Must fix before ship — exploitable, secret exposed, behavior changed, correctness bug, or a perf regression that breaks an SLO | security "blocker", any credible red-team "behavior changed", correctness bug, perf regression past a stated budget |
| **Worth-fixing** | Real weakness, not ship-stopping | security "worth-fixing", perf regression within tolerance, contract smell without a proven caller break |
| **Optional** | Hardening, cleanup, nits | defense-in-depth, naming, dedupe, micro-perf |

**De-dupe.** Two findings are the same item when they point at the same
`file:line`/construct and the same underlying cause. Merge them: keep the **strongest
severity**, the **clearest fix**, and tag the item with **all** contributing sources
(e.g. `[security+correctness]`). One line, one item.

**Behavior-preservation is privileged.** A refactor's entire promise is "same
behavior." A credible red-team finding that behavior changed is a **Blocker** by
default and, all else equal, sorts to the top.

---

## 5. Rank into ONE calm list

Sort by **impact, then confidence**:

1. Blockers first, highest-confidence Blocker at the very top.
2. Worth-fixing next.
3. Optional last, and collapsed — the headline list should be the few things that
   matter; push the long tail of Optional nits into an **appendix**.

**Calm-tone rules** (this gate talks to a tired human at the end of a long change):
- Lead with the single most important thing and label it "do this first."
- State how many items there are up front so the reader can size the work.
- Surface the positive assurances ("no secrets", "no perf regression", "behavior
  checks passed") alongside the problems — don't present an all-red wall.
- Never dramatize. No "CRITICAL!!!"; a Blocker is stated plainly with its fix.

---

## 6. Emit the go/no-go

Fill `templates/output.md`:

- **Decision** — one of:
  - **Go** — no Blockers; ship.
  - **Fix-these-first** — Blockers exist but are small/clear; ship after they're fixed.
  - **No-go** — Blockers that need real work or a design decision; pause for the human.
- **The one list** — ranked, most-important-first, each item: what / why / where
  (`file:line`) / fix / confidence / source-tag.
- **Assurances** — the clean checks (good news).
- **Appendix** — the Optional long tail.

Then **hand off**. The gate does not fix. A Blocker pauses the chain
(`orchestrate.mjs fail --reason "gate: <blocker>"` if you're wiring the harness) and
goes to the human. When every Blocker is resolved (in a separate, clearly-labeled
change) and the gate re-runs clean, the chain advances to docs → ship. The Stop hook
keeps "done" blocked until then.

---

## 7. Relationship to the harness and the Stop hook

- The orchestrator appends this skill as the terminal `kind:"gate"` step of every lane
  (see `buildSteps` in `orchestrate.mjs`).
- `guard.mjs` (the Stop hook) blocks the "done" narrative while the chain is mid-flight;
  a passing gate is what lets the phase move to `docs`/`done`.
- The gate is the *consumer* of the specialist reports, not a replacement for them —
  it never re-implements security/perf/red-team analysis, it orchestrates and ranks it.
