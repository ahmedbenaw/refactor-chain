# Transform Step Log — `<step-id>`

> Filled by `refactor-transform` (refactor-chain). One entry per approved,
> behavior-preserving transform. Records the checkpoint→apply→verify→advance/heal
> loop so the review gate and audit trail can see exactly what happened.

- **Step:** `<step-id>` (e.g. `extract-PricingService`)
- **Kind:** `<rename | extract | inline | move | introduce-seam | change-signature | replace-equivalent>`
- **Approved by:** `<lane plan | refactor-reimagine opt-in>`
- **Target:** `<paths touched>`
- **Baseline:** `<green baseline id / test command from refactor-safety-net>`
- **Timestamp:** `<ISO>`

## Preconditions
- [ ] GREEN baseline exists (never transform on a red repo).
- [ ] Step is approved and behavior-preserving (a kind in the safe catalog).

## 1. Checkpoint
```
orchestrate.mjs checkpoint --label "<step-id>" --target <dir>
```
- Checkpoint label: `<label>`
- Result: `<snapshot taken>`

## 2. Apply (smallest transform)
- The single change made: `<one sentence — exactly one transform, nothing else>`
- Diff summary (files / hunks): `<...>`
- Confirmed no bundled / opportunistic edits: `<yes>`

## 3. Verify (behavior identical)
- Baseline pass-set: `<n passing>`
- Post-change pass-set: `<n passing>`
- Identical? `<yes | no>`
- Legal incidental edits (import/path churn only): `<list, or "none">`
- Any assertion-level difference? `<none | describe → drift>`

## 4. Outcome
| Attempt | Action | Result |
|:------:|--------|--------|
| 1 | apply + verify | `<advanced | drift → rolled back>` |
| 2 | heal (cleaner approach) | `<...>` |
| 3 | heal | `<...>` |

- **Final:** `<advanced | blocked-after-3>`
- If advanced:
  ```
  orchestrate.mjs advance --target <dir> --delta legal --note "<step-id>"
  ```
- If blocked: repo left GREEN at checkpoint `<label>`; surfaced to human with
  reason `<what drifted>`.

## Signal
```json
{ "step": "<step-id>", "result": "advanced|healed|blocked",
  "delta": "legal|drift", "attempts": <n>, "checkpoint": "<label>" }
```

## Notes
- <anything the reviewer/audit trail should know: a heal that succeeded and why,
  a legal-churn edit worth a second look, a step that was decomposed further>
