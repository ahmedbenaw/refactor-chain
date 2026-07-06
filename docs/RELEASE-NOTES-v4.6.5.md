# refactor-chain v4.6.5

Fixes a silent, serious bug: the `curl | sh` install installed almost nothing.

## Fixed — `curl … install.sh | sh` installed ~1 skill instead of 57
When `install.sh` runs from a pipe (the advertised one-liner) it downloads and extracts the
GitHub tarball, then has to locate the plugin root inside it. Two bugs in that one line made it
resolve the source directory to the literal string `-1`:

1. **`head` was shadowed.** The script defines its own `head()` helper for printing section
   headers, so `find … | head -1` piped the found path into that function, which ignores stdin
   and printed `-1`. (v4.6.3 fixed this exact shadowing on the *version* line but missed this one.)
2. **`-maxdepth 2` was too shallow.** GitHub nests the tarball as
   `refactor-chain-main/.claude-plugin/plugin.json` (depth 3), so even without the `head` bug the
   `find` matched nothing.

With `SRC` set to `-1`, every copy read from `-1/skills`, `-1/commands`, etc., so the install
laid down almost nothing while still printing `✓ … installed`. A classic silent failure.

The fix reaches the right depth and drops the `head` dependency:
```sh
SRC=$(find "$TMP" -maxdepth 4 -name plugin.json -path '*/.claude-plugin/*' 2>/dev/null \
      | sed -n '1s#/.claude-plugin/plugin.json##p')
```

## Why CI didn't catch it (and now does)
The installer smoke test installed from the local checkout, where the source is found directly,
so the download path was never exercised. v4.6.5 adds a **download-path smoke test**: it packs the
checkout into GitHub's `<repo>-<ref>/…` tarball layout, points `install.sh` at it through a new
`RCX_TARBALL_URL` override (a `file://` URL, offline), runs the real download path, and asserts at
least 57 skills land with a non-empty version stamp. That test fails against the old code.

## Scope
Only `install.sh` was affected. The Node (`bin/rcx.mjs`), Go (`installer/go/main.go`), and
PowerShell (`install.ps1`) installers resolve the tarball root correctly (JSON parsing / adequate
recursion depth) and were verified during this fix.

—
Ahmed "Ben" Zayed · Head of Products & Ventures at ZAT.VC [Venture Partner]
