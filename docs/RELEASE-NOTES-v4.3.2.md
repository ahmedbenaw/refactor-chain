# refactor-chain v4.3.2

Fixes from a six-dimension multi-agent code review (skills, hooks/actions, resources, tools, scripts/commands, harness) against source repos.

## Fixed
- **Harness crashes (HIGH):** `fail`/`heal` no longer throw at end-of-chain — they return structured JSON and exit 2. Regression-tested.
- **Advance correctness:** cursor bounded past end-of-chain; drift/adversarial/baseline gate blocks now exit non-zero.
- **Stubbed example (HIGH):** authored the missing `refactor-web-05-naming` worked example; new `stub-resource` audit gate catches tiny/truncated resources.
- **Command YAML:** quoted a truncated publish-checklist description; frontmatter audit now covers commands too.
- **Fidelity:** restored dropped source mechanisms in adversarial-verify (attack-the-requirements), ruthless-editor (<20% re-run trigger), plan-gate (7-step threshold).

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
