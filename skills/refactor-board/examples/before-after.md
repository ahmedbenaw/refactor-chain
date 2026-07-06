# Worked example — a board run that caught bypassable gates

A real convening of the board over a plugin's own harness. The ask was "review everything —
find what's outdated, contradicting, buggy, or a lie." One reviewer would have missed things;
the board ran five lenses and made every finding survive an adversary.

## The plan (round 1, seed 0)

```
node orchestrate.mjs board-plan --target . --seed 0
```

| Lens | Lead (finder) | Coordinator (verifier) |
|---|---|---|
| architecture | Andrew Appel | Ilya Sutskever |
| harness | John Carmack | Yann LeCun |
| correctness | Andrew Appel | Andrej Karpathy |
| security | John Carmack | Ilya Sutskever |
| docs-truth | Gabe Newell | Yann LeCun |

Every finder prompt arrives with the rubric baked in: file:line or it doesn't count,
CONFIRMED-vs-SUSPECTED, over-flagging penalized.

## Finders raise; coordinators attack

The **harness** finder (Carmack) raised three findings; the docs-truth finder (Newell) raised six.

```
harness → [
  { where:"orchestrate.mjs:143", cause:"advance trusts cached guidelines verdict — gate bypassable", severity:"blocker", confidence:0.95, fix:"re-run eval fresh in advance", behaviorChanged:true },
  { where:"orchestrate.mjs:177", cause:"heal ignores MAX_RETRIES — unbounded loop", severity:"blocker", confidence:0.9, fix:"refuse heal past cap" },
  { where:"orchestrate.mjs:137", cause:"delta guard is a denylist, not an allowlist", severity:"worth-fixing", confidence:0.85, fix:"require delta===legal" }
]
```

The **coordinator** (LeCun) went and read each line, trying to refute:

```
verify orchestrate.mjs:143 → { verdict:"CONFIRMED", note:"reproduced: hand-wrote state.guidelines={gate:PASS}; advance passed with no eval. real." }
verify orchestrate.mjs:177 → { verdict:"CONFIRMED", note:"reproduced blocked→heal→fail loop past 3." }
verify orchestrate.mjs:137 → { verdict:"CONFIRMED", note:"advance --adversarial with no --delta advanced as clean." }
```

A **docs-truth** finding was refuted and dropped:

```
verify CONTRIBUTING.md:80 → { verdict:"REFUTED", note:"'schema stays v3' is the frozen state-schema field, not a plugin-version string. correct as-is." }
```

## Record + aggregate

```
echo '{"lens":"harness","findings":[...],"verdicts":[{"i":0,"verdict":"CONFIRMED"},{"i":1,"verdict":"CONFIRMED"},{"i":2,"verdict":"CONFIRMED"}]}' | node orchestrate.mjs board-record --target .
# ... same for the other four lenses ...
node orchestrate.mjs board-aggregate --target .
```

Result — REFUTED dropped, survivors deduped and ranked, one decision:

```
{ "decision": "fix-these-first", "blockers": 2, "total": 11,
  "list": [
    { "where":"orchestrate.mjs:143", "severity":"blocker", "behaviorChanged":true, "sources":["harness"], ... },  // do this first
    { "where":"orchestrate.mjs:177", "severity":"blocker", ... },
    { "where":"orchestrate.mjs:137", "severity":"worth-fixing", ... },
    ...docs-truth version-rot items...
  ],
  "appendix": [ ...optional nits... ] }
```

## Why the board beat a single reviewer

- **Independent angles:** the harness lens found the enforcement holes; the docs-truth lens found
  version rot; neither would have surfaced both.
- **The adversary earned its keep:** `CONTRIBUTING.md:80` *looked* like version rot and a lone
  reviewer would have "fixed" it — the coordinator proved it was correct and dropped it.
- **One calm verdict:** eleven raw findings became one ranked list with a single "do this first",
  not five stapled-together reports.

The two blockers were then fixed through the normal pipeline (baseline → verify → adversarial →
gate), each with a regression test — not straight from the finding.
