# refactor-chain v4.6.3

The installer can now update itself: check the installed version, then reinstall cleanly.

## Added — `--update`
```sh
curl -fsSL https://raw.githubusercontent.com/ahmedbenaw/refactor-chain/main/install.sh | sh -s -- --update
```
It reads the currently-installed version, reports `current → new`, then reinstalls **cleanly**:
old `refactor-*` skills and commands are cleared first, so a skill renamed between versions can't
leave an orphan behind, and the harness scripts + hooks are laid down fresh. Install now writes a
`.rcx-version` stamp so the update knows where you're coming from (a pre-4.6.3 install has no
stamp — `--update` says so and installs fresh).

## Coverage and honesty about testing
- `install.sh` and `bin/rcx.mjs` are **verified end-to-end** — fresh install writes the stamp,
  then `--update` reports the transition, removes a planted orphan, and keeps the scripts.
- `installer/go/main.go` and `install.ps1` carry the same logic, mirrored. I couldn't run Go or
  PowerShell in the dev environment, so **CI now builds + vets the Go installer on every push**
  (a new `gobuild` job) to validate `main.go`; the PowerShell path is mirror-implemented and will
  be exercised on a Windows install.
- The CI installer smoke test now also runs `--update`.

## Fixed along the way
The version read piped through `head -1`, but this script defines its own `head()` helper for
printing headers — which shadowed the command and corrupted the stamp. Switched to `awk`.

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
