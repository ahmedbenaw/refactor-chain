# refactor-chain v4.6.4

Fixes the Go installer build that shipped red in v4.6.3.

## Fixed — the Go installer wouldn't compile
The `--update` code added in v4.6.3 called `skip(...)` where the helper is actually named
`skipMsg(...)`. Go only errors on unused *imports* and *locals*, but a call to a function that
was never declared is a hard `undefined: skip` compile error, so `installer/go/main.go` failed
to build. Because every release binary is compiled from that file, all five `release.yml`
cross-builds (linux/darwin/windows × amd64/arm64) and the CI `gobuild` job went red on v4.6.3.

This was mirrored code written without a local Go toolchain, which is exactly why the `gobuild`
CI job exists. It did its job and caught the typo; v4.6.4 is the fix.

- `installer/go/main.go`: `skip(...)` → `skipMsg(...)`.
- `ci.yml` + `release.yml`: point `actions/setup-go` at `cache-dependency-path: installer/go/go.mod`.
  Our module lives under `installer/go/`, not the repo root, so this silences the "Dependencies
  file is not found" warning and enables the Go module cache.

## Honesty about testing
The Node (`install.sh`, `bin/rcx.mjs`) `--update` paths remain **verified end-to-end** locally
(fresh-install stamp → `--update` reports the transition → planted orphan removed → scripts intact).
The Go fix is a single unambiguous identifier correction; with no Go toolchain in the dev
environment it is validated by the `gobuild` + `release.yml` cross-builds on this tag, which are
now expected to go green. The PowerShell path is still mirror-implemented, exercised on a real
Windows install.

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
