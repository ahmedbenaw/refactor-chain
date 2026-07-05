# refactor-telemetry-plan — full method: catching analytics breakage in a refactor

Tests prove the code still works. They do NOT prove your dashboards still work. A refactor can
keep behavior identical and still break tracking. This skill is the analytics safety net —
conditional, advisory, diff-driven.

## 0. Applicability gate (never skip)
Run `checklist.mjs --applicable <dir>`. The skill is dormant unless the diff touches tracking.
Signals in the diff:

| Signal | Examples |
|---|---|
| Analytics SDK call | `track(`, `capture(`, `logEvent(`, `trackEvent(`, `gtag(`, `dataLayer.push`, `posthog.capture`, `mixpanel.track`, `amplitude.logEvent`, `analytics.track`, `segment` |
| Event-name constants | `EVENTS.SIGNUP_COMPLETED`, string literals like `"checkout_step_viewed"` |
| Route / screen churn | renamed routes, screen names, or component names that event **properties** read |

No signal → `{applicable:false}` → return.

## 1. Inventory before & after
From the diff, list every touched tracking artifact. For each: event name, the call site
(file:line), and the properties it sends. Cross-reference the `refactor-understand` snapshot if it
recorded an analytics inventory. Bucket by change type: **added / removed / moved / props-changed**.

## 2. Risk classification (per event)

| Verdict | Condition | What it means |
|---|---|---|
| **safe** | call preserved; event name and properties unchanged | dashboard/funnel unaffected |
| **at-risk** | call moved to a new file but name/props unchanged | *should* still fire — must be verified, not assumed |
| **broken** | event renamed or deleted; OR a property now reads a renamed route/screen/component, so it sends a wrong/empty value | dashboard reads zero or wrong values |

The subtle killer is the **property-reads-a-renamed-thing** case: the event still fires, but a
property like `step_name: route.name` now returns the new route name, so historical funnel
segments split or a value the dashboard filters on disappears. Treat any property that derives
from a renamed route/screen/component as **broken** until re-pointed.

## 3. Downstream impact
For each broken/at-risk event, name what depends on it:
- **Dashboards** that chart the event.
- **Funnels** that include it as a step (a broken middle step breaks the whole funnel).
- **Experiments** that use it as an exposure or goal event (see §4).

## 4. Experiment dependencies (highest stakes)
An A/B test is silently invalidated if its exposure or goal event breaks — the test keeps
"running" but its numbers are wrong. Enumerate any experiment referenced in the code
(feature-flag keys, experiment names) whose exposure/goal event lives in the changed code, and
flag it as **verify before trusting results**. This is the loudest warning the skill produces.

## 5. Proposed tracking plan (the deliverable)
For each changed flow, produce the plan the analytics owner needs:
- Flow name and the ordered events that should fire.
- Each event's properties (name, type, source).
- The **fix** for anything broken:
  - renamed event → a rename mapping (old → new) so historical data can be aliased.
  - dropped call → where to re-add it.
  - property reading a renamed thing → re-point it (or pin the old value explicitly).

## Guardrails baked into the method
- Advisory only — propose, never edit instrumentation.
- "moved" ≠ "safe": relocated calls are **at-risk (verify)**.
- No invented events/dashboards; reason only about what's in the code/diff.
- Privacy: don't propose new PII properties; flag if the refactor changed what data an event carries.

## Output
Fill `templates/output.md`: the risk table + the per-flow tracking plan + the experiment warnings.
