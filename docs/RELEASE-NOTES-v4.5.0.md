# refactor-chain v4.5.0

A grumpy five-auditor sweep of the whole tree. Several gates shipped in 4.4.0 turned out to be
bypassable; they are real stops now, each with a regression test that fails without the fix.

## Fixed — enforcement holes (all were live-reproducible)
- **The guidelines gate was bypassable.** `advance` trusted a cached verdict, so a hand-written PASS — or a clean check followed by an edit — slipped through. It now re-runs the eval **fresh** at the moment it gates the review step. A stale or forged PASS can't pass.
- **The retry ceiling did nothing.** A step blocked on exhausted retries could still be advanced, and `heal` reactivated it past the cap. Both ends refuse now; three strikes actually stops.
- **`advance` accepted any delta but `drift`.** Now it's an allowlist — only an explicit `--delta legal` moves forward.
- **`init --lane debug` built a skill that doesn't exist** (`refactor-refactor-debug`). Forced debug resolves to a real subtype now.

## Fixed — crashes
- A non-array `guideline-exceptions.json` crashed the eval and wedged the gate.
- A missing or invalid `plugin.json` took down the whole self-audit.
- The Windows installers wrote backslash paths and unquoted interpreters — duplicate hooks, broken uninstall, and the space-veto when Node lives under `C:\Program Files\`. Paths are forward-slashed and quoted now, matching `hooks.json`.

## Fixed — rot and false claims
- Stale version strings across `plugin.json`, `hooks.json`, `SECURITY.md`, and the installer spec; missing CHANGELOG anchors.
- The three debug skills claimed "step 2 of 5/6" for a two-step lane — corrected.
- `SKILL-TEMPLATE.md` still called itself "v2" and predated the discipline pack — rewritten.

Full gate green: 6 suites / 379 assertions, audit clean over 419 files.

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
