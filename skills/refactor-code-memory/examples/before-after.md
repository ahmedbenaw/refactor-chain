# Worked Example — detached listeners leaking over repeated dialog open/close

The point: prove the leak with a snapshot **diff** (survives GC, scales with N), trace the **retaining
path**, fix the one retainer, and re-diff to prove memory returns to baseline.

---

## The report

> "Our single-page app gets slower and eats more memory the longer people use it. The tab eventually
> becomes sluggish."

Suspected repeatable action: **opening and closing the settings dialog.**

## Phase 1–2 — Baseline, repeat, snapshot (browser DevTools heap)

1. Warm up (open/close once), force GC 🗑, take **Snapshot A**. `heapUsed` ≈ 42 MB.
2. Open→close the dialog **50 times**.
3. Force GC 🗑, take **Snapshot B**. `heapUsed` ≈ 61 MB — and it does **not** drop after GC.

Memory climbed 19 MB and survived a forced GC → this is a real leak, not churn.

## Phase 3 — Diff for survivors (Comparison view, B vs A)

| Object class | # New (B − A) | Retained size Δ |
|---|---|---|
| `Detached HTMLDivElement` | +50 | large |
| `EventListener` | +50 | — |
| `Array` | +1 (grew) | — |

**+50** of each — exactly proportional to the 50 repetitions. That proportionality is the tell. The
detached dialog `<div>`s were removed from the page but never freed.

## Phase 4 — Follow the retaining path

Select a `Detached HTMLDivElement`, open **Retainers**, walk up to the GC root:

```
Detached <div.dialog>
  ← handler closure  (the 'resize' callback)
    ← element in  window.__resizeSubscribers  (module-level Array)   ← GC root (global)
```

Origin found: on open, the dialog does `window.addEventListener('resize', onResize)` and pushes
`onResize` into a global `__resizeSubscribers` array — but **close() never removes it**. Each closed
dialog stays alive via that global array, which also pins its detached DOM subtree.

Evidence chain: sluggish tab ← 50 detached dialogs retained ← 50 live `resize` listeners ← global
`__resizeSubscribers` array never pruned.

## Phase 5 — Fix the retainer

```diff
  function openDialog() {
    const onResize = () => layout(dialogEl);
    window.addEventListener('resize', onResize);
    window.__resizeSubscribers.push(onResize);
+   dialogEl.__onResize = onResize;           // remember it so we can detach on close
  }

  function closeDialog() {
    dialogEl.remove();
+   window.removeEventListener('resize', dialogEl.__onResize);
+   const i = window.__resizeSubscribers.indexOf(dialogEl.__onResize);
+   if (i !== -1) window.__resizeSubscribers.splice(i, 1);
  }
```

Only the one retainer (the un-removed listener + its global array entry) is addressed this round.

## Phase 6 — Prove it's gone (re-diff, same N)

Repeat exactly: warm up, Snapshot A′ (≈42 MB), open/close **50×**, force GC, Snapshot B′.

| Check | Before fix | After fix |
|---|---|---|
| `heapUsed` after 50× + GC | 61 MB (climbing) | **43 MB (≈ baseline)** |
| `Detached HTMLDivElement` (B − A) | +50 | **+0** |
| `EventListener` (B − A) | +50 | **+0** |
| Test suite | green | **green** (behavior preserved) |

Memory returns to baseline; survivors no longer scale with N. Leak fixed.

## Why this is the right approach

We didn't blindly `removeEventListener` everywhere or wrap things in `WeakMap` on a hunch — the **diff**
named the exact object (detached dialog divs), the **retaining path** named the exact reference (the
global subscriber array), and the **re-diff** proved the single fix worked. If growth had persisted, the
next step would be to follow the next-largest retainer, not to pile on more guesses.

**Node note:** the same flow works headless — `global.gc()` + `v8.writeHeapSnapshot()` before/after the
loop, then load both snapshots into DevTools' Comparison view (or watch `process.memoryUsage().heapUsed`
fail to plateau).
