---
name: refactor-telemetry-plan
description: "Use this skill when a refactor touches user-facing or tracked flows and could silently break analytics — renamed event names, moved or deleted tracking calls, changed component/route names that event properties depend on, or relocated instrumentation. It flags the analytics likely to break and proposes an updated tracking plan for the changed flows so dashboards, funnels, and experiments don't quietly go dark after the refactor. It is CONDITIONAL: it activates only when tracked/user-facing flows are detected in the diff (analytics SDK calls, event names, route/screen changes); on a purely internal refactor it stays dormant. Trigger phrases: \"did we break our analytics\", \"will the funnel still work\", \"check the tracking\", \"we renamed the event\", \"the dashboard went to zero after the refactor\", \"update the tracking plan\". This is a conditional docs-phase skill in the refactor-chain pipeline. Advisory — it proposes; it does not rewire tracking on its own."
---

# Telemetry Plan — refactor-chain · docs (conditional)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** docs (conditional) · **Prerequisite:** the diff touched tracked/user-facing flows · **Next:** refactor-publish-checklist / refactor-ship.
**Adaptivity / conditional:** conditional on a tracking-touch signal — activates only when analytics calls / event names / route or screen changes appear in the diff; otherwise reports "not applicable" and yields. Advisory-only.

## Purpose
Analytics is fragile in a way tests don't catch: a refactor can rename an event, move a
tracking call, or change a route/screen name that an event property depends on — the code still
compiles, the tests still pass, and then a dashboard silently reads zero, a funnel breaks, or a
running experiment loses its exposure event. This skill inspects the diff for anything that
could break tracking, lists the specific events/properties at risk, and proposes an updated
tracking plan for the changed flows so the team can keep instrumentation and code in lockstep.

## When to use
- The diff touched analytics SDK calls (`track`, `capture`, `logEvent`, `gtag`, `analytics.*`,
  `posthog.*`, `mixpanel.*`, `amplitude.*`, `segment`), event-name constants, or route/screen names.
- Someone asks "did we break the funnel?", "will the dashboard still work?", "update the tracking plan".
- A running A/B experiment depends on an exposure/goal event that lives in the changed code.
- Do NOT invoke on a purely internal refactor with no user-facing/tracked surface — it reports "not applicable".

## What I'll tell you (plain-language / ADHD-friendly)
- "This refactor touched code that reports analytics, so I checked whether any of your tracking would break. I'm only reading and proposing — I won't change your tracking without you."
- "Two events are at risk: `signup_completed` moved to a new file (still fires — low risk), and `checkout_step_viewed`'s `step_name` property now reads a renamed route, so it'll report the wrong value (high risk)."
- "Your 'onboarding' funnel depends on `signup_started → signup_completed`. Both still fire, so the funnel is safe."
- "Heads-up: the experiment `new_nav_test` uses `nav_clicked` as its goal event — that call was in a file we moved. Verify it still fires before you trust the results."
- "Here's a proposed tracking plan for the changed flows — say the word and I'll hand it to whoever owns analytics. Say 'show technical details' for the event-by-event diff."

## Method
1. **Gate first.** Run `node scripts/checklist.mjs --applicable <target>`. If the diff contains no
   analytics calls, event names, or route/screen changes, emit "not applicable" and return.
2. **Inventory tracking before & after.** From the diff (and the `refactor-understand` snapshot if
   it captured analytics), list every tracking call and event name touched: added, removed, moved,
   or with changed properties.
3. **Assess breakage risk per event.** Classify each: **safe** (call preserved, name/props
   unchanged), **at-risk** (moved but should still fire — verify), **broken** (renamed/deleted
   event, or a property now reading a renamed route/screen/component). Note downstream impact:
   which dashboards, funnels, and experiments depend on it.
4. **Flag experiment dependencies.** Any A/B test whose exposure or goal event lives in the
   changed code is called out explicitly — a broken goal event silently invalidates results.
5. **Propose the updated tracking plan** for the changed flows: for each flow, the events that
   should fire, their properties, and the fix for anything broken (rename mapping, re-add a
   dropped call, re-point a property).
6. Fill `templates/output.md` into a Tracking Plan + risk table. See `references/method.md` for
   the SDK-detection patterns and the risk-classification rules.

## Guardrails
- **Advisory only. Proposes; never rewires tracking or edits instrumentation code.**
- Never claim an event is safe without evidence from the diff — "moved, likely fine, verify" is
  the honest verdict for a relocated call, not "safe".
- Don't invent events or dashboards. Only reason about tracking actually present in the code/diff
  (and experiments the code references).
- Respect privacy: when proposing properties, don't propose collecting new PII; flag if the
  refactor changed what data an event carries.

## Verify
- Plain: "I can name every event this refactor might have broken, what it feeds, and how to fix it — and the events I called 'safe' really are unchanged in the diff."
- Technical: every tracking call in the diff is classified (safe/at-risk/broken) with file:line;
  each broken event has a concrete fix; experiment dependencies are enumerated; the proposed plan
  covers every changed flow with no `TODO`.

## Resources
- `references/method.md` — analytics-SDK detection patterns, the risk-classification rules, and the tracking-plan format.
- `examples/before-after.md` — worked example: a route rename that broke a funnel property, caught and fixed.
- `scripts/checklist.mjs` — prints this skill's steps as JSON and answers the `--applicable` gate.
- `templates/output.md` — the Tracking Plan + risk-table scaffold.

## Chain position
Runs in the **docs** phase, conditional on a tracking touch, alongside `refactor-write-up` /
`refactor-artifacts-sync`. It consumes the diff (+ understand snapshot) and produces a proposed
tracking plan + risk list that feed `refactor-publish-checklist` (which won't call the run done
with a known-broken funnel) and `refactor-ship` (attached to the handoff for the analytics owner).
