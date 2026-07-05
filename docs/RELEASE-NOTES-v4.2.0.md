# refactor-chain v4.2.0

Point release closing gaps found in a full instruction-adherence audit.

## Added
- **Automation recommendations** in `refactor-improve` (adopting `claude-automation-recommender`): recurring, mechanizable pain surfaces as a concrete standing-automation suggestion (git hook, CI check, lint/format config, script) at retro time — recommendation-only, never installed without approval.
- **`stale-action-version` audit gate** — a `refactor-chain@vN` reference that doesn't match the current major is now a build failure.

## Fixed
- "a improvement retro" → "an improvement retro" (kaizen-rename grammar fallout).
- Residual "jvm lane" prose → "backend lane" in the diagnose matrix, reasoning-protocol, and a plan-gate example.

## Install
```sh
curl -fsSL https://raw.githubusercontent.com/ahmedbenaw/refactor-chain/main/install.sh | sh
```

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
