# Worked example — a route rename that broke a funnel property

## Context
The `refactor-web-05-naming` step renamed routes for consistency:
`/checkout/step1` → `/checkout/shipping`, `/checkout/step2` → `/checkout/payment`.
All tests passed. Because the diff touched route names that an event property reads,
**refactor-telemetry-plan activated**.

## Applicability gate

```
$ node scripts/checklist.mjs --applicable /repo
{
  "skill": "refactor-telemetry-plan",
  "applicable": true,
  "reason": "tracking touched in diff (analytics calls / event names / route churn)",
  "sampleHits": [
    "+  analytics.track('checkout_step_viewed', { step_name: route.name })",
    "-  { path: '/checkout/step1', name: 'step1' }",
    "+  { path: '/checkout/shipping', name: 'shipping' }"
  ]
}
```

## Inventory

| Event | Call site | Change | Properties |
|---|---|---|---|
| `checkout_step_viewed` | `views/Checkout.vue:44` | call preserved | `step_name: route.name` ← reads renamed route |
| `checkout_completed` | `views/Checkout.vue:120` | call preserved | `order_total` |
| `signup_completed` | `views/Signup.vue:60` | file moved to `modules/auth/Signup.vue` | none touched |

## Risk classification

| Event | Verdict | Why |
|---|---|---|
| `checkout_step_viewed` | **BROKEN** | `step_name` now sends `"shipping"`/`"payment"` instead of `"step1"`/`"step2"`. The event fires, but the property value changed — the funnel that filters on `step_name = "step1"` will read **zero** for new traffic. |
| `signup_completed` | **at-risk** | Call moved to a new file. Should still fire — verify it does. |
| `checkout_completed` | safe | Untouched. |

## Downstream impact
- **Funnel "Checkout" (`step1 → step2 → completed`)**: BROKEN. Steps 1 and 2 filter on the old
  `step_name` values, which no longer arrive.
- **Experiment `express_checkout_test`**: uses `checkout_completed` as its goal event → safe.
  Uses `checkout_step_viewed` for a secondary metric → that metric is now broken; flag it.

## Proposed tracking plan (for the changed flow)

**Flow: Checkout**
| Order | Event | Properties | Fix |
|---|---|---|---|
| 1 | `checkout_step_viewed` | `step_name` (string) | **Re-point / alias.** Either (a) map new route names to the old values `shipping→step1`, `payment→step2` so the funnel keeps working, or (b) update the funnel definition to the new names AND alias historical data. Recommend (a) to avoid a data discontinuity. |
| 2 | `checkout_completed` | `order_total` (number) | none — safe |

**Verify:** confirm `signup_completed` still fires from its new file before shipping.
**Experiment note:** `express_checkout_test` — its secondary metric depends on the broken
property; don't trust that metric until the fix above lands.

## Plain-language message to the user
> Renaming the checkout routes didn't break the app, but it broke one piece of tracking: the
> "which checkout step" property now sends new names, so your Checkout funnel will read zero for
> new visitors. Nothing else is affected. I've written a plan to alias the new names back to the
> old ones so the funnel keeps working — want me to hand it to whoever owns analytics? (I won't
> change tracking code myself.)
