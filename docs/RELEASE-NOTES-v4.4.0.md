# refactor-chain v4.4.0

A grumpy, zero-BS adversarial audit (three independent auditors) caught real overclaims. This release fixes them.

## Added
- **Guidelines gate is now genuinely enforced.** `orchestrate.mjs gate-check` runs the conformance eval and records it; `advance` refuses to leave the review gate until the gate is PASS (100%) or every failure is a recorded exception. It was previously prose an agent was merely asked to honor — now it is a wired stop, e2e-proven and regression-tested.
- **`decision` subcommand** records mid-run checkpoint choices into state for auditability.

## Fixed
- **Provenance:** reworded two source phrasings lifted verbatim into skill descriptions.
- **Docs:** "100% original content" → "independently reauthored" (honest: the unlicensed upstreams are not retained, so zero-copy is supported by clean marker/originality scans but not provable by diff).

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
