# refactor-legacy-assess — worked example

## Before: a legacy Node module slated for a runtime bump

Project Profile says: Node service, `engines.node: ">=14"`, target upgrade to Node
20, TypeScript with loose config, `hasTests: false`.

```ts
// src/tokens.ts  (target of the upgrade)
import crypto from "crypto";

export function sign(payload: any) {                 // untyped param
  const cipher = crypto.createCipher("aes-256-cbc",   // REMOVED in Node 17+
    process.env.SECRET);
  // ...
  return doStuff(payload);                            // @ts-ignore on next line
}

function doStuff(x) { /* ... */ }                      // untyped, only caller is sign()
export function legacyHash() { /* nothing references this */ }
```

User asks: *"is this ready to move to Node 20?"*

## Assessment (read-only)

- **Deprecations (D):** `crypto.createCipher` is **removed** in Node 17+ → against
  the Node 20 target this is a **RED** blocker.
- **Types (B):** `payload: any`, `doStuff(x)` untyped, a `@ts-ignore` → loose
  contract → **YELLOW**.
- **Test seam (E):** `hasTests: false`, no tests around `tokens.ts` → **RED** (can't
  prove behavior is preserved).
- **Dead code (D):** `legacyHash()` has no references → low-risk cleanup.
- **Coupling (A):** `sign` calls `doStuff` directly but it's a private local — no
  external seam needed here → **GREEN**.

## After: Readiness Report (handed to diagnose + plan)

**Overall verdict: 🔴 RED — not ready to upgrade yet.** (Worst gate wins.)

| Gate | Grade | Evidence |
|------|-------|----------|
| Coupling/seam | 🟢 GREEN | `doStuff` is a private local; no external construction |
| Types | 🟡 YELLOW | `tokens.ts:4` `payload: any`; `@ts-ignore`; `doStuff(x)` untyped |
| Deprecations | 🔴 RED | `tokens.ts:5` `crypto.createCipher` removed in Node 17+ |
| Dead code | 🟢 GREEN (cleanup) | `legacyHash()` unreferenced |
| Test seam | 🔴 RED | no tests around `tokens.ts` (`hasTests: false`) |

**Ordered prerequisites (plan must do these first):**
1. Replace `crypto.createCipher` with `crypto.createCipheriv` (RED — before the bump).
2. Add characterization tests pinning `sign()`'s current output (RED — safety net).
3. Tighten `payload`/`doStuff` types to lock the contract (YELLOW).
4. (Optional warm-up) delete dead `legacyHash()`.

## Why this matters downstream
- `refactor-diagnose` learns this is a **code** lane gated RED — the plan can't jump
  straight to "bump the runtime".
- The plan phase receives concrete first steps in the right order: fix the removed
  API and add a safety net *before* the upgrade, not after it breaks in prod.
- The dead-code find becomes a low-risk warm-up that proves the verify loop.
