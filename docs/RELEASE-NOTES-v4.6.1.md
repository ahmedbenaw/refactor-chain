# refactor-chain v4.6.1

A CI-hygiene patch. v4.6.0's gate was run as tests + audit + doctor but not eslint — which CI
runs — so three `no-unused-vars` errors in the new board code turned the `ci` workflow red on
`main`, even though every test passed and the release binaries built fine.

## Fixed
- `scripts/lib/board.mjs` — the unused `selectLenses` parameter is now `_diagnosis` (it's a
  future hook).
- `tests/board.test.mjs` — dropped two imports that weren't used directly.

No functional change. This release was validated by running **every CI step locally** —
syntax-check, the test suite, audit `--provenance-strict`, eslint, shellcheck, and JSON
validation — rather than a subset, so the gate matches what CI actually enforces.

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
