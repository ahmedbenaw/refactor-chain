# refactor-chain v4.6.2

A ship-blocker fix, caught by actually testing the installer end-to-end instead of trusting
`--dry-run`.

## Fixed — the `curl | sh` installer produced a broken install
A fresh install copied all 57 skills and registered all 6 hooks, but **installed none of the
harness scripts** — so every hook pointed at an `orchestrate.mjs` / `boot.mjs` that didn't
exist, leaving the pipeline non-functional.

- **Root cause:** `install.sh` created the scripts dir, then the skills-copy loop `rm -rf`'d
  `skills/refactor-chain` and re-copied it (the orchestrator *skill*, which has no `scripts/`)
  — wiping the dir — and the later `cp … scripts/` silently failed because `cp` won't create a
  missing destination. `install.ps1` had the same defect via `Remove-Item`. Both fixed by
  copying skills first, then creating and filling `scripts/`.
- The Node (`rcx.mjs`) and Go (`main.go`) installers were **not** affected — their copy helpers
  recreate the destination — but `rcx.mjs` was reordered to match for clarity.

## Prevention
CI now runs an **installer smoke test**: it installs into a throwaway HOME and asserts the
harness scripts are present and every registered hook resolves to a real file. The gap that let
this ship — no install-and-verify test — is closed.

If you installed v4.6.0 or v4.6.1 via `curl | sh`, re-run the installer to get the scripts.

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
