---
name: refactor-code-memory
description: "Use this skill when memory keeps climbing over time or across repeated actions and the user wants the leak found and fixed — plain triggers like \"the app's memory keeps growing\", \"it OOMs after a while\", \"the tab gets slower the longer I use it\", \"there's a memory leak\", \"heap keeps climbing\", \"detached DOM nodes\", \"process RSS grows and never comes back\". It diagnoses leaks by taking heap snapshots before and after a repeated action, diffing them for objects that should have been freed but weren't, and following retained-size growth to the reference that pins them in memory. Works for both browser (DevTools heap) and Node.js. It is the do-the-work step of the refactor-chain DEBUG lane, reached when the harness classifies a case as debug/code-memory. Uses a browser/DevTools heap tool when available; otherwise Node's own heap-snapshot APIs."
---

# Code Memory — Diagnose & Fix Memory Leaks — refactor-chain · DEBUG lane

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (debug) · **Prerequisite:** diagnose (harness classified the case as `debug`/`code-memory`) · **Next:** review gate → docs → ship.
**Adaptivity / conditional:** works for **browser** (DevTools heap snapshots) and **Node.js** (`v8.writeHeapSnapshot` / `--inspect`). Prefers a browser/DevTools heap tool when connected; otherwise drives Node's built-in heap-snapshot APIs. Repo-agnostic beyond that JS/TS runtime split.

## Purpose
Find and fix a real memory leak — memory that grows across repeated identical actions and is never
reclaimed — rather than guessing at "probably a listener somewhere." The method is snapshot **diffing**:
take a heap snapshot, do the suspect action N times, take another, and compare. The objects that
accumulated (and shouldn't have) are the leak; following their **retained size** and **retaining path**
back to the GC root reveals the exact reference that pins them. Fix that reference; prove the growth is gone.

## When to use
- Memory climbs the longer the app runs or the more you repeat an action. Triggers: "memory keeps growing", "gets slower over time", "heap keeps climbing".
- It eventually crashes or is killed. Triggers: "OOMs after a while", "process RSS never comes back", "out of memory".
- A known leak smell. Triggers: "detached DOM nodes", "listeners not cleaned up", "cache never evicts".
- Not for: a one-off crash/bug (use `refactor-whats-wrong`) or slow page load / jank (use `refactor-web-performance`).

## What I'll tell you (plain-language / ADHD-friendly)
- "Leaks are sneaky — I'll take a 'photo' of memory, do the same action a few times, take another photo, and compare. I'm only measuring, not changing code yet."
- "You are here: step 3 of 6. The comparison shows 500 extra `EventListener` objects that never got cleaned up after opening and closing the dialog 50 times. That's the leak."
- "I traced what's holding them: a global array that keeps pushing handlers but never removes them. That single reference is why memory can't be freed."
- "Fix is in — I remove the listener on close now. I repeated the action 50 times again and memory returns to baseline. No more growth."
- "That change didn't stop the growth — I reverted it and I'm following the next-biggest retainer (attempt 2 of 3)."
- "Your app works exactly the same; it just stops hoarding memory. Want the retaining-path details?"

## Method
Follow `references/method.md`; short form:
1. **Define the repeatable action & baseline.** Pick the exact action suspected of leaking (open/close a
   view, run a request, mount/unmount a component). Reach a steady state, then take **snapshot A**.
2. **Repeat & snapshot.** Perform the action N times (e.g. 20–50), force a GC if the tool allows, then
   take **snapshot B**. Real leaks survive a forced GC — that's how you tell a leak from normal churn.
3. **Diff for survivors.** Compare B vs A (DevTools "Comparison" view, or diff two Node snapshots).
   Objects whose count/size grew by ~N (proportional to repetitions) and were **not** collected are the
   leak. Rank by **retained size** (memory that frees if this object frees).
4. **Follow the retaining path.** For the top offender, trace its **retainers** back to a GC root — the
   reference chain that keeps it alive. The last unexpected link in that chain is the origin.
5. **Fix the retainer.** Remove/scope the offending reference: unsubscribe listeners on teardown, clear
   timers/intervals, bound or evict caches, break closures that capture large scopes, null out detached
   DOM references, dispose observers.
6. **Prove it's gone.** Repeat step 2 exactly and re-diff: after a forced GC, memory returns to (near)
   baseline and the survivor count no longer grows with repetitions.

Use `scripts/checklist.mjs` to print the loop and the common leak-pattern catalog as JSON.

## Guardrails
- **Behavior-preserving.** The app must do exactly the same thing; it just stops retaining memory.
- **Force a GC before judging.** Growth that a forced garbage collection reclaims is **not** a leak —
  don't "fix" normal allocation churn. Compare post-GC snapshots.
- **Proportional evidence.** A real leak grows roughly linearly with the number of repetitions. If it
  doesn't scale with N, keep looking — you have the wrong suspect.
- **One retainer at a time.** Fix the top retained-size offender, re-measure, then reassess. Don't batch.
- **Undo is one step away.** If growth persists after a fix, revert and follow the next retainer (max ~3).

## Verify
- Plain: "Same action, done many times — memory goes back to where it started instead of climbing."
- Technical: after N repetitions + forced GC, the post-action heap returns to ~baseline; the previously
  accumulating object class no longer grows proportionally to N in a fresh A/B diff; retained size of the
  former offender is stable; the full existing test suite still passes.

## Resources
- `references/method.md` — full snapshot-diff method, retaining-path reading, browser vs Node capture, leak-pattern catalog.
- `examples/before-after.md` — a worked case: detached listeners accumulating over repeated dialog open/close.
- `scripts/checklist.mjs` — zero-dep Node script; prints the loop + common leak patterns as JSON.
- `templates/output.md` — the leak report scaffold (action, A/B diff, retaining path, fix, re-measure).

## Chain position
Reached from the harness `diagnose` step when the case is `debug`/`code-memory`. It is the DEBUG lane's
fix→verify chain (diagnose → reproduce → fix → verify) applied to memory. The debug lane is a single
step (this skill) followed directly by the review gate (`refactor-review-gate`) — `refactor-code-principles`
does **not** run in the debug lane, unlike the refactor lanes. On success the orchestrator advances to
that review gate, then docs and ship.
